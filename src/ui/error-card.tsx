// Member 3 (UI-004): structured AppError display with the recovery actions each code allows.
import type { AppError } from "../contracts";
import { AppButton, Notice, Small } from "./components/primitives";
import { recoveriesFor, type Recovery } from "./error-logic";
import { useUi } from "./services";

export { recoveriesFor, type Recovery } from "./error-logic";

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
