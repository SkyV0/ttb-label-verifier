export function normalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  return 1 - levenshtein(na, nb) / maxLen;
}

const ABV_RE = /(\d+(?:\.\d+)?)\s*%/;
const PROOF_RE = /(\d+(?:\.\d+)?)\s*proof/i;

export function parseAbv(s: string | null | undefined): number | null {
  if (!s) return null;
  const pct = s.match(ABV_RE);
  if (pct) return parseFloat(pct[1]);
  const proof = s.match(PROOF_RE);
  if (proof) return parseFloat(proof[1]) / 2;
  return null;
}

const VOLUME_UNITS: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  cl: 10,
  l: 1000,
  liter: 1000,
  liters: 1000,
  litre: 1000,
  litres: 1000,
  "fl oz": 29.5735,
  "fluid ounce": 29.5735,
  "fluid ounces": 29.5735,
};

const VOLUME_RE = /(\d+(?:\.\d+)?)\s*(ml|milliliters?|cl|l|liters?|litres?|fl\s*oz|fluid\s*ounces?)\b/i;

export function parseVolumeMl(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.match(VOLUME_RE);
  if (!m) return null;
  const unit = m[2].toLowerCase().replace(/\s+/g, " ").trim();
  const mult = VOLUME_UNITS[unit] ?? VOLUME_UNITS[unit.replace(/s$/, "")];
  if (!mult) return null;
  return parseFloat(m[1]) * mult;
}
