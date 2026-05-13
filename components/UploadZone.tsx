"use client";

import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useI18n } from "./I18nProvider";

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
}

export function UploadZone({ file, onChange, accept = "image/*,application/pdf" }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const setPreview = useCallback((f: File | null) => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null;
    });
  }, []);

  const handleFile = useCallback(
    (f: File | null) => {
      onChange(f);
      setPreview(f);
    },
    [onChange, setPreview],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
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
            <div className="preview-img" style={{ display: "grid", placeItems: "center", color: "var(--text-muted)" }}>
              PDF
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{file.name}</div>
            <div className="muted">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            <button type="button" style={{ marginTop: 12 }} onClick={() => handleFile(null)}>
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
      tabIndex={0}
      className={`dropzone${dragging ? " active" : ""}`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div style={{ fontSize: 20, fontWeight: 600 }}>
        {dragging ? t("upload.dropzone_active") : t("upload.dropzone_idle")}
      </div>
      <div className="dropzone__hint">{t("upload.accepted_types")}</div>
      <input ref={inputRef} type="file" accept={accept} onChange={onInput} style={{ display: "none" }} />
    </div>
  );
}
