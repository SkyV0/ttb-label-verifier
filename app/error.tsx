"use client";

import { useEffect } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useI18n } from "@/components/I18nProvider";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error("Route error boundary caught:", error);
  }, [error]);

  return (
    <div style={{ paddingTop: "var(--space-6)" }}>
      <ErrorMessage
        severity="error"
        message={t("error.boundary_title")}
        detail={error.message || t("error.boundary_detail")}
        onRetry={reset}
      />
    </div>
  );
}
