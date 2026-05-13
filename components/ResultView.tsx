"use client";

import { useI18n, type I18nKey } from "./I18nProvider";
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
  return (
    <div className="field-row">
      <div className="field-row__label">{t(FIELD_LABEL[result.key])}</div>
      <div className="field-row__value">{result.application || <span className="muted">—</span>}</div>
      <div className={`field-row__icon status-${result.status}`} aria-label={t(STATUS_LABEL[result.status])} title={t(STATUS_LABEL[result.status])}>
        {STATUS_ICONS[result.status]}
      </div>
      <div className="field-row__value">{result.label || <span className="muted">{t("field_status.missing")}</span>}</div>
      {result.note ? <div className="field-row__note">{result.note}</div> : null}
    </div>
  );
}

export function ResultView({ result, onReset }: { result: VerificationResult; onReset: () => void }) {
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
      <div className="field-table" role="table">
        <div className="field-row" style={{ background: "var(--bg-muted)", fontWeight: 600 }} aria-hidden>
          <div className="field-row__label">Field</div>
          <div>{t("field.application")}</div>
          <div />
          <div>{t("field.label")}</div>
        </div>
        {result.fields.map((f) => (
          <FieldRow key={f.key} result={f} />
        ))}
      </div>

      {!result.warning.ok ? (
        <div className="citations">
          <h3>{t("field_status.warning_bad")}</h3>
          <ul style={{ margin: "0 0 12px 18px", padding: 0 }}>
            {result.warning.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {result.warning.detected ? (
            <details>
              <summary>Detected warning text</summary>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 8 }}>{result.warning.detected}</pre>
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

      <div className="usage-bar" aria-label="Token usage">
        <span>{t("usage.elapsed", { n: result.elapsed_ms })}</span>
        <span>{t("usage.tokens_in", { n: result.usage.input_tokens })}</span>
        <span>{t("usage.tokens_out", { n: result.usage.output_tokens })}</span>
        <span>{t("usage.cache_hit", { n: result.usage.cache_read_input_tokens })}</span>
        <span>{t("usage.cost", { n: result.usage.cost_usd.toFixed(4) })}</span>
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <button type="button" onClick={onReset}>
          {t("action.new_label")}
        </button>
      </div>
    </div>
  );
}
