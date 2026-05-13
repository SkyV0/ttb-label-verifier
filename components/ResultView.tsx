"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n, type I18nKey } from "@/components/I18nProvider";
import type { FieldResult, FieldStatus, VerificationResult } from "@/lib/types";
import { citationUrl } from "@/lib/rag";

const STATUS_ICONS: Record<FieldStatus, string> = {
  match: "✓",
  fuzzy: "~",
  mismatch: "✕",
  missing: "—",
};

const STATUS_LABEL: Record<FieldStatus, I18nKey> = {
  match: "field_status.match",
  fuzzy: "field_status.fuzzy",
  mismatch: "field_status.mismatch",
  missing: "field_status.missing",
};

const FIELD_LABEL: Record<FieldResult["key"], I18nKey> = {
  brand_name: "form.brand_name",
  class_type: "form.class_type",
  alcohol_content: "form.alcohol_content",
  net_contents: "form.net_contents",
  producer_name: "form.producer_name",
  producer_address: "form.producer_address",
  country_of_origin: "form.country_of_origin",
  beverage_type: "form.beverage_type",
};

const FieldRow = memo(function FieldRow({ result }: { result: FieldResult }) {
  const { t } = useI18n();
  const statusLabel = t(STATUS_LABEL[result.status]);
  return (
    <div className="field-row" role="row">
      <div className="field-row__label" role="rowheader">
        {t(FIELD_LABEL[result.key])}
      </div>
      <div className="field-row__value" role="cell">
        {result.application || <span className="subtle">—</span>}
      </div>
      <div
        className={`field-row__icon status-${result.status}`}
        role="cell"
        aria-label={statusLabel}
        title={statusLabel}
      >
        {STATUS_ICONS[result.status]}
      </div>
      <div className="field-row__value" role="cell">
        {result.label || <span className="subtle">{t("field_status.missing")}</span>}
      </div>
      {result.note ? (
        <div className="field-row__note" role="note">
          {result.note}
        </div>
      ) : null}
    </div>
  );
});

const SourceThumb = memo(function SourceThumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!file.type.startsWith("image/")) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <div className="source-thumb" aria-label={t("upload.preview")}>
      {url ? (
        <img src={url} alt={file.name} />
      ) : (
        <div
          aria-hidden
          style={{
            width: 72,
            height: 72,
            display: "grid",
            placeItems: "center",
            background: "var(--bg-sunken)",
            color: "var(--text-subtle)",
            borderRadius: "var(--radius)",
            fontWeight: 600,
          }}
        >
          IMG
        </div>
      )}
      <div className="source-thumb__body">
        <div className="source-thumb__name">{file.name}</div>
        <div className="source-thumb__meta">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
      </div>
    </div>
  );
});

interface ResultViewProps {
  result: VerificationResult;
  onReset: () => void;
  /** Optional source image to render as a thumbnail above the verdict. */
  file?: File | null;
}

