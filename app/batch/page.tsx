"use client";

import { useMemo, useState } from "react";
import { ApplicationForm } from "@/components/ApplicationForm";
import { useI18n, type I18nKey } from "@/components/I18nProvider";
import type { ApplicationData, VerificationResult, Verdict } from "@/lib/types";

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

interface BatchItem {
  filename: string;
  result?: VerificationResult;
  error?: string;
}

export default function BatchPage() {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [application, setApplication] = useState<ApplicationData>(EMPTY_APPLICATION);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [filter, setFilter] = useState<"all" | "flagged">("all");
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const c = { verified: 0, needs_review: 0, rejected: 0 } as Record<Verdict, number>;
    for (const it of items) {
      if (it.result) c[it.result.verdict] += 1;
    }
    return c;
  }, [items]);

  const visible = useMemo(() => {
    if (filter === "flagged") return items.filter((i) => i.result && i.result.verdict !== "verified");
    return items;
  }, [items, filter]);

  const submit = async () => {
    setError(null);
    if (files.length === 0) return setError(t("error.no_file"));
    setSubmitting(true);
    setItems([]);
    try {
      const form = new FormData();
      form.append("application", JSON.stringify(application));
      for (const f of files) form.append("images", f);
      const res = await fetch("/api/verify/batch", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? t("error.verification_failed"));
      }
      const data = (await res.json()) as { results: BatchItem[] };
      setItems(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.verification_failed"));
    } finally {
      setSubmitting(false);
    }
  };

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
            disabled={submitting}
          />
          {files.length > 0 ? (
            <p className="muted" style={{ marginTop: "var(--space-3)" }}>
              {files.length} files selected
            </p>
          ) : null}
        </div>
        <ApplicationForm value={application} onChange={setApplication} disabled={submitting} />
      </div>

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      <div className="cta-row">
        <button type="button" className="primary" onClick={submit} disabled={submitting || files.length === 0}>
          {submitting ? t("action.verifying") : t("action.verify_batch")}
        </button>
      </div>

      {submitting ? (
        <div className="progress progress--indeterminate" aria-hidden>
          <div className="progress__bar" />
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="batch-summary">
            <div className="batch-stat verified">
              <div className="batch-stat__value">{summary.verified}</div>
              <div className="batch-stat__label">{t("verdict.verified")}</div>
            </div>
            <div className="batch-stat needs_review">
              <div className="batch-stat__value">{summary.needs_review}</div>
              <div className="batch-stat__label">{t("verdict.needs_review")}</div>
            </div>
            <div className="batch-stat rejected">
              <div className="batch-stat__value">{summary.rejected}</div>
              <div className="batch-stat__label">{t("verdict.rejected")}</div>
            </div>
          </div>

          <div className="batch-controls">
            <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              {t("batch.filter_all")}
            </button>
            <button type="button" aria-pressed={filter === "flagged"} onClick={() => setFilter("flagged")}>
              {t("batch.filter_flagged")}
            </button>
          </div>

          <div className="batch-table-wrap">
            <table className="batch-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Verdict</th>
                  <th>Issues</th>
                  <th>Elapsed</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item, idx) => {
                  if (item.error) {
                    return (
                      <tr key={idx}>
                        <td>{item.filename}</td>
                        <td className="batch-row-status rejected">ERROR</td>
                        <td>{item.error}</td>
                        <td>—</td>
                      </tr>
                    );
                  }
                  const r = item.result!;
                  const issues = r.fields.filter((f) => f.status !== "match").map((f) => f.key).join(", ");
                  return (
                    <tr key={idx}>
                      <td>{item.filename}</td>
                      <td className={`batch-row-status ${r.verdict}`}>{t(`verdict.${r.verdict}` as I18nKey)}</td>
                      <td>{r.warning.ok ? issues || "—" : "Warning + " + issues}</td>
                      <td>{r.elapsed_ms} ms</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
