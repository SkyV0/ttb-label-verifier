"use client";

import { useI18n, type I18nKey } from "@/components/I18nProvider";
import type { FieldResult, FieldStatus, VerificationResult } from "@/lib/types";

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

function FieldRow({ result }: { result: FieldResult }) {
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
}

export function ResultView({
  result,
  onReset,
}: {
  result: VerificationResult;
  onReset: () => void;
}) {
  const { t } = useI18n();
  const summaryKey =
    result.verdict === "verified"
      ? "verdict.summary_verified"
      : result.verdict === "needs_review"
        ? "verdict.summary_review"
        : "verdict.summary_rejected";

  return (
    <div>
      <div className={`verdict ${result.verdict}`} role="status">
        {t(`verdict.${result.verdict}` as I18nKey)}
      </div>
      <div className="verdict-summary">{t(summaryKey)}</div>

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
          {result.citations.map((c) => (
            <div key={c.section} className="citations__item">
              <div className="citations__section">{c.section}</div>
              <div className="citations__title">{c.title}</div>
              <div className="citations__text">{c.text}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="usage-bar" aria-label="Token usage and cost">
        <span>{t("usage.elapsed", { n: result.elapsed_ms })}</span>
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
}
