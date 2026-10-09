// Member 3 (UI-004): structured AppError display with the recovery actions each code allows.
import type { AppError, ErrorCode } from "../contracts";
import { AppButton, Notice, Small } from "./components/primitives";
import { useUi } from "./services";

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
      return withRetry(["edit_preferences"]);
    case "DATA_NOT_READY":
    case "DATA_INVALID":
    case "STORAGE_FULL":
      return withRetry(["setup"]);
    case "NETWORK_UNAVAILABLE":
    case "NETWORK_LIMIT":
    case "PERMISSION_DENIED":
      return withRetry(["manual"]);
    case "CANCELLED":
      return [];
  }
}

export function ErrorCard({
  error,
  handlers,
}: {
  error: AppError;
  handlers: Partial<Record<Recovery, () => void>>;
}) {
  const { t } = useUi();
  const labels: Record<Recovery, string> = {
    retry: t.retry,
    manual: t.chooseManually,
    edit_places: t.editPlaces,
    edit_preferences: t.editPreferences,
    setup: t.setupLink,
  };
  const actions = recoveriesFor(error.code, error.retryable).filter((r) => handlers[r]);
  const headline = t.errorMessages[error.code];
  const detail = error.detail;
  return (
    <Notice
      tone={error.code === "CANCELLED" ? "neutral" : "danger"}
      title={headline}
      actions={actions.map((r, i) => (
        <AppButton key={r} label={labels[r]} variant={i === 0 ? "primary" : "secondary"} onPress={handlers[r]!} />
      ))}
    >
      {error.message && error.message !== headline ? (
        <Small>
          {t.engineMessage}: {error.message}
        </Small>
      ) : null}
      {detail?.missingConnection ? <Small>{detail.missingConnection}</Small> : null}
      {detail?.field ? <Small>{detail.field}</Small> : null}
    </Notice>
  );
}
