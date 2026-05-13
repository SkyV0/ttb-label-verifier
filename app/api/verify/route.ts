import { NextResponse } from "next/server";
import { ApplicationData } from "@/lib/types";
import { extractLabelFields } from "@/lib/extract";
import { runVerificationEngine } from "@/lib/verify";
import {
  VerifyError,
  classifyError,
  isAllowedFileType,
  MAX_FILE_BYTES,
} from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const started = Date.now();
  try {
    const form = await req.formData();
    const image = form.get("image");
    const applicationRaw = form.get("application");

    if (!(image instanceof File)) {
      throw new VerifyError("missing_image", "An image file is required.", 400);
    }
    if (typeof applicationRaw !== "string") {
      throw new VerifyError("missing_application", "Application JSON is required.", 400);
    }
    if (image.size > MAX_FILE_BYTES) {
      throw new VerifyError(
        "image_too_large",
        `Image exceeds the ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB limit.`,
        413,
        { size: image.size },
      );
    }
    if (!isAllowedFileType(image)) {
      throw new VerifyError(
        "invalid_file_type",
        "File type must be PNG, JPG, WebP, or GIF.",
        415,
        { type: image.type, name: image.name },
      );
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

    const buffer = Buffer.from(await image.arrayBuffer());
    const { fields: extracted, usage } = await extractLabelFields(buffer, req.signal);
    const elapsed = Date.now() - started;
    const result = runVerificationEngine(parsed.data, extracted, elapsed, usage);
    return NextResponse.json(result);
  } catch (err) {
    const verifyErr = classifyError(err);
    if (verifyErr.status >= 500) {
      console.error("verify error", err);
    }
    return NextResponse.json(verifyErr.toJSON(), { status: verifyErr.status });
  }
}
