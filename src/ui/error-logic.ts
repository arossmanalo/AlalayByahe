// Member 3 (UI-004/UI-006): pure error-recovery rules. No React or native imports so tests/ui can run them.
import type { AppError, ErrorCode } from "../contracts";

export type Recovery = "retry" | "manual" | "edit_places" | "edit_preferences" | "setup";

/** Recovery choices per error. The UI offers changes; it never relaxes a constraint by itself. */
export function recoveriesFor(code: ErrorCode, retryable: boolean): Recovery[] {
  const withRetry = (list: Recovery[]): Recovery[] => (retryable ? ["retry", ...list] : list);
  switch (code) {
    case "AI_NOT_READY":
      return ["setup", "manual"];
    case "AI_INIT_FAILED":
    case "AI_INVALID_OUTPUT":
    case "AI_TIMEOUT":
      return withRetry(["manual"]);
    case "INVALID_INPUT":
    case "NEEDS_CLARIFICATION":
    case "PLACE_NOT_FOUND":
    case "OUTSIDE_COVERAGE":
    case "NO_VERIFIED_JOURNEY":
      return withRetry(["edit_places"]);
    case "CONSTRAINT_UNSATISFIED":
      return ["edit_preferences", "edit_places"];
    case "SEARCH_LIMIT_REACHED":
      // EC-043: a narrower journey means stricter preferences or closer places.
      return withRetry(["edit_preferences", "edit_places"]);
    case "DATA_NOT_READY":
    case "DATA_INVALID":
    case "STORAGE_FULL":
      return withRetry(["setup"]);
    case "NETWORK_UNAVAILABLE":
    case "NETWORK_LIMIT":
    case "PERMISSION_DENIED":
      return withRetry(["manual"]);
    case "CANCELLED":
      return withRetry([]);
  }
}

const SUPERSEDED_MESSAGE = "Superseded by a newer request.";

/** Result for a job the user cancelled or a newer request replaced. Screens stay silent about it. */
export function supersededError(): { ok: false; error: AppError } {
  return { ok: false, error: { code: "CANCELLED", message: SUPERSEDED_MESSAGE, retryable: true } };
}

/**
 * Whether a failed job should be reported. A cancellation the user did not ask for, such as the
 * app going to the background mid-query, is shown so the user knows to try again (EC-102).
 */
export function shouldShowError(error: AppError): boolean {
  return !(error.code === "CANCELLED" && error.message === SUPERSEDED_MESSAGE);
}
