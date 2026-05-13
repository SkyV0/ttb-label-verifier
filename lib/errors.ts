/**
 * Typed error categories for the verify API + client UI.
 *
 * Each code maps to an i18n key under `error.<code>` so the UI can render a
 * localized message without leaking server stack traces. `status` is the HTTP
 * code the API route should respond with.
 */

export type ErrorCode =
  | "missing_image"
  | "missing_application"
  | "invalid_application"
  | "invalid_file_type"
  | "image_too_large"
  | "no_images"
  | "too_many_images"
  | "extraction_failed"
  | "rate_limited"
  | "upstream_error"
  | "network_error"
  | "request_aborted"
  | "verification_failed";

export interface ApiErrorBody {
  error: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export class VerifyError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    status = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "VerifyError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toJSON(): ApiErrorBody {
    return { error: this.code, message: this.message, details: this.details };
  }
}

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_BATCH_SIZE = 300;

export const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export function isAllowedFileType(file: File): boolean {
  if (ALLOWED_MIME_TYPES.has(file.type)) return true;
  // Some browsers report an empty MIME for dragged files — fall back to extension.
  const ext = file.name.toLowerCase().split(".").pop();
  return ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp" || ext === "gif" || ext === "pdf";
}

/**
 * Categorize an unknown thrown value into a VerifyError. Distinguishes
 * Anthropic SDK errors (rate-limit / overloaded / 5xx) from local failures.
 */
export function classifyError(err: unknown): VerifyError {
  if (err instanceof VerifyError) return err;

  if (err instanceof Error) {
    const msg = err.message;
    // Anthropic SDK error shapes — see @anthropic-ai/sdk
    const status = (err as { status?: number }).status;
    if (status === 429 || /rate.?limit/i.test(msg)) {
      return new VerifyError("rate_limited", "Upstream rate-limited the request.", 503);
    }
    if (status === 529 || /overloaded/i.test(msg)) {
      return new VerifyError("upstream_error", "Upstream is temporarily overloaded.", 503);
    }
    if (status && status >= 500) {
      return new VerifyError("upstream_error", msg, 502);
    }
    if (/tool_use|did not return/i.test(msg)) {
      return new VerifyError("extraction_failed", msg, 502);
    }
    return new VerifyError("verification_failed", msg, 500);
  }

  return new VerifyError("verification_failed", "An unknown error occurred.", 500);
}
