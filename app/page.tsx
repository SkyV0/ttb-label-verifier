"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { ApplicationForm } from "@/components/ApplicationForm";
import { ResultView } from "@/components/ResultView";
import { useI18n } from "@/components/I18nProvider";
import type { ApplicationData, VerificationResult } from "@/lib/types";

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

export default function HomePage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [application, setApplication] = useState<ApplicationData>(EMPTY_APPLICATION);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!file) return setError(t("error.no_file"));
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("application", JSON.stringify(application));
      const res = await fetch("/api/verify", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? t("error.verification_failed"));
      }
      const data: VerificationResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.verification_failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setResult(null);
    setFile(null);
    setError(null);
  };

  if (result) {
    return <ResultView result={result} onReset={reset} />;
  }

  return (
    <div>
      <h1>{t("app.title")}</h1>
      <p className="muted" style={{ fontSize: 18 }}>{t("app.subtitle")}</p>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <UploadZone file={file} onChange={setFile} />
        <ApplicationForm value={application} onChange={setApplication} disabled={submitting} />
      </div>

      {error ? <div className="error-banner" role="alert">{error}</div> : null}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button type="button" className="primary" onClick={submit} disabled={submitting || !file}>
          {submitting ? t("action.verifying") : t("action.verify")}
        </button>
      </div>
    </div>
  );
}
