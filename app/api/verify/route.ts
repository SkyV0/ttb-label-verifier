import { NextResponse } from "next/server";
import { ApplicationData } from "@/lib/types";
import { extractLabelFields } from "@/lib/extract";
import { runVerificationEngine } from "@/lib/verify";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const started = Date.now();
  try {
    const form = await req.formData();
    const image = form.get("image");
    const applicationRaw = form.get("application");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "missing_image" }, { status: 400 });
    }
    if (typeof applicationRaw !== "string") {
      return NextResponse.json({ error: "missing_application" }, { status: 400 });
    }

    const application = ApplicationData.parse(JSON.parse(applicationRaw));
    const buffer = Buffer.from(await image.arrayBuffer());

    const { fields: extracted, usage } = await extractLabelFields(buffer);
    const elapsed = Date.now() - started;
    const result = runVerificationEngine(application, extracted, elapsed, usage);

    return NextResponse.json(result);
  } catch (err) {
    console.error("verify error", err);
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ error: "verification_failed", message }, { status: 500 });
  }
}
