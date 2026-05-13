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
  // Application is empty but label printed a value — surface it for human review
  // rather than silently passing (the previous behaviour returned "match", which
  // hid a real discrepancy on a federal compliance tool).
  if (!application) {
    return label
      ? {
          key,
          status: "missing",
          application,
          label,
          note: "Application did not provide this field; label shows a value.",
        }
      : { key, status: "match", application, label: null };
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
    // Application value is required (Zod min(1)) — if we can't parse it, the
    // operator typed something un-numeric. Don't silently pass; route to manual.
    return {
      key: "alcohol_content",
      status: "missing",
      application,
      label,
      note: "Application ABV could not be parsed — manual check required.",
    };
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
    return {
      key: "net_contents",
      status: "missing",
      application,
      label,
      note: "Application net contents could not be parsed — manual check required.",
    };
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
  ];

  // Optional fields: only verify if the application actually supplied them.
  // Otherwise we'd flag every domestic bottle for missing country_of_origin.
  if (application.producer_address) {
    fields.push(compareText("producer_address", application.producer_address, extracted.producer_address));
  }
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
