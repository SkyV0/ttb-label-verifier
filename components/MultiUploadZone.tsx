"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useI18n } from "@/components/I18nProvider";
import { MAX_BATCH_SIZE } from "@/lib/errors";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  disabled?: boolean;
  /** Hard cap. Defaults to MAX_BATCH_SIZE so the UI never lets the user
   *  build a payload the API will reject. */
  max?: number;
}

function fileKey(f: File): string {
  return `${f.name}::${f.size}::${f.lastModified}`;
}

export function MultiUploadZone({
  files,
  onChange,
  accept = "image/png,image/jpeg,image/webp,image/gif",
  disabled = false,
  max = MAX_BATCH_SIZE,
}: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // One blob URL per file, keyed by content identity so re-renders don't
  // churn URLs. Revoked when the file is removed or the component unmounts.
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const seen = new Set(files.map(fileKey));
    setPreviews((prev) => {
      const next = new Map(prev);
      for (const [k, url] of prev) {
        if (!seen.has(k)) {
          URL.revokeObjectURL(url);
          next.delete(k);
        }
      }
      for (const f of files) {
        const k = fileKey(f);
        if (!next.has(k) && f.type.startsWith("image/")) {
          next.set(k, URL.createObjectURL(f));
        }
      }
      return next;
    });
    // Cleanup on unmount runs once with current prev — handled by the next
    // call's revoke loop, plus the explicit cleanup below.
  }, [files]);

  useEffect(() => {
    return () => {
      setPreviews((prev) => {
        for (const url of prev.values()) URL.revokeObjectURL(url);
        return new Map();
      });
    };
  }, []);

  const totalBytes = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);

  const addFiles = useCallback(
    (incoming: File[]) => {
      if (incoming.length === 0) return;
      const existing = new Map(files.map((f) => [fileKey(f), f]));
      for (const f of incoming) existing.set(fileKey(f), f);
      const merged = Array.from(existing.values()).slice(0, max);
      onChange(merged);
    },
    [files, max, onChange],
  );

  const removeOne = useCallback(
    (key: string) => {
      onChange(files.filter((f) => fileKey(f) !== key));
    },
    [files, onChange],
  );

  const clearAll = useCallback(() => onChange([]), [onChange]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const list = Array.from(e.dataTransfer.files ?? []);
    if (list.length) addFiles(list);
  };

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    addFiles(list);
    // Reset the input so re-selecting the same file fires a change event.
    e.target.value = "";
  };

  const atCap = files.length >= max;

  return (
    <div className="card multi-upload">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        className={`dropzone dropzone--compact${dragging ? " active" : ""}${disabled ? " disabled" : ""}`}
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
        aria-label={t("batch.drop_images")}
      >
        <div style={{ fontSize: "var(--font-size-lg)", fontWeight: 600 }}>
          {dragging ? t("upload.dropzone_active") : t("batch.drop_images")}
        </div>
        <div className="dropzone__hint">{t("upload.accepted_types")}</div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={onInput}
          className="sr-only"
          tabIndex={-1}
          disabled={disabled}
        />
      </div>

      {files.length > 0 ? (
        <div className="multi-upload__meta">
          <span>
            {files.length} / {max} · {(totalBytes / 1024 / 1024).toFixed(2)} MB
          </span>
          {atCap ? <span className="muted">— at cap</span> : null}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={clearAll} disabled={disabled}>
            {t("upload.remove")}
          </button>
        </div>
      ) : null}

      {files.length > 0 ? (
        <ul className="multi-upload__grid" aria-label={t("batch.drop_images")}>
          {files.map((f) => {
            const k = fileKey(f);
            const url = previews.get(k);
            return (
              <li key={k} className="multi-upload__tile">
                {url ? (
                  <img src={url} alt={f.name} loading="lazy" />
                ) : (
                  <div className="multi-upload__tile-placeholder">IMG</div>
                )}
                <div className="multi-upload__tile-name" title={f.name}>
                  {f.name}
                </div>
                <button
                  type="button"
                  className="multi-upload__tile-remove"
                  aria-label={`${t("upload.remove")} ${f.name}`}
                  onClick={() => removeOne(k)}
                  disabled={disabled}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
