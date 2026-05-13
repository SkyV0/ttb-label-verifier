# TTB Label Verification — Implementation Strategy

**Date:** 2026-05-13
**Author:** Skyler Vautier
**Status:** Approved for build

---

## 1. Problem Distilled

A TTB compliance agent has two things in front of them:

1. **The application** — what the bottler *claims* is on the label (brand, ABV, class/type, net contents, producer address, country of origin, government warning).
2. **The label artwork** — a photo or PDF of what will actually be printed.

Their job is to confirm the two match. Today it's eyeball + checklist. The prior vendor pilot died because it took 30–40s per label. **The bar to clear: <5 seconds per label, batch-capable, legible to a 73-year-old.**

## 2. Approach in One Paragraph

A single Claude Sonnet vision call with `tool_use`-enforced structured output extracts all label fields in one round trip (~2–3s P50). A deterministic verification engine then compares each extracted field to the application data using field-appropriate rules: fuzzy match for free-text (brand, producer), tolerance for numbers (ABV ±0.3%), and a separate **exact + case-sensitive** check for the Government Warning. Results render as a side-by-side green/yellow/red verdict view designed for clarity over density. Batch mode reuses the same pipeline with a concurrency cap so 200+ labels finish in a couple minutes.

## 3. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 App Router | One repo, one deploy, route handlers = serverless backend |
| Hosting | Vercel | Co-located static + serverless, env vars, zero-config |
| Language | TypeScript | Type safety end-to-end, Zod validates LLM output |
| AI | `@anthropic-ai/sdk`, Claude Sonnet 4 vision + tool_use | Structured output, handles bad images natively, fast |
| Styling | Plain CSS Modules | No Tailwind overhead, large readable defaults |
| State | TanStack React Query | Server state, retries, optimistic updates for batch |
| Fuzzy match | Hand-rolled (Levenshtein + normalization) | No need for a dep; ~30 LOC |
| Validation | Zod | Both for API inputs and to parse Claude's tool output |

## 4. The 5-Second Latency Budget

| Stage | Budget | Reality |
|---|---|---|
| Client → Vercel edge | ~50ms | CDN-local |
| Image resize (server, sharp) to ≤1568px | ~200ms | Anthropic vision optimum |
| Claude Sonnet vision + tool_use call | ~2500ms | P50 from Anthropic docs |
| Verification engine (pure JS) | ~5ms | Deterministic |
| Render verdict | ~50ms | React |
| **Total P50** | **~2.8s** | **Comfortably under 5s** |

P95 budget: 4.5s. Fallback if a request approaches the boundary: return partial results + flag for re-review.

## 5. Field Verification Rules

| Field | Rule | Tolerance |
|---|---|---|
| Brand name | Normalize (lowercase, strip punctuation, collapse whitespace), token-set fuzzy match | ≥85 score → match, 60–85 → fuzzy-warn, <60 → mismatch |
| Class/Type | Same as brand | Same |
| Alcohol content | Parse `%` and `proof`, cross-check (proof ≈ ABV × 2) | ±0.3% absolute |
| Net contents | Parse volume + unit, convert to mL | ±2% volume |
| Producer name | Same as brand | Same |
| Producer address | Token-set fuzzy on full string | ≥80 |
| Country of origin | Exact after normalization | None |
| **Government Warning** | **EXACT match against canonical text + verify "GOVERNMENT WARNING:" appears in all-caps as VLM-observed substring** | **None — this is the regulatory teeth** |

The Government Warning canonical text (27 CFR §16.21):

> GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.

## 6. Tool Schema (Claude `tool_use`)

```ts
{
  name: "extract_label_fields",
  description: "Extract all visible TTB-relevant fields from an alcohol beverage label image.",
  input_schema: {
    type: "object",
    properties: {
      brand_name: { type: ["string", "null"] },
      class_type: { type: ["string", "null"] },
      alcohol_content_text: { type: ["string", "null"] }, // verbatim, e.g. "45% Alc./Vol. (90 Proof)"
      net_contents_text: { type: ["string", "null"] },
      producer_name: { type: ["string", "null"] },
      producer_address: { type: ["string", "null"] },
      country_of_origin: { type: ["string", "null"] },
      government_warning_text: { type: ["string", "null"] }, // verbatim, preserve case
      government_warning_header_appears_uppercase: { type: "boolean" },
      government_warning_header_appears_bold: { type: ["boolean", "null"] },
      notes: { type: ["string", "null"] } // anything unusual the VLM noticed
    },
    required: ["brand_name", "government_warning_text", "government_warning_header_appears_uppercase"]
  }
}
```

## 7a. Internationalization (i18n)

EN + ES at launch. Federal agencies serve a multilingual constituency and many imported labels arrive in Spanish — so the UI must be both. Implementation:

- **Lightweight dictionary approach** — `lib/i18n/en.json` + `lib/i18n/es.json`, typed via TS. No heavy library (no `next-intl`, no `i18next`) — the surface is small enough that a 50-line context + hook covers it.
- **Locale persistence** — choice stored in `localStorage` + a cookie so SSR is locale-aware on subsequent loads.
- **Browser-language detection** — first visit uses `Accept-Language` header; user can override anytime.
- **No locale-prefixed URLs** — single set of routes; locale is a client-side context. Keeps the prototype simple and avoids middleware complexity. Production deployment could promote this to `/[locale]/...` segments.

