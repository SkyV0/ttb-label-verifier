import type {
  ApplicationData,
  ExtractedLabel,
  FieldResult,
  FieldStatus,
  VerificationResult,
} from "./types";
import { parseAbv, parseVolumeMl, similarity } from "./fuzzy";
import { verifyWarning } from "./warning";
import { citationsForVerdict } from "./rag";

const TEXT_MATCH = 0.85;
const TEXT_FUZZY = 0.6;

function textStatus(score: number): FieldStatus {
  if (score >= TEXT_MATCH) return "match";
  if (score >= TEXT_FUZZY) return "fuzzy";
  return "mismatch";
}

function compareText(
  key: FieldResult["key"],
  application: string,
  label: string | null,
): FieldResult {
  if (!application) {
    return { key, status: "match", application, label: label ?? null };
  }
  if (!label) {
    return { key, status: "missing", application, label: null };
  }
  const score = similarity(application, label);
  return { key, status: textStatus(score), application, label, score };
}

function compareAbv(application: string, label: string | null): FieldResult {
  const appVal = parseAbv(application);
  const labelVal = parseAbv(label ?? null);

  if (appVal === null) {
    return { key: "alcohol_content", status: "match", application, label };
  }
  if (labelVal === null) {
    return { key: "alcohol_content", status: "missing", application, label };
  }
  const diff = Math.abs(appVal - labelVal);
  if (diff <= 0.3) {
    return {
      key: "alcohol_content",
      status: "match",
      application,
      label,
      note: `Application: ${appVal.toFixed(1)}% · Label: ${labelVal.toFixed(1)}% (Δ ${diff.toFixed(2)}%)`,
    };
  }
  if (diff <= 1.0) {
    return {
      key: "alcohol_content",
      status: "fuzzy",
      application,
      label,
      note: `Difference of ${diff.toFixed(2)}% — within fuzzy tolerance but exceeds 0.3% TTB norm.`,
    };
  }
  return {
    key: "alcohol_content",
    status: "mismatch",
    application,
    label,
    note: `Application: ${appVal.toFixed(1)}% · Label: ${labelVal.toFixed(1)}% (Δ ${diff.toFixed(2)}%)`,
  };
}

function compareNetContents(application: string, label: string | null): FieldResult {
  const appMl = parseVolumeMl(application);
  const labelMl = parseVolumeMl(label ?? null);

  if (appMl === null) {
    return { key: "net_contents", status: "match", application, label };
  }
  if (labelMl === null) {
    return { key: "net_contents", status: "missing", application, label };
  }
  const diffPct = Math.abs(appMl - labelMl) / appMl;
  if (diffPct <= 0.02) {
    return { key: "net_contents", status: "match", application, label, note: `${appMl} mL vs ${labelMl} mL` };
  }
  if (diffPct <= 0.05) {
    return { key: "net_contents", status: "fuzzy", application, label, note: `${appMl} mL vs ${labelMl} mL (Δ ${(diffPct * 100).toFixed(1)}%)` };
  }
  return { key: "net_contents", status: "mismatch", application, label, note: `${appMl} mL vs ${labelMl} mL (Δ ${(diffPct * 100).toFixed(1)}%)` };
}

export function runVerificationEngine(
  application: ApplicationData,
  extracted: ExtractedLabel,
  elapsed_ms: number,
  usage: VerificationResult["usage"],
): VerificationResult {
  const fields: FieldResult[] = [
    compareText("brand_name", application.brand_name, extracted.brand_name),
    compareText("class_type", application.class_type, extracted.class_type),
    compareAbv(application.alcohol_content, extracted.alcohol_content_text),
    compareNetContents(application.net_contents, extracted.net_contents_text),
    compareText("producer_name", application.producer_name, extracted.producer_name),
    compareText("producer_address", application.producer_address, extracted.producer_address),
  ];

  if (application.country_of_origin) {
    fields.push(compareText("country_of_origin", application.country_of_origin, extracted.country_of_origin));
  }

  const warning = verifyWarning(extracted);

  let verdict: VerificationResult["verdict"];
  if (!warning.ok) {
    verdict = "rejected";
  } else if (fields.some((f) => f.status === "mismatch")) {
    verdict = "rejected";
  } else if (fields.some((f) => f.status === "fuzzy" || f.status === "missing")) {
    verdict = "needs_review";
  } else {
    verdict = "verified";
  }

  const citations = verdict === "verified" ? [] : citationsForVerdict(application.beverage_type, fields, warning);

  return { verdict, fields, warning, extracted, citations, elapsed_ms, usage };
}
