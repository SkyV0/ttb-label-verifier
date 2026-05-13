import { NextResponse } from "next/server";
import { ApplicationData } from "@/lib/types";
import { extractLabelFields } from "@/lib/extract";
import { runVerificationEngine } from "@/lib/verify";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONCURRENCY = 8;

async function processOne(image: File, application: ApplicationData) {
  const started = Date.now();
  const buf = Buffer.from(await image.arrayBuffer());
  const { fields, usage } = await extractLabelFields(buf);
  const elapsed = Date.now() - started;
  return runVerificationEngine(application, fields, elapsed, usage);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const applicationRaw = form.get("application");
    if (typeof applicationRaw !== "string") {
      return NextResponse.json({ error: "missing_application" }, { status: 400 });
    }
    const application = ApplicationData.parse(JSON.parse(applicationRaw));

    const images = form.getAll("images").filter((v): v is File => v instanceof File);
    if (images.length === 0) {
      return NextResponse.json({ error: "no_images" }, { status: 400 });
    }

    const results: Array<{ filename: string; result?: unknown; error?: string }> = new Array(images.length);
    let cursor = 0;

    const worker = async () => {
      while (true) {
        const i = cursor++;
        if (i >= images.length) break;
        const img = images[i];
        try {
          const r = await processOne(img, application);
          results[i] = { filename: img.name, result: r };
        } catch (err) {
          results[i] = { filename: img.name, error: err instanceof Error ? err.message : "unknown_error" };
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, images.length) }, () => worker()),
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.error("batch verify error", err);
    return NextResponse.json(
      { error: "batch_failed", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
