"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { UploadZone } from "@/components/UploadZone";
import { ApplicationForm } from "@/components/ApplicationForm";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useI18n } from "@/components/I18nProvider";
import { ApplicationData, type VerificationResult } from "@/lib/types";
import type { ApiErrorBody, ErrorCode } from "@/lib/errors";
import { SAMPLE_APPLICATION, getSampleLabelFile } from "@/lib/sample";

const ResultView = dynamic(
  () => import("@/components/ResultView").then((m) => ({ default: m.ResultView })),
  {
    ssr: false,
    loading: () => <ResultSkeleton />,
  },
);

function ResultSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--card" style={{ marginTop: "var(--space-4)" }} />
    </div>
  );
}

const EMPTY_APPLICATION: ApplicationData = {
  brand_name: "",
  class_type: "",
  alcohol_content: "",
  net_contents: "",
  producer_name: "",
  producer_address: "",
  country_of_origin: "",
  beverage_type: "spirits",
};

class VerifyApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "VerifyApiError";
  }
}

interface VerifyVariables {
  file: File;
  application: ApplicationData;
  signal: AbortSignal;
}

async function postVerify({ file, application, signal }: VerifyVariables): Promise<VerificationResult> {
  const form = new FormData();
  form.append("image", file);
  form.append("application", JSON.stringify(application));
  const res = await fetch("/api/verify", { method: "POST", body: form, signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Partial<ApiErrorBody>;
    throw new VerifyApiError(body.error ?? "verification_failed", body.message ?? "Verification failed.");
  }
  return (await res.json()) as VerificationResult;
}

export default function HomePage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const form = useForm<ApplicationData>({
    resolver: zodResolver(ApplicationData),
    defaultValues: EMPTY_APPLICATION,
    mode: "onBlur",
  });

  const verify = useMutation<VerificationResult, Error, VerifyVariables>({
    mutationFn: postVerify,
  });

  const onSubmit = form.handleSubmit((application) => {
    if (!file) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    verify.mutate({ file, application, signal: controller.signal });
  });

  const reset = useCallback(() => {
    abortRef.current?.abort();
    verify.reset();
    setFile(null);
  }, [verify]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const loadSample = useCallback(async () => {
    try {
      const sampleFile = await getSampleLabelFile();
      setFile(sampleFile);
      form.reset(SAMPLE_APPLICATION);
    } catch {
      // Sample generation failed (no canvas, blocked) — swallow silently.
    }
  }, [form]);

  // Cmd/Ctrl+Enter submits from anywhere on the page (only while editing).
  useEffect(() => {
    if (verify.data) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!verify.isPending && file) onSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [verify.data, verify.isPending, file, onSubmit]);

  if (verify.data) {
    return (
      <Suspense fallback={<ResultSkeleton />}>
        <ResultView result={verify.data} file={file} onReset={reset} />
      </Suspense>
    );
  }

  const apiError: { code: ErrorCode; message: string } | null =
    verify.error instanceof VerifyApiError
      ? { code: verify.error.code, message: verify.error.message }
      : verify.error
        ? { code: "network_error", message: verify.error.message }
        : null;
  const triedToSubmitWithoutFile =
    !file && verify.isPaused === false && form.formState.submitCount > 0;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate>
        <h1>{t("app.title")}</h1>
        <p className="lede">{t("app.subtitle")}</p>

        <div className="grid-2">
          <UploadZone file={file} onChange={setFile} disabled={verify.isPending} />
          <ApplicationForm disabled={verify.isPending} />
        </div>

        {triedToSubmitWithoutFile ? (
          <ErrorMessage code="missing_image" severity="warning" />
        ) : null}

        {apiError ? (
          <ErrorMessage
            code={apiError.code}
            message={apiError.message}
            onRetry={apiError.code === "request_aborted" ? undefined : () => onSubmit()}
            onDismiss={() => verify.reset()}
            busy={verify.isPending}
          />
        ) : null}

        <div className="cta-row" style={{ gap: "var(--space-3)" }}>
          {!verify.isPending ? (
            <button
              type="button"
              onClick={loadSample}
              disabled={verify.isPending}
              title={t("action.try_sample_hint")}
            >
              {t("action.try_sample")}
            </button>
          ) : null}
          <button
            type="submit"
            className="primary"
            disabled={verify.isPending || !file}
            aria-keyshortcuts="Meta+Enter Control+Enter"
          >
            {verify.isPending ? (
              <>
                <span className="btn-spinner" aria-hidden />
                {t("action.verifying")}
              </>
            ) : (
              t("action.verify")
            )}
          </button>
          {verify.isPending ? (
            <button type="button" onClick={cancel}>
              {t("action.cancel")}
            </button>
          ) : null}
        </div>

        {verify.isPending ? (
          <div
            className="progress progress--indeterminate"
            role="progressbar"
            aria-label={t("action.verifying")}
            aria-busy="true"
            aria-live="polite"
          >
            <div className="progress__bar" />
          </div>
        ) : null}
      </form>
    </FormProvider>
  );
}
