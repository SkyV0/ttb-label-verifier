# TTB Label Verifier

An AI-powered prototype that helps a TTB compliance agent verify an alcohol beverage label image against the application data — in under five seconds.

Built as a take-home project.

**Live deployment:** <https://ttb-label-verifier-three.vercel.app>

Try it without setting up anything: open the URL, click **Try with sample** on the single-label page, and watch the verdict land in ~3 seconds. The batch page has the same affordance.

---

## What it does

A compliance agent uploads a label image (PNG / JPG / WebP / GIF, up to 20 MB) and enters the application data (brand name, class/type, ABV, net contents, producer, country of origin). The app:

1. **Resizes the image** server-side to the optimal resolution for Claude vision (≤ 2576px).
2. **Extracts the label fields** with a single Claude Sonnet 4.6 vision call using `tool_use`-enforced structured output — no free-text parsing.
3. **Verifies** each field with a deterministic engine:
   - Fuzzy text match for brand / class / producer (handles case + punctuation differences).
   - Numeric tolerance for ABV (±0.3%) and net contents (±2% by volume).
   - **Exact word-for-word match** for the §16.21 Government Warning, with a separate ALL-CAPS check on the "GOVERNMENT WARNING:" header.
4. **Returns a verdict** — `VERIFIED` / `NEEDS REVIEW` / `REJECTED` — with per-field status, regulation citations (27 CFR §§ 4 / 5 / 7 / 16), the detected warning text, latency, and token usage.
5. **Batch mode** handles 200–300 labels at once with concurrent processing (cap of 8).

Internationalized (EN / ES) and themeable (light / dark / system) out of the box.

---

## Quick start

```bash
# 1. Install
yarn install

# 2. Set your Anthropic key
cp .env.example .env.local
# then edit .env.local and paste your key

# 3. Run
yarn dev
```

Open <http://localhost:3000>.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | **Required.** Your Anthropic API key. |
| `ANTHROPIC_VISION_MODEL` | `claude-sonnet-4-6` | Model for the label extraction call. |
| `ANTHROPIC_REASONING_MODEL` | `claude-haiku-4-5` | Reserved for future "explain rejection" pass. |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              Next.js 15 (App Router)                 │
│                                                      │
│  /            single-label UI                        │
│  /batch       batch (200-300 labels)                 │
│                                                      │
│  /api/verify          POST  →  one image + one app   │
│  /api/verify/batch    POST  →  N images, p-limit=8   │
└─────────────────────┬────────────────────────────────┘
                      │
              ┌───────▼────────────┐
              │ lib/extract.ts     │  preprocess (sharp) → Sonnet 4.6 vision
              │                    │  + tool_use (structured fields)
              │                    │  + prompt caching (~90% reads)
              └───────┬────────────┘
                      │
              ┌───────▼────────────┐
              │ lib/verify.ts      │  deterministic per-field rules
              │   fuzzy.ts         │  + Levenshtein normalization
              │   warning.ts       │  + 27 CFR §16.21 exact-match
              │   rag.ts           │  + cited regulation chunks
              └────────────────────┘
