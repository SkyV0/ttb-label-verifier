import Anthropic from "@anthropic-ai/sdk";
import type { UsageInfo } from "./types";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey && process.env.NODE_ENV !== "test") {
  console.warn("ANTHROPIC_API_KEY is not set — verification calls will fail.");
}

export const anthropic = new Anthropic({
  apiKey: apiKey ?? "missing-key",
});

export const VISION_MODEL = process.env.ANTHROPIC_VISION_MODEL ?? "claude-sonnet-4-6";
export const REASONING_MODEL = process.env.ANTHROPIC_REASONING_MODEL ?? "claude-haiku-4-5";

// Pricing (per 1M tokens) for cost-estimate display. Update as Anthropic publishes new rates.
const PRICING: Record<string, { input: number; output: number; cache_read: number; cache_write: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
  "claude-haiku-4-5": { input: 1, output: 5, cache_read: 0.1, cache_write: 1.25 },
  "claude-opus-4-7": { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25 },
};

export function estimateCost(model: string, u: Omit<UsageInfo, "cost_usd">): number {
  const p = PRICING[model] ?? PRICING["claude-sonnet-4-6"];
  return (
    (u.input_tokens * p.input +
      u.output_tokens * p.output +
      u.cache_read_input_tokens * p.cache_read +
      u.cache_creation_input_tokens * p.cache_write) /
    1_000_000
  );
}

export function extractUsage(model: string, usage: Anthropic.Messages.Usage): UsageInfo {
  const base = {
    input_tokens: usage.input_tokens ?? 0,
    output_tokens: usage.output_tokens ?? 0,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
  };
  return { ...base, cost_usd: estimateCost(model, base) };
}
