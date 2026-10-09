import type { AppError, ErrorCode, Result } from "./index";

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export function fail<T>(
  code: ErrorCode,
  message: string,
  retryable = false,
  detail?: AppError["detail"],
): Result<T> {
  return { ok: false, error: { code, message, retryable, ...(detail ? { detail } : {}) } };
}

export function storageFailure<T>(cause: unknown): Result<T> {
  const code = cause instanceof Error ? cause.message : "";
  return /SQLITE_FULL|database or disk is full|ENOSPC/i.test(code)
    ? fail("STORAGE_FULL", "Free storage, then retry.", true)
    : fail("DATA_INVALID", "Transit data could not be loaded or updated.", true);
}

