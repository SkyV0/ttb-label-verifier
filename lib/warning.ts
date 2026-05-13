import type { ExtractedLabel, WarningResult } from "./types";

// 27 CFR §16.21 — verbatim canonical text.
export const CANONICAL_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

const CANONICAL_NORMALIZED = normalizeForCompare(CANONICAL_WARNING);

function normalizeForCompare(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();
}

const HEADER = "GOVERNMENT WARNING:";

export function verifyWarning(extracted: ExtractedLabel): WarningResult {
  const reasons: string[] = [];
  const detected = extracted.government_warning_text;

  if (!detected || detected.trim() === "") {
    return {
      ok: false,
      reasons: ["The government health warning is not present on the label (required by 27 CFR §16.21)."],
      detected: null,
    };
  }

  const normalized = normalizeForCompare(detected);

  if (normalized.toLowerCase() === CANONICAL_NORMALIZED.toLowerCase()) {
    if (!extracted.government_warning_header_appears_uppercase) {
      reasons.push(
        "The 'GOVERNMENT WARNING' header is not in ALL CAPS as required by 27 CFR §16.22.",
      );
    }
    if (!normalized.startsWith(HEADER)) {
      reasons.push("Header text does not exactly match 'GOVERNMENT WARNING:' (case-sensitive).");
    }
    return {
      ok: reasons.length === 0,
      reasons,
      detected,
    };
  }

  reasons.push("The warning text does not match the canonical statement required by 27 CFR §16.21.");
  if (!extracted.government_warning_header_appears_uppercase) {
    reasons.push("The 'GOVERNMENT WARNING' header is also not in ALL CAPS.");
  }
  return { ok: false, reasons, detected };
}
