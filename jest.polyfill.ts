// Polyfills loaded via `setupFiles` — runs BEFORE the test framework is in
// place, so don't use jest globals here. Only assign things needed at module
// load time by the code under test (TextEncoder/TextDecoder for zod URL
// validation and Anthropic SDK base64 helpers).

import { TextEncoder, TextDecoder } from "node:util";

const g = globalThis as Record<string, unknown>;
if (typeof g.TextEncoder === "undefined") g.TextEncoder = TextEncoder;
if (typeof g.TextDecoder === "undefined") g.TextDecoder = TextDecoder;
