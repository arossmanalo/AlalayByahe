import type { AppError, ErrorCode, Result } from "../contracts";

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(
  code: ErrorCode,
  message: string,
  retryable: boolean,
  detail?: AppError["detail"],
): Result<T> {
  const error: AppError = detail ? { code, message, retryable, detail } : { code, message, retryable };
  return { ok: false, error };
}

// User-facing copy follows the edge-case matrix (EC-0xx) wording.
export const AI_MESSAGES = {
  notReady: "Download the AI model when connected, or choose places manually.",
  initFailed: "AI is unavailable. Manual planning is available.",
  incompatible: "AI resources need a compatible update.",
  invalidOutput: "AI could not read that request. Try again or choose places.",
  incomplete: "AI response was incomplete. Retry or choose manually.",
  timeout: "AI took too long. You can choose places manually.",
  cancelled: "Query cancelled. You can try again.",
  tooLong: "Please shorten your query to 600 characters.",
  emptyQuery: "Enter an origin and destination.",
  integrity: "Model integrity check failed. Retry download.",
  storageFull: "Free storage, then retry.",
  downloadInterrupted: "Download paused or interrupted.",
} as const;