## 7b. Theming (light / dark / system)

Three modes. CSS custom properties drive every color, swapped via `[data-theme="..."]` on `<html>`. Toggle is a single-press tri-state cycle: light → dark → system → light. Default is **system** — respects `prefers-color-scheme` until the user picks. Persists to `localStorage`. SSR-safe (no flash) via an inline script in `layout.tsx` that sets the data attribute before paint.

Color palette designed for **legibility over flair** — high contrast, large readable defaults, AA+ compliant on both themes. No purple gradients, no glassmorphism. The 73-year-old test takes priority.

## 7. UX Principles (the 73-year-old test)

- One CTA per screen.
- Verdict shown as **VERIFIED / NEEDS REVIEW / REJECTED** in large type with color.
- Per-field rows in a two-column table — application on left, label on right, status icon between.
- No modals, no nested menus, no hover-only affordances.
- Keyboard-accessible, screen-reader labeled.
- The override button is plain and visible — Dave can disagree with the AI and approve anyway.

## 8. Token Optimizer

Every Claude call is metered, logged, and where possible cached. Goals: keep P50 latency under 3s, P95 under 5s, and cost predictable as batch size grows.

| Lever | Implementation |
|---|---|
| **Prompt caching** | System prompt + tool schema + canonical warning text are stable across every request — wrapped with `cache_control: {type: "ephemeral"}` per the Claude API skill. Cache reads are ~10% of input cost. |
| **Right-sized model** | Default to `claude-sonnet-4-6` for vision extraction (best quality/cost). For the optional "explain rejection" pass we use `claude-haiku-4-5` since the input is small text. |
| **Image preprocessing** | Server-side resize (sharp) to max 2576px long edge before sending. Cuts vision tokens up to 3× on large photos without quality loss. |
| **`max_tokens` budget** | 1024 for vision extraction (structured output is small JSON). No unbounded calls. |
| **Per-call logging** | Every call records: feature name, model, input/output tokens, cache read/write, latency, cost estimate. Exposed at `/api/usage` and rendered in a footer for transparency. |
| **Batch optimization** | Concurrent calls share the same cached system prompt → 90% cache hits across a 200-label batch. |

Implemented as a `lib/claude.ts` wrapper around `@anthropic-ai/sdk` — every call goes through it, never direct SDK in route handlers.

## 9. RAG Server — Regulation Lookup

When a label fails verification, agents want to know **which TTB regulation** it violates. We embed the relevant chunks of 27 CFR (Title 27, Chapter I — Alcohol, Tobacco Products, and Firearms) and serve them via semantic search:

| Source | Use |
|---|---|
| 27 CFR §4 (Wine labels) | Wine-specific requirements |
| 27 CFR §5 (Distilled spirits labels) | Spirits requirements |
| 27 CFR §7 (Malt beverage labels) | Beer requirements |
| 27 CFR §16 (Government health warning) | Canonical warning text + formatting rules |

**Approach (pragmatic for a prototype):**

1. **Index at build time** — scrape/load the relevant CFR sections from ecfr.gov text exports → chunk by section → embed with `voyage-3-lite` (300-token chunks).
2. **Store** — JSON file shipped with the app (no separate vector DB; this is small: ~500 chunks, fits in memory).
3. **Retrieve** — at verification time, after extracting fields, embed the (failed-field, beverage-type) query and surface top-3 chunks.
4. **Cite** — pass retrieved chunks to a small Haiku call that drafts the rejection reason **with CFR citations**. Cached, since the chunks are stable.

**Why this matters:** Dave Morrison ("28 years") values judgment over pattern matching. Citations let him quickly verify the AI's reasoning rather than trust it blindly. It's also the difference between a toy and something a federal agency could plausibly use.

**Trade-off:** Slight added latency (~200ms for the embedding + retrieval call). Mitigation: run regulation lookup in parallel with the verification engine, only block on it if a field fails.

**Provider:** Voyage AI embeddings (Anthropic-recommended) via `@anthropic-ai/sdk`-compatible client, or a tiny self-hosted alternative if budget is tight.

## 10. Out of Scope (documented, not built)

- COLA system integration
- PII handling, FedRAMP, document retention
- Multi-tenant auth (single-user prototype, no login)
- Persistence — results live in session only; refresh = gone (matches Marcus's "don't store anything sensitive")
- Outbound firewall workaround for federal networks (would need on-prem Bedrock or Azure OpenAI route in prod)

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Sonnet vision >5s on large images | Server-side resize to ≤1568px before sending |
| VLM hallucinates a field | Tool schema marks fields nullable; engine treats null as "not detected" |
| Government warning false-pass on miscased header | Two-signal check: VLM uppercase flag + server-side substring check on verbatim text |
| Batch uploads exhaust serverless memory | Stream files, p-limit concurrency to 8, never hold full batch in RAM |
| Anthropic rate limits during batch | Exponential backoff + per-batch retry queue |
| API key leak | Server-only env var, no `NEXT_PUBLIC_` prefix |

## 12. Deliverables Checklist

- [ ] GitHub repo (new, public) with README
- [ ] Vercel deployment URL
- [ ] Working single-label flow
- [ ] Working batch flow
- [ ] Strategy doc (this file)
- [ ] <5s P95 latency verified
