"use client";

import dynamic from "next/dynamic";
import {
  Suspense,
  useCallback,
  useRef,
  useState,
  useTransition,
} from "react";
import { ApplicationForm } from "@/components/ApplicationForm";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useI18n } from "@/components/I18nProvider";
import type { ApplicationData } from "@/lib/types";
import type { ApiErrorBody, ErrorCode } from "@/lib/errors";
import type { BatchItem } from "@/components/BatchResultsTable";

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

interface ErrorState {
  code?: ErrorCode;
  message: string;
}

export default function BatchPage() {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [application, setApplication] = useState<ApplicationData>(EMPTY_APPLICATION);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(() => {
    setError(null);
    if (files.length === 0) {
      setError({ code: "no_images", message: t("error.no_images") });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    startTransition(async () => {
      setItems([]);
      try {
        const form = new FormData();
        form.append("application", JSON.stringify(application));
        for (const f of files) form.append("images", f);
        const res = await fetch("/api/verify/batch", {
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
        const data = (await res.json()) as { results: BatchItem[] };
        setItems(data.results);
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
  }, [files, application, t]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <div>
      <h1>{t("batch.heading")}</h1>
      <p className="lede">{t("batch.subheading")}</p>

      <div className="grid-2">
        <div className="card">
          <label htmlFor="images">{t("batch.drop_images")}</label>
          <input
            id="images"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            disabled={isPending}
          />
          {files.length > 0 ? (
            <p className="muted" style={{ marginTop: "var(--space-3)" }}>
              {files.length} files selected
            </p>
          ) : null}
        </div>
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
          disabled={isPending || files.length === 0}
        >
          {isPending ? t("action.verifying") : t("action.verify_batch")}
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

      {items.length > 0 ? (
        <Suspense fallback={<TableSkeleton />}>
          <BatchResultsTable items={items} />
        </Suspense>
      ) : null}
    </div>
  );
}
