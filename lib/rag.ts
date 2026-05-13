/**
 * CFR regulation lookup (RAG).
 *
 * Production: embed 27 CFR §§ 4 (wine), 5 (spirits), 7 (malt), 16 (warning) at build
 * time, store as JSON + vector index, retrieve top-k for cited rejection reasons.
 *
 * For this prototype, we ship a curated subset of CFR text keyed by (beverage_type,
 * issue) so we can attach citations to verdicts without a build-time embedding step.
 * Extending to true semantic retrieval is a one-file swap once embeddings are wired.
 */

import type { BeverageType, Citation, FieldResult, WarningResult } from "./types";

interface CfrChunk {
  section: string;
  title: string;
  text: string;
  applies_to: Array<BeverageType | "all">;
  topics: string[];
}

const CHUNKS: CfrChunk[] = [
  {
    section: "27 CFR §16.21",
    title: "Statement required",
    text:
      "The Government Warning Statement shall be in the following exact wording: GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
    applies_to: ["all"],
    topics: ["warning", "warning_text"],
  },
  {
    section: "27 CFR §16.22",
    title: "Legibility requirements",
    text:
      "The Government Warning Statement shall appear on the label in a manner that is conspicuous and easily legible. The signal heading 'GOVERNMENT WARNING' shall appear in capital letters and shall be in bold or otherwise prominently displayed type.",
    applies_to: ["all"],
    topics: ["warning", "warning_format", "warning_caps", "warning_bold"],
  },
  {
    section: "27 CFR §5.32",
    title: "Mandatory label information (distilled spirits)",
    text:
      "Labels affixed to containers of distilled spirits shall state: brand name; class and type designation; alcohol content; net contents; name and address of bottler. Imported spirits shall additionally state country of origin.",
    applies_to: ["spirits"],
    topics: ["brand_name", "class_type", "alcohol_content", "net_contents", "producer_name", "producer_address", "country_of_origin"],
  },
  {
    section: "27 CFR §4.32",
    title: "Mandatory label information (wine)",
    text:
      "Wine labels shall state: brand name; class, type, or other designation; alcohol content; name and address of bottler or producer; net contents; country of origin where applicable.",
    applies_to: ["wine"],
    topics: ["brand_name", "class_type", "alcohol_content", "net_contents", "producer_name", "country_of_origin"],
  },
  {
    section: "27 CFR §7.22",
    title: "Mandatory label information (malt beverages)",
    text:
      "Labels of malt beverages shall state: brand name; class designation; name and address of bottler or importer; net contents; alcohol content where required by State law.",
    applies_to: ["malt"],
    topics: ["brand_name", "class_type", "net_contents", "producer_name", "producer_address"],
  },
  {
    section: "27 CFR §5.37",
    title: "Alcohol content (distilled spirits)",
    text:
      "Alcohol content shall be stated in percent alcohol by volume. The statement of alcohol content in degrees of proof may appear in addition to (but not in lieu of) the statement of alcohol content in percent alcohol by volume.",
    applies_to: ["spirits"],
    topics: ["alcohol_content"],
  },
];

/**
 * Build a public ecfr.gov URL for a CFR citation. Lets the UI link to the
 * regulation an agent can click through to verify the AI's reasoning — Dave
 * Morrison's "you can't pattern-match everything" concern, answered with the
 * primary source. Returns null for malformed sections so the UI can fall back
 * to plain text.
 */
export function citationUrl(section: string): string | null {
  const match = section.match(/^(\d+)\s*CFR\s*§\s*([\d.]+)/);
  if (!match) return null;
  return `https://www.ecfr.gov/current/title-${match[1]}/section-${match[2]}`;
}

export function citationsForVerdict(
  beverage: BeverageType,
  fields: FieldResult[],
  warning: WarningResult,
): Citation[] {
  const issues = new Set<string>();
  if (!warning.ok) {
    issues.add("warning");
    if (warning.reasons.some((r) => /caps|CAPS/i.test(r))) issues.add("warning_caps");
    if (warning.reasons.some((r) => /bold/i.test(r))) issues.add("warning_bold");
    if (warning.reasons.some((r) => /canonical|does not match/i.test(r))) issues.add("warning_text");
  }
  for (const f of fields) {
    if (f.status === "mismatch" || f.status === "missing") issues.add(f.key);
  }
  if (issues.size === 0) return [];

  return CHUNKS.filter(
    (c) =>
      (c.applies_to.includes(beverage) || c.applies_to.includes("all")) &&
      c.topics.some((t) => issues.has(t)),
  ).map(({ section, title, text }) => ({ section, title, text }));
}
