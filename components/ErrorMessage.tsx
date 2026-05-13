"use client";

import { memo } from "react";
import { useI18n, type I18nKey } from "./I18nProvider";
import type { ErrorCode } from "@/lib/errors";

type Severity = "error" | "warning" | "info";

interface Props {
  /** Typed error code — preferred. Renders a localized message. */
  code?: ErrorCode;
  /** Fallback / override message when no code is available. */
  message?: string;
  /** Additional context shown under the headline. */
  detail?: string;
  severity?: Severity;
  onRetry?: () => void;
  onDismiss?: () => void;
  /** When true, retry button is disabled (e.g. during in-flight retry). */
  busy?: boolean;
}

const SEVERITY_CLASS: Record<Severity, string> = {
  error: "error-banner error-banner--error",
  warning: "error-banner error-banner--warning",
  info: "error-banner error-banner--info",
};

const SEVERITY_ROLE: Record<Severity, "alert" | "status"> = {
  error: "alert",
  warning: "alert",
  info: "status",
};

function ErrorIcon({ severity }: { severity: Severity }) {
  if (severity === "info") {
    return (
      <svg
        className="error-banner__icon"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 8h.01M11 12h1v4h1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      className="error-banner__icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 3L2 20h20L12 3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4M12 17h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const ErrorMessage = memo(function ErrorMessage({
  code,
  message,
  detail,
  severity = "error",
  onRetry,
  onDismiss,
  busy,
}: Props) {
  const { t } = useI18n();

  const headline = code ? t(`error.${code}` as I18nKey) : (message ?? t("error.verification_failed"));
  // When both code and message are given, message becomes the detail row.
  const detailText = detail ?? (code && message ? message : undefined);

  return (
    <div className={SEVERITY_CLASS[severity]} role={SEVERITY_ROLE[severity]}>
      <ErrorIcon severity={severity} />
      <div className="error-banner__body">
        <div className="error-banner__title">{headline}</div>
        {detailText ? <div className="error-banner__detail">{detailText}</div> : null}
      </div>
      <div className="error-banner__actions">
        {onRetry ? (
          <button
            type="button"
            className="error-banner__retry"
            onClick={onRetry}
            disabled={busy}
          >
            {t("action.retry")}
          </button>
        ) : null}
        {onDismiss ? (
          <button
            type="button"
            className="error-banner__dismiss"
            onClick={onDismiss}
            aria-label={t("action.dismiss")}
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
});
