import { NextResponse } from "next/server";
import { ApplicationData } from "@/lib/types";
import { extractLabelFields } from "@/lib/extract";
import { runVerificationEngine } from "@/lib/verify";
import {
  VerifyError,
  classifyError,
  isAllowedFileType,
  MAX_BATCH_SIZE,
  MAX_FILE_BYTES,
} from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONCURRENCY = 8;

async function processOne(image: File, application: ApplicationData, signal?: AbortSignal) {
  const started = Date.now();
  if (image.size > MAX_FILE_BYTES) {
    throw new VerifyError(
      "image_too_large",
      `${image.name}: exceeds ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.`,
      413,
    );
  }
  if (!isAllowedFileType(image)) {
    throw new VerifyError("invalid_file_type", `${image.name}: unsupported type.`, 415);
  }
  const buf = Buffer.from(await image.arrayBuffer());
  const { fields, usage } = await extractLabelFields(buf, signal);
  const elapsed = Date.now() - started;
  return runVerificationEngine(application, fields, elapsed, usage);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const applicationRaw = form.get("application");
    if (typeof applicationRaw !== "string") {
      throw new VerifyError("missing_application", "Application JSON is required.", 400);
    }
    const parsed = ApplicationData.safeParse(JSON.parse(applicationRaw));
    if (!parsed.success) {
      throw new VerifyError(
        "invalid_application",
        "Application data failed validation.",
        400,
        { issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) },
      );
    }

    const images = form.getAll("images").filter((v): v is File => v instanceof File);
    if (images.length === 0) {
      throw new VerifyError("no_images", "At least one image is required.", 400);
    }
    if (images.length > MAX_BATCH_SIZE) {
      throw new VerifyError(
        "too_many_images",
        `Batch limit is ${MAX_BATCH_SIZE} labels per request.`,
        413,
        { received: images.length, limit: MAX_BATCH_SIZE },
      );
    }

    const results: Array<{
      filename: string;
      result?: unknown;
      error?: { code: string; message: string };
    }> = new Array(images.length);
    let cursor = 0;

    const worker = async () => {
      while (true) {
        const i = cursor++;
        if (i >= images.length) break;
        const img = images[i];
        try {
          const r = await processOne(img, parsed.data, req.signal);
          results[i] = { filename: img.name, result: r };
        } catch (err) {
          const ve = classifyError(err);
          results[i] = { filename: img.name, error: { code: ve.code, message: ve.message } };
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, images.length) }, () => worker()),
    );

    return NextResponse.json({ results });
  } catch (err) {
    const verifyErr = classifyError(err);
    if (verifyErr.status >= 500) {
      console.error("batch verify error", err);
    }
    return NextResponse.json(verifyErr.toJSON(), { status: verifyErr.status });
  }
}
