import sharp from "sharp";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, VISION_MODEL, extractUsage } from "./claude";
import { ExtractedLabel, type UsageInfo } from "./types";

const SYSTEM_PROMPT = `You are a TTB (Alcohol and Tobacco Tax and Trade Bureau) label-extraction assistant.

You will be shown an image of an alcohol beverage label. Your job is to extract the fields a TTB compliance agent needs to verify the label against an application — verbatim, preserving case and punctuation exactly as they appear on the label.

Use the extract_label_fields tool to return your findings. If a field is not visible on the label, return null for that field — never guess. Only the government_warning_header_appears_uppercase boolean is required; everything else is nullable.

For the government warning specifically: capture the FULL text verbatim, including the "GOVERNMENT WARNING:" prefix exactly as it appears (case-sensitive). Set government_warning_header_appears_uppercase to true only if the words "GOVERNMENT WARNING" are entirely in capital letters on the label.`.trim();

const TOOL: Anthropic.Messages.Tool = {
  name: "extract_label_fields",
  description:
    "Return the TTB-relevant fields visible on the alcohol label. Use null for any field not present on the label. Preserve exact case and punctuation for all strings.",
  input_schema: {
    type: "object" as const,
    properties: {
      brand_name: { type: ["string", "null"], description: "Brand name as printed on the label." },
      class_type: { type: ["string", "null"], description: "Class/type designation (e.g. 'Kentucky Straight Bourbon Whiskey')." },
      alcohol_content_text: { type: ["string", "null"], description: "Alcohol content verbatim, e.g. '45% Alc./Vol. (90 Proof)'." },
      net_contents_text: { type: ["string", "null"], description: "Net contents verbatim, e.g. '750 mL'." },
      producer_name: { type: ["string", "null"], description: "Name of bottler / producer / distiller." },
      producer_address: { type: ["string", "null"], description: "Address of bottler / producer." },
      country_of_origin: { type: ["string", "null"], description: "Country of origin for imports (e.g. 'Product of France'). Null for domestic." },
      government_warning_text: { type: ["string", "null"], description: "FULL government warning text verbatim, preserving case." },
      government_warning_header_appears_uppercase: { type: "boolean", description: "True only if 'GOVERNMENT WARNING' appears in ALL CAPS on the label." },
      government_warning_header_appears_bold: { type: ["boolean", "null"], description: "True if the warning header appears bold; null if uncertain." },
      notes: { type: ["string", "null"], description: "Any visual anomalies that might affect compliance review." },
    },
    required: ["brand_name", "government_warning_text", "government_warning_header_appears_uppercase"],
  } as const,
};

const MAX_LONG_EDGE = 2576;

export async function preprocessImage(input: Buffer | ArrayBuffer): Promise<{ data: string; mediaType: "image/jpeg" }> {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const resized = await sharp(buf, { failOn: "none" })
    .rotate()
    .resize({ width: MAX_LONG_EDGE, height: MAX_LONG_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
  return { data: resized.toString("base64"), mediaType: "image/jpeg" };
}

export interface ExtractionOutput {
  fields: ExtractedLabel;
  usage: UsageInfo;
  model: string;
}

export async function extractLabelFields(
  image: Buffer | ArrayBuffer,
  signal?: AbortSignal,
): Promise<ExtractionOutput> {
  const { data, mediaType } = await preprocessImage(image);

  const response = await anthropic.messages.create(
    {
      model: VISION_MODEL,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [
        {
          ...TOOL,
          cache_control: { type: "ephemeral" },
        } as Anthropic.Messages.Tool,
      ],
      tool_choice: { type: "tool", name: "extract_label_fields" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data },
            },
            {
              type: "text",
              text: "Extract the TTB label fields from this image. Use null for anything not visible.",
            },
          ],
        },
      ],
    },
    // Plumb the request's AbortSignal through so a client cancel halts the
    // Anthropic call instead of burning tokens in the background.
    signal ? { signal } : undefined,
  );

  const toolBlock = response.content.find((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use");
  if (!toolBlock) {
    throw new Error("Model did not return a tool_use block.");
  }

  const parsed = ExtractedLabel.parse(toolBlock.input);
  return {
    fields: parsed,
    usage: extractUsage(VISION_MODEL, response.usage),
    model: VISION_MODEL,
  };
}
