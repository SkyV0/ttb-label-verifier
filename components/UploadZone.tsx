"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useI18n } from "@/components/I18nProvider";

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
}

export function UploadZone({
  file,
  onChange,
  accept = "image/png,image/jpeg,image/webp,image/gif",
  disabled = false,
}: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Keep preview URL in sync with `file` and revoke when the URL changes or
  // the component unmounts. Without revocation the blob stays alive for the
  // life of the tab.
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = useCallback(
    (f: File | null) => {
      onChange(f);
    },
    [onChange],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) handleFile(f);
  };

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    handleFile(f);
  };

  if (file) {
    return (
      <div className="card">
        <div className="preview-row">
          {previewUrl ? (
            <img src={previewUrl} alt={t("upload.preview")} className="preview-img" />
          ) : (
            <div
              className="preview-img"
              style={{
                display: "grid",
                placeItems: "center",
                color: "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              IMG
            </div>
          )}
          <div className="stack">
            <div style={{ fontWeight: 600, fontSize: "var(--font-size-lg)" }}>{file.name}</div>
            <div className="subtle">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            <button type="button" onClick={() => handleFile(null)} disabled={disabled}>
              {t("upload.remove")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      className={`dropzone${dragging ? " active" : ""}${disabled ? " disabled" : ""}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      aria-label={t("upload.dropzone_idle")}
    >
      <span className="dropzone__icon" aria-hidden>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 16V4M12 4l-4 4M12 4l4 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="dropzone__title">
        {dragging ? t("upload.dropzone_active") : t("upload.dropzone_idle")}
      </div>
      <div className="dropzone__hint">{t("upload.accepted_types")}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onInput}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
      />
    </div>
  );
}
