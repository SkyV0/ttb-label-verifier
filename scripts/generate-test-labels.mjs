// Generates synthetic TTB-compliant (and one intentionally non-compliant) label
// images you can drop into the verifier. Uses sharp to rasterize SVG → PNG so
// we don't have to bundle any test image binaries in the repo.
//
// Usage:
//   yarn make:labels
//   open samples/

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve(process.cwd(), "samples");

const CANONICAL_WARNING_BLOCK = `<tspan x="50%" dy="0">GOVERNMENT WARNING: (1) According to the Surgeon</tspan>
  <tspan x="50%" dy="22">General, women should not drink alcoholic beverages</tspan>
  <tspan x="50%" dy="22">during pregnancy because of the risk of birth defects.</tspan>
  <tspan x="50%" dy="22">(2) Consumption of alcoholic beverages impairs your</tspan>
  <tspan x="50%" dy="22">ability to drive a car or operate machinery, and may</tspan>
  <tspan x="50%" dy="22">cause health problems.</tspan>`;

function buildLabelSvg({
  brand = "OLD TOM DISTILLERY",
  classType = "Kentucky Straight Bourbon Whiskey",
  abv = "45% Alc./Vol. (90 Proof)",
  netContents = "750 mL",
  producer = "Old Tom Distillery, LLC",
  address = "123 Bourbon Road, Lexington, KY",
  warningHeader = "GOVERNMENT WARNING:",
  warningHeaderBold = true,
}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="1500" viewBox="0 0 1100 1500">
  <defs>
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#f7eddb"/>
      <stop offset="100%" stop-color="#e8d6b3"/>
    </linearGradient>
  </defs>

  <rect width="1100" height="1500" fill="url(#bg)"/>
  <rect x="40" y="40" width="1020" height="1420" fill="none" stroke="#5a3c1a" stroke-width="6"/>
  <rect x="60" y="60" width="980" height="1380" fill="none" stroke="#5a3c1a" stroke-width="1.5"/>

  <!-- Top ornament -->
  <line x1="200" y1="150" x2="900" y2="150" stroke="#5a3c1a" stroke-width="2"/>
  <text x="50%" y="135" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#5a3c1a" font-style="italic">— Established 1887 —</text>

  <!-- Brand name -->
  <text x="50%" y="270" text-anchor="middle" font-family="Georgia, serif" font-size="72" font-weight="700" fill="#3a2410" letter-spacing="6">${brand}</text>

  <!-- Class / type -->
  <text x="50%" y="340" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-style="italic" fill="#5a3c1a">${classType}</text>

  <!-- Ornamental divider -->
  <text x="50%" y="395" text-anchor="middle" font-family="serif" font-size="28" fill="#5a3c1a">✦   ✦   ✦</text>

  <!-- ABV -->
  <text x="50%" y="470" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="700" fill="#3a2410" letter-spacing="2">${abv}</text>

  <!-- Net contents -->
  <text x="50%" y="530" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#5a3c1a">${netContents}</text>

  <!-- Producer block -->
  <text x="50%" y="660" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#3a2410" letter-spacing="1">BOTTLED BY</text>
  <text x="50%" y="700" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="28" font-weight="600" fill="#3a2410">${producer}</text>
  <text x="50%" y="735" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#5a3c1a">${address}</text>

  <!-- Footer ornament -->
  <line x1="200" y1="820" x2="900" y2="820" stroke="#5a3c1a" stroke-width="2"/>

  <!-- Government warning -->
  <text x="50%" y="950" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#1c1b18" font-weight="${warningHeaderBold ? "700" : "400"}">
    <tspan x="50%">${warningHeader} (1) According to the Surgeon</tspan>
    <tspan x="50%" dy="26">General, women should not drink alcoholic beverages</tspan>
    <tspan x="50%" dy="26">during pregnancy because of the risk of birth defects.</tspan>
    <tspan x="50%" dy="26">(2) Consumption of alcoholic beverages impairs your</tspan>
    <tspan x="50%" dy="26">ability to drive a car or operate machinery, and may</tspan>
    <tspan x="50%" dy="26">cause health problems.</tspan>
  </text>

  <!-- Decorative bottom -->
  <text x="50%" y="1400" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#5a3c1a" font-style="italic">Distilled and Bottled in Kentucky</text>
</svg>`;
}

async function render(svg, file) {
  const buf = Buffer.from(svg);
  const png = await sharp(buf).png({ quality: 92 }).toBuffer();
  const out = path.join(OUT_DIR, file);
  await writeFile(out, png);
  console.log(`✓ ${out}  (${(png.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // 1) Fully compliant label — should produce VERIFIED.
  await render(buildLabelSvg({}), "label-01-compliant.png");

  // 2) Warning header in title case — should be REJECTED (caps fail).
  await render(
    buildLabelSvg({ warningHeader: "Government Warning:", warningHeaderBold: false }),
    "label-02-bad-warning-caps.png",
  );

  // 3) Brand mismatch — should produce NEEDS REVIEW or REJECTED depending on
  //    how aggressively the fuzzy matcher rates the distance.
  await render(
    buildLabelSvg({ brand: "SOMETHING ELSE DISTILLERY" }),
    "label-03-brand-mismatch.png",
  );

  // 4) ABV slightly off — within fuzzy tolerance, should be NEEDS REVIEW.
  await render(
    buildLabelSvg({ abv: "45.8% Alc./Vol. (91.6 Proof)" }),
    "label-04-abv-drift.png",
  );

  console.log("\nDone. Drop one of these into the verifier home page.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
