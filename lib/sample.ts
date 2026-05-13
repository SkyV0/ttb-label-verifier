import type { ApplicationData } from "./types";
import { CANONICAL_WARNING } from "./warning";

export const SAMPLE_APPLICATION: ApplicationData = {
  brand_name: "OLD TOM DISTILLERY",
  class_type: "Kentucky Straight Bourbon Whiskey",
  alcohol_content: "45% Alc./Vol. (90 Proof)",
  net_contents: "750 mL",
  producer_name: "Old Tom Distillery, LLC",
  producer_address: "123 Bourbon Road, Lexington, KY",
  country_of_origin: "",
  beverage_type: "spirits",
};

const SAMPLE_VARIANTS: { brand: string; producer: string }[] = [
  { brand: "OLD TOM DISTILLERY", producer: "Old Tom Distillery, LLC" },
  { brand: "RIVER BEND BOURBON", producer: "River Bend Spirits Co." },
  { brand: "STONE'S THROW WHISKEY", producer: "Stone's Throw Distilling" },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSvg(brand: string, producer: string): string {
  // 1024x1280 — comfortably under sharp's resize ceiling, well above the
  // floor where vision quality degrades. Pure system font stack, no external
  // resources, so canvas->PNG conversion never taints.
  const warningLines = wrap(CANONICAL_WARNING, 62);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1280" width="1024" height="1280">
  <rect width="1024" height="1280" fill="#f4ead2"/>
  <rect x="40" y="40" width="944" height="1200" fill="#fffaf0" stroke="#3a2a1a" stroke-width="6"/>
  <text x="512" y="180" font-family="Georgia, 'Times New Roman', serif" font-size="58" font-weight="700" text-anchor="middle" fill="#2b1810">${escapeXml(brand)}</text>
  <line x1="160" y1="220" x2="864" y2="220" stroke="#3a2a1a" stroke-width="3"/>
  <text x="512" y="290" font-family="Georgia, serif" font-size="32" font-style="italic" text-anchor="middle" fill="#3a2a1a">Kentucky Straight Bourbon Whiskey</text>
  <text x="512" y="380" font-family="Georgia, serif" font-size="26" text-anchor="middle" fill="#3a2a1a">Distilled and Bottled by</text>
  <text x="512" y="420" font-family="Georgia, serif" font-size="28" font-weight="700" text-anchor="middle" fill="#2b1810">${escapeXml(producer)}</text>
  <text x="512" y="455" font-family="Georgia, serif" font-size="22" text-anchor="middle" fill="#3a2a1a">123 Bourbon Road, Lexington, KY</text>
  <text x="512" y="560" font-family="Georgia, serif" font-size="42" font-weight="700" text-anchor="middle" fill="#2b1810">45% Alc./Vol. (90 Proof)</text>
  <text x="512" y="620" font-family="Georgia, serif" font-size="34" text-anchor="middle" fill="#3a2a1a">750 mL</text>
  <rect x="80" y="720" width="864" height="440" fill="#fff" stroke="#2b1810" stroke-width="2"/>
  ${warningLines
    .map(
      (line, i) =>
        `<text x="110" y="${770 + i * 36}" font-family="Arial, sans-serif" font-size="${i === 0 ? 28 : 24}" font-weight="${i === 0 ? 800 : 400}" fill="#000">${escapeXml(line)}</text>`,
    )
    .join("\n  ")}
</svg>`;
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      lines.push(line.trim());
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

async function svgToPngFile(svg: string, filename: string): Promise<File> {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Failed to render sample label image."));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    ctx.fillStyle = "#f4ead2";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pngBlob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob returned null."))),
        "image/png",
      ),
    );
    return new File([pngBlob], filename, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function getSampleLabelFile(): Promise<File> {
  const v = SAMPLE_VARIANTS[0];
  return svgToPngFile(buildSvg(v.brand, v.producer), "sample-label.png");
}

export async function getSampleBatchFiles(): Promise<File[]> {
  return Promise.all(
    SAMPLE_VARIANTS.map((v, i) =>
      svgToPngFile(buildSvg(v.brand, v.producer), `sample-label-${i + 1}.png`),
    ),
  );
}
