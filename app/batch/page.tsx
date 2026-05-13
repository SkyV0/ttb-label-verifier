"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ApplicationForm } from "@/components/ApplicationForm";
import { ErrorMessage } from "@/components/ErrorMessage";
import { MultiUploadZone } from "@/components/MultiUploadZone";
import { useI18n } from "@/components/I18nProvider";
import { ApplicationData } from "@/lib/types";
import type { ApiErrorBody, ErrorCode } from "@/lib/errors";
import type { BatchItem } from "@/components/BatchResultsTable";
import { SAMPLE_APPLICATION, getSampleBatchFiles } from "@/lib/sample";

const BatchResultsTable = dynamic(() => import("@/components/BatchResultsTable"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});

function TableSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" style={{ marginTop: "var(--space-5)" }}>
      <div className="skeleton skeleton--line" style={{ width: "40%" }} />
      <div className="skeleton skeleton--row" style={{ marginTop: "var(--space-4)" }} />
      <div className="skeleton skeleton--row" />
      <div className="skeleton skeleton--row" />
      <div className="skeleton skeleton--row" />
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

interface BatchVariables {
  files: File[];
  application: ApplicationData;
  signal: AbortSignal;
}

interface BatchResponse {
  results: BatchItem[];
}

async function postBatch({ files, application, signal }: BatchVariables): Promise<BatchResponse> {
  const form = new FormData();
  form.append("application", JSON.stringify(application));
  for (const f of files) form.append("images", f);
  const res = await fetch("/api/verify/batch", { method: "POST", body: form, signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Partial<ApiErrorBody>;
    throw new VerifyApiError(body.error ?? "verification_failed", body.message ?? "Verification failed.");
  }
  return (await res.json()) as BatchResponse;
}

export default function BatchPage() {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const form = useForm<ApplicationData>({
    resolver: zodResolver(ApplicationData),
    defaultValues: EMPTY_APPLICATION,
    mode: "onBlur",
  });

  const verify = useMutation<BatchResponse, Error, BatchVariables>({
    mutationFn: postBatch,
  });

  const onSubmit = form.handleSubmit((application) => {
    if (files.length === 0) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    verify.mutate({ files, application, signal: controller.signal });
  });

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const loadSample = useCallback(async () => {
    try {
      const sampleFiles = await getSampleBatchFiles();
      setFiles(sampleFiles);
      form.reset(SAMPLE_APPLICATION);
    } catch {
      // Sample generation failed (no canvas, etc.) — fail quietly.
    }
  }, [form]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!verify.isPending && files.length > 0) onSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [verify.isPending, files.length, onSubmit]);

  const apiError: { code: ErrorCode; message: string } | null =
    verify.error instanceof VerifyApiError
      ? { code: verify.error.code, message: verify.error.message }
      : verify.error
        ? { code: "network_error", message: verify.error.message }
        : null;
  const triedToSubmitWithoutFiles =
    files.length === 0 && form.formState.submitCount > 0;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate>
        <h1>{t("batch.heading")}</h1>
        <p className="lede">{t("batch.subheading")}</p>

        <div className="grid-2">
          <MultiUploadZone files={files} onChange={setFiles} disabled={verify.isPending} />
          <ApplicationForm disabled={verify.isPending} />
        </div>

        {triedToSubmitWithoutFiles ? (
          <ErrorMessage code="no_images" severity="warning" />
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
              {t("action.try_sample_batch")}
            </button>
          ) : null}
          <button
            type="submit"
            className="primary"
            disabled={verify.isPending || files.length === 0}
            aria-keyshortcuts="Meta+Enter Control+Enter"
          >
            {verify.isPending ? (
              <>
                <span className="btn-spinner" aria-hidden />
                {t("action.verifying")}
              </>
            ) : (
              t("action.verify_batch")
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

        {verify.data && verify.data.results.length > 0 ? (
          <Suspense fallback={<TableSkeleton />}>
            <BatchResultsTable items={verify.data.results} />
          </Suspense>
        ) : null}
      </form>
    </FormProvider>
  );
}
