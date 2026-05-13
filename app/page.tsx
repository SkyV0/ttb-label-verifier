"use client";

import dynamic from "next/dynamic";
import {
  Suspense,
  useCallback,
  useRef,
  useState,
  useTransition,
} from "react";
import { UploadZone } from "@/components/UploadZone";
import { ApplicationForm } from "@/components/ApplicationForm";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useI18n } from "@/components/I18nProvider";
import type { ApplicationData, VerificationResult } from "@/lib/types";
import type { ApiErrorBody, ErrorCode } from "@/lib/errors";

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

interface ErrorState {
  code?: ErrorCode;
  message: string;
}

export default function HomePage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [application, setApplication] = useState<ApplicationData>(EMPTY_APPLICATION);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(() => {
    setError(null);
    if (!file) {
      setError({ code: "missing_image", message: t("error.no_file") });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("image", file);
        form.append("application", JSON.stringify(application));
        const res = await fetch("/api/verify", {
          method: "POST",
          body: form,
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as Partial<ApiErrorBody>;
          setError({
            code: body.error as ErrorCode | undefined,
            message: body.message ?? t("error.verification_failed"),
          });
          return;
        }
        const data: VerificationResult = await res.json();
        setResult(data);
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          setError({ code: "request_aborted", message: t("error.request_aborted") });
          return;
        }
        setError({
          code: "network_error",
          message: e instanceof Error ? e.message : t("error.network_error"),
        });
      }
    });
  }, [file, application, t]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setResult(null);
    setFile(null);
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  if (result) {
    return (
      <Suspense fallback={<ResultSkeleton />}>
        <ResultView result={result} onReset={reset} />
      </Suspense>
    );
  }

  return (
    <div>
      <h1>{t("app.title")}</h1>
      <p className="lede">{t("app.subtitle")}</p>

      <div className="grid-2">
        <UploadZone file={file} onChange={setFile} />
        <ApplicationForm value={application} onChange={setApplication} disabled={isPending} />
      </div>

      {error ? (
        <ErrorMessage
          code={error.code}
          message={error.code ? error.message : error.message}
          onRetry={error.code === "request_aborted" ? undefined : submit}
          onDismiss={() => setError(null)}
          busy={isPending}
        />
      ) : null}

      <div className="cta-row" style={{ gap: "var(--space-3)" }}>
        <button
          type="button"
          className="primary"
          onClick={submit}
          disabled={isPending || !file}
        >
          {isPending ? t("action.verifying") : t("action.verify")}
        </button>
        {isPending ? (
          <button type="button" onClick={cancel}>
            {t("action.cancel")}
          </button>
        ) : null}
      </div>

      {isPending ? (
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
    </div>
  );
}