```

Everything is co-located in one Next.js app — frontend + serverless routes + shared `lib/` — so it's one deploy, one repo, zero CORS.

---

## Why this stack

I work primarily in **Java and Node** day-to-day, with proficiency in **Python**. I picked Node / Next.js for this prototype not because it's the only fit, but because it lets me ship the working product fastest:

- **Single repo, single deploy** — Vercel takes a `git push` and produces a URL. No Docker, no CDK, no CI plumbing for a take-home.
- **Co-located backend** — Route handlers (`app/api/verify/route.ts`) share types with the frontend, eliminating a class of contract bugs.
- **Native streaming + edge** — The `<5s P95` requirement is the hardest constraint in the spec; Vercel's network plus a single Anthropic vision call lands a request comfortably under that bar.

**Tech isn't religion.** Each stack has a purpose; this one fits "ship a working AI prototype in a day or two." If this were going to enterprise scale, the migration paths are:

| Concern | This prototype | Enterprise alternative |
|---|---|---|
| Compute | Vercel Functions (Node 22) | **AWS Lambda** (Node or Python), **Azure Functions** — Marcus specifically mentioned Azure post-2019 migration |
| Long-running batch | 60-second function cap | **Step Functions** / **AWS Batch** / **Azure Durable Functions** for the 300-label dumps Janet in Seattle described |
| Persistence | None (intentional — Marcus: "don't store anything sensitive") | **DynamoDB / S3** (AWS) or **Cosmos DB / Blob Storage** (Azure) behind a real auth boundary |
| Auth | None (single-user prototype) | **NextAuth** would be the obvious add for a near-term step (drop-in, Google / Cognito / Entra ID providers). For a federal deployment, **PIV / CAC** via the existing Cognito stack Marcus referenced. |
| AI compute on a locked-down federal network | First-party Anthropic API | **Anthropic on Bedrock** (AWS) or **Azure OpenAI**-style routing — solves Marcus's "firewall blocks ML endpoints" problem with VPC-private endpoints. |
| Storage of label images / audit | In-memory only | S3 + DynamoDB / Blob + Cosmos with field-level encryption per FedRAMP |

The codebase is structured so the migration is mechanical: `lib/extract.ts`, `lib/verify.ts`, `lib/rag.ts` are pure functions with no Next.js dependency. Move them under a Lambda handler or an Azure Function and they work unchanged.

---

## Design decisions & trade-offs

### Vision + tool_use vs. classic OCR

I went straight to a vision LLM with `tool_use` (structured output) instead of Tesseract / Textract → LLM. Three reasons:

1. Jenny Park's note about "weird angles, bad lighting, glare on the bottle" — modern VLMs handle this natively; traditional OCR doesn't.
2. One round trip vs. two — meeting the 5-second budget without parallelism gymnastics.
3. Structured output (`tool_use`) means the model returns typed JSON, not free-text I have to regex.

Trade-off: tighter coupling to one provider. Mitigated by isolating all Anthropic calls in `lib/claude.ts` — swapping providers means changing one file.

### Two-signal warning check

Dave Morrison's "STONE'S THROW vs Stone's Throw" anecdote drives most of the system — fuzzy match for free-text fields, with normalization that strips case and punctuation. But the government warning is different: Jenny called out that "Government Warning" in title case (instead of all caps) is a hard reject. So `lib/warning.ts` runs two checks:

1. **Normalized text equality** against the §16.21 canonical statement.
2. **VLM-reported caps flag** for the header.

Either one failing rejects the label.

### Token optimizer + prompt caching

`lib/claude.ts` wraps every Anthropic call. The system prompt + tool schema are stable across requests, so they're marked `cache_control: ephemeral` — ~90% of input tokens come from cache on the second request onward. Every call returns `usage` (input / output / cache reads / writes + cost estimate), surfaced in the UI footer for transparency.

### RAG layer (CFR citations)

When a verification fails, agents want to know **which** regulation. `lib/rag.ts` ships a curated subset of 27 CFR §§ 4 (wine), 5 (spirits), 7 (malt), 16 (warning) keyed by issue, so verdicts include citations the agent can click through.

**This is intentionally not a full vector RAG.** For a prototype, curated chunks beat hand-rolling embeddings + a vector DB. The function signature in `rag.ts` is the same shape a real RAG would expose — production swap is one file.

### Why no persistence / auth

Marcus said it directly: "don't do anything crazy. We're not storing anything sensitive for this exercise." So:

- Verification results live in component state — refresh = gone.
- No user login. No DB. No S3.
- Adding auth = `yarn install next-auth`, two config files, one wrapping `<SessionProvider>`. ~30 minutes of work for a follow-up PR.

### What I cut

- COLA integration (Marcus: years away)
- FedRAMP / PII handling
- Persistent audit log
- The "explain rejection" Haiku pass — the RAG citations already cover this surface area; the Haiku call would be added if the rejection text needs natural-language narration.
- A full vector RAG over all of CFR Title 27

---

## Project layout

```
take-home/
├── app/
│   ├── layout.tsx          # theme + i18n providers, theme init script (no FOUC)
│   ├── globals.css         # design system (light + dark via CSS custom props)
│   ├── page.tsx            # single-label flow
│   ├── batch/page.tsx      # batch flow with concurrency + filter
│   └── api/
│       └── verify/
│           ├── route.ts            # POST /api/verify
│           └── batch/route.ts      # POST /api/verify/batch
├── components/
│   ├── ApplicationForm.tsx
│   ├── Header.tsx
│   ├── I18nProvider.tsx
│   ├── ResultView.tsx
│   ├── ThemeProvider.tsx
│   └── UploadZone.tsx
├── lib/
│   ├── claude.ts           # SDK wrapper + pricing + usage extraction
│   ├── extract.ts          # vision + tool_use field extraction
│   ├── fuzzy.ts            # normalization + Levenshtein + ABV / volume parsers
│   ├── i18n/
│   │   ├── en.json
│   │   └── es.json
│   ├── rag.ts              # CFR chunks + citation selection
│   ├── types.ts            # Zod schemas + shared types
│   ├── verify.ts           # deterministic verification engine
│   └── warning.ts          # §16.21 canonical + exact-match check
├── STRATEGY.md             # full design doc (analyst + engineering board synthesis)
├── README.md               # this file
└── package.json
```

---

## Verifying the 5-second budget

The hard requirement from Sarah Chen: P95 latency under five seconds. Measured on a Sonnet 4.6 vision call with a typical 1024×1024 label:

| Stage | Budget | Measured (typical) |
|---|---|---|
| Edge → server | ~50ms | ~30ms |
| `sharp` resize | ~200ms | ~150ms |
| Sonnet 4.6 vision + tool_use | ≤ 3000ms | ~2200ms |
| Verification engine (pure JS) | ~5ms | < 5ms |
| Render | ~50ms | ~40ms |
| **Total** | **≤ 5000ms** | **~2400ms P50** |

Token usage shown in the footer of every result so you can verify the math live.

---

## Limitations to flag

- **Vision quality on extremely low-resolution images** (< 600px) — the model will still extract, but confidence drops. Mitigated by `sharp`'s natural floor; no client-side warning shown yet.
- **PDF is intentionally not supported.** Prebuilt `sharp` binaries ship without libvips poppler input, so PDFs would crash the pipeline before reaching the vision model. The MIME validator rejects them up front. If compliance needs PDF in production, rasterize page 1 with `pdfjs-dist` before handing to `sharp`.
- **Batch error handling** — if the Anthropic API rate-limits mid-batch, those individual labels show `ERROR` in the table; the user can retry just the flagged ones. A real production loop would add exponential backoff + a retry queue.
- **`needs_review` vs `rejected` for fuzzy matches** — currently any fuzzy match downgrades to `needs_review`. Field-level thresholds are tunable in `lib/verify.ts` if compliance defines stricter rules.

---

## Scripts

```bash
yarn dev               # local dev server (Turbopack)
yarn build             # production build
yarn start             # serve the production build
yarn typecheck         # tsc --noEmit
yarn lint              # next lint
yarn format            # prettier --write .
yarn test              # Jest — unit + component + API route (61 tests)
yarn test:watch        # Jest watch mode
yarn test:coverage     # Jest with coverage report
yarn test:e2e:install  # one-time: install Playwright Chromium
yarn test:e2e          # Playwright smoke against the deployed URL
```

---

## Testing

| Layer | Runner | Files | What it covers |
|---|---|---|---|
| `lib/` unit | Jest | [`lib/__tests__/`](lib/__tests__/) | `normalize`, `similarity`, `parseAbv` / `parseVolumeMl`, `verifyWarning`, the full `runVerificationEngine` decision tree (including unparseable-input false-positive guards), `citationsForVerdict` per beverage type, and `citationUrl` ecfr.gov mapping. 45 tests. |
| API route | Jest (node env) | [`app/api/verify/__tests__/route.test.ts`](app/api/verify/__tests__/route.test.ts) | `POST /api/verify` with the Anthropic SDK mocked — happy path, missing image, missing application, warning failure, upstream errors. 5 tests. |
| Component | Jest (jsdom) + RTL | [`components/__tests__/`](components/__tests__/) | `ResultView`, `ApplicationForm`, `UploadZone` — render + user interaction + i18n. 11 tests. |
| E2E | Playwright | [`tests/e2e/smoke.spec.ts`](tests/e2e/smoke.spec.ts) | Production smoke against the live Vercel URL — page load, theme cycle, locale switch, batch route, API reachability. Does **not** exercise `/api/verify` end-to-end (would burn Anthropic tokens on every CI run). |

E2E target is overridable via `PLAYWRIGHT_BASE_URL` for local runs against `yarn dev`.

## CI/CD

GitHub Actions is the orchestrator; Vercel is just the runtime. The workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) has three jobs that gate one another:

1. **`test`** (every PR + push) — `yarn typecheck` + `yarn lint` + `yarn test --ci`. If anything red, the pipeline stops here.
2. **`deploy`** (push to `main` only, needs `test`) — `vercel pull` + `vercel build --prod` + `vercel deploy --prebuilt --prod`. The deployment URL is exported as a job output and pinned in the workflow run summary.
3. **`e2e`** (push to `main` only, needs `deploy`) — Playwright smoke run against **the URL that was just deployed** (not a hardcoded URL). HTML report uploaded as an artifact on success or failure.

The deploy job uses three repo secrets — `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Roll back from the Vercel dashboard if a deploy ships a bad commit.

---

## License

MIT, for take-home / interview purposes only.
