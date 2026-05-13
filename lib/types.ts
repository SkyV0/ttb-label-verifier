import { z } from "zod";

export const BeverageType = z.enum(["wine", "spirits", "malt"]);
export type BeverageType = z.infer<typeof BeverageType>;

export const ApplicationData = z.object({
  brand_name: z.string().min(1),
  class_type: z.string().min(1),
  alcohol_content: z.string().min(1),
  net_contents: z.string().min(1),
  producer_name: z.string().min(1),
  producer_address: z.string(),
  country_of_origin: z.string(),
  beverage_type: BeverageType,
});
export type ApplicationData = z.infer<typeof ApplicationData>;

export const ExtractedLabel = z.object({
  brand_name: z.string().nullable(),
  class_type: z.string().nullable(),
  alcohol_content_text: z.string().nullable(),
  net_contents_text: z.string().nullable(),
  producer_name: z.string().nullable(),
  producer_address: z.string().nullable(),
  country_of_origin: z.string().nullable(),
  government_warning_text: z.string().nullable(),
  government_warning_header_appears_uppercase: z.boolean(),
  government_warning_header_appears_bold: z.boolean().nullable(),
  notes: z.string().nullable(),
});
export type ExtractedLabel = z.infer<typeof ExtractedLabel>;

export type FieldStatus = "match" | "fuzzy" | "mismatch" | "missing";

export interface FieldResult {
  key: keyof ApplicationData;
  status: FieldStatus;
  application: string;
  label: string | null;
  score?: number;
  note?: string;
}

export interface WarningResult {
  ok: boolean;
  reasons: string[];
  detected: string | null;
}

export type Verdict = "verified" | "needs_review" | "rejected";

export interface Citation {
  section: string;
  title: string;
  text: string;
}

export interface VerificationResult {
  verdict: Verdict;
  fields: FieldResult[];
  warning: WarningResult;
  extracted: ExtractedLabel;
  citations: Citation[];
  elapsed_ms: number;
  usage: UsageInfo;
}

export interface UsageInfo {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  cost_usd: number;
}