export const ResultView = memo(function ResultView({ result, onReset, file }: ResultViewProps) {
  const { t } = useI18n();
  const verdictRef = useRef<HTMLDivElement | null>(null);
  const [override, setOverride] = useState<{ reason: string } | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [reasonDraft, setReasonDraft] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  // Move focus to the verdict pill once it's visible. Screen-reader users get
  // the live-region announce; sighted keyboard users land on the headline.
  useEffect(() => {
    verdictRef.current?.focus();
  }, []);

  const summaryKey =
    result.verdict === "verified"
      ? "verdict.summary_verified"
      : result.verdict === "needs_review"
        ? "verdict.summary_review"
        : "verdict.summary_rejected";

  const canOverride = result.verdict !== "verified" && !override;

  const handleCopy = useCallback(async () => {
    const lines: string[] = [];
    lines.push(`Verdict: ${result.verdict.toUpperCase()}`);
    lines.push(`Elapsed: ${(result.elapsed_ms / 1000).toFixed(2)}s`);
    lines.push("");
    lines.push("Fields:");
    for (const f of result.fields) {
      lines.push(`  - ${f.key}: ${f.status} | app="${f.application}" | label="${f.label ?? ""}"`);
    }
    if (!result.warning.ok) {
      lines.push("");
      lines.push("Warning issues:");
      for (const r of result.warning.reasons) lines.push(`  - ${r}`);
    }
    if (result.citations.length > 0) {
      lines.push("");
      lines.push("Citations:");
      for (const c of result.citations) lines.push(`  - ${c.section}: ${c.title}`);
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      // Clipboard rejection (insecure context, denied permission) — fail quietly.
    }
  }, [result]);

  const elapsedDisplay = useMemo(() => {
    return result.elapsed_ms >= 1000
      ? t("verdict.elapsed", { seconds: (result.elapsed_ms / 1000).toFixed(1) })
      : t("usage.elapsed", { n: result.elapsed_ms });
  }, [result.elapsed_ms, t]);

  const submitOverride = useCallback(() => {
    if (!reasonDraft.trim()) return;
    setOverride({ reason: reasonDraft.trim() });
    setOverrideOpen(false);
  }, [reasonDraft]);

  return (
    <div>
      <div className="result-header">
        <button type="button" onClick={onReset} aria-label={t("action.new_label")}>
          ← {t("action.new_label")}
        </button>
        <div className="result-header__actions">
          <button type="button" onClick={handleCopy} aria-live="polite">
            {copyState === "copied" ? "✓ Copied" : "Copy result"}
          </button>
          {canOverride ? (
            <button
              type="button"
              onClick={() => {
                setOverrideOpen((open) => !open);
                setReasonDraft("");
              }}
              aria-expanded={overrideOpen}
            >
              {t("action.override_approve")}
            </button>
          ) : null}
        </div>
      </div>

      {file ? <SourceThumb file={file} /> : null}

      <div
        ref={verdictRef}
        className={`verdict ${override ? "verified" : result.verdict}`}
        role="status"
        aria-live="polite"
        tabIndex={-1}
      >
        {override
          ? t("verdict.verified")
          : t(`verdict.${result.verdict}` as I18nKey)}
      </div>
      <div className="verdict-summary">
        {override ? t("verdict.summary_verified") : t(summaryKey)}
      </div>

      {override ? (
        <div className="override-banner" role="status">
          <strong>{t("action.override_approve")}</strong>
          {override.reason}
        </div>
      ) : null}

      {overrideOpen && canOverride ? (
        <div className="override-panel">
          <h3>{t("action.override_reason")}</h3>
          <textarea
            value={reasonDraft}
            onChange={(e) => setReasonDraft(e.target.value)}
            placeholder={t("action.override_reason")}
            aria-label={t("action.override_reason")}
          />
          <div className="override-panel__row">
            <button type="button" onClick={() => setOverrideOpen(false)}>
              {t("action.dismiss")}
            </button>
            <button
              type="button"
              className="primary"
              onClick={submitOverride}
              disabled={!reasonDraft.trim()}
            >
              {t("action.override_approve")}
            </button>
          </div>
        </div>
      ) : null}

      <h2>{t("field.label")}</h2>
      <div className="field-table" role="table" aria-label="Field comparison">
        <div className="field-table-head" aria-hidden>
          <div>Field</div>
          <div>{t("field.application")}</div>
          <div />
          <div>{t("field.label")}</div>
        </div>
        {result.fields.map((f) => (
          <FieldRow key={f.key} result={f} />
        ))}
      </div>

      {!result.warning.ok ? (
        <div className="citations" role="alert">
          <h3>{t("field_status.warning_bad")}</h3>
          <ul style={{ margin: 0, paddingLeft: "var(--space-5)" }}>
            {result.warning.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {result.warning.detected ? (
            <details style={{ marginTop: "var(--space-3)" }}>
              <summary>Detected warning text</summary>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: "var(--font-size-sm)",
                  marginTop: "var(--space-2)",
                  background: "var(--bg-sunken)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                }}
              >
                {result.warning.detected}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}

      {result.citations.length > 0 ? (
        <div className="citations">
          <h3>Applicable regulations</h3>
          {result.citations.map((c) => {
            const url = citationUrl(c.section);
            return (
              <div key={c.section} className="citations__item">
                <div className="citations__section">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${c.section} on ecfr.gov in a new tab`}
                    >
                      {c.section} ↗
                    </a>
                  ) : (
                    c.section
                  )}
                </div>
                <div className="citations__title">{c.title}</div>
                <div className="citations__text">{c.text}</div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="usage-bar" aria-label="Token usage and cost">
        <span>{elapsedDisplay}</span>
        <span>{t("usage.tokens_in", { n: result.usage.input_tokens })}</span>
        <span>{t("usage.tokens_out", { n: result.usage.output_tokens })}</span>
        <span>{t("usage.cache_hit", { n: result.usage.cache_read_input_tokens })}</span>
        <span>{t("usage.cost", { n: result.usage.cost_usd.toFixed(4) })}</span>
      </div>

      <div className="cta-row">
        <button type="button" onClick={onReset}>
          {t("action.new_label")}
        </button>
      </div>
    </div>
  );
});
