// Member 3 (UI-004): AI and transit-data readiness, shown separately (AGENTS.md: separate readiness).
import type { ModelState } from "../contracts";
import { AppButton, Body, Card, Heading, ProgressBar, Row, Small, StatusPill } from "./components/primitives";
import { ErrorCard } from "./error-card";
import { formatDate } from "./format";
import { useReadiness, useUi } from "./services";
import type { Tone } from "./theme";

function modelTone(state: ModelState): Tone {
  if (state.phase === "ready") return "success";
  if (state.phase === "failed") return "danger";
  if (state.phase === "absent") return "warning";
  return "info";
}

function formatBytes(bytes: number): string {
  // Decimal megabytes, matching the contract's "491.4 MB".
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** Compact two-pill summary for the home screen. */
export function ReadinessSummary({ onOpenSetup }: { onOpenSetup: () => void }) {
  const { t } = useUi();
  const { modelState, pack } = useReadiness();
  const dataOk = pack.status === "loaded" && pack.result.ok;
  return (
    <Card>
      <Row>
        <Small>{t.aiLabel}:</Small>
        <StatusPill tone={modelTone(modelState)} label={t.aiPhase[modelState.phase]} />
      </Row>
      <Row>
        <Small>{t.dataLabel}:</Small>
        {pack.status === "loading" ? (
          <StatusPill tone="info" label={t.loading} />
        ) : (
          <StatusPill tone={dataOk ? "success" : "danger"} label={dataOk ? t.dataReady : t.dataNotReady} />
        )}
      </Row>
      <AppButton label={t.setupLink} variant="link" onPress={onOpenSetup} />
    </Card>
  );
}

/** Full model state with explicit download action, progress and retry. */
export function ModelReadinessCard({ onManual }: { onManual: () => void }) {
  const { t, services } = useUi();
  const { modelState, startModelSetup } = useReadiness();
  const manifest = services.modelManifest;
  const start = () => void startModelSetup();

  let body = null;
  switch (modelState.phase) {
    case "absent":
      body = (
        <>
          <Body>{manifest ? t.modelAbsentBody(formatBytes(manifest.bytes)) : t.modelAbsentBodyUnknownSize}</Body>
          <AppButton label={t.downloadModel} onPress={start} />
          <AppButton label={t.chooseManually} variant="secondary" onPress={onManual} />
        </>
      );
      break;
    case "downloading":
      body = (
        <>
          <Body>{t.modelDownloading}</Body>
          <ProgressBar progress={modelState.progress} label={t.modelDownloading} />
          {modelState.progress !== null ? (
            <Small>{t.modelProgress(Math.floor(modelState.progress * 100))}</Small>
          ) : null}
        </>
      );
      break;
    case "checking":
      body = (
        <>
          <Body>{t.modelChecking}</Body>
          <ProgressBar progress={modelState.progress} label={t.modelChecking} />
        </>
      );
      break;
    case "initializing":
      body = (
        <>
          <Body>{t.modelInitializing}</Body>
          <ProgressBar progress={modelState.progress} label={t.modelInitializing} />
        </>
      );
      break;
    case "ready":
      body = <Body>{t.modelReady(modelState.modelId)}</Body>;
      break;
    case "failed":
      body = <ErrorCard error={modelState.error} handlers={{ retry: start, setup: start, manual: onManual }} />;
      break;
  }

  return (
    <Card>
      <Heading level={2}>{t.modelSection}</Heading>
      <StatusPill tone={modelTone(modelState)} label={t.aiPhase[modelState.phase]} />
      {body}
      {(modelState.phase === "downloading" || modelState.phase === "checking")
        && services.cancelModelSetup ? <AppButton label={t.cancel} variant="secondary" onPress={services.cancelModelSetup} /> : null}
      {manifest ? <Small>{t.modelDetails(manifest.id, manifest.revision, manifest.license)}</Small> : null}
    </Card>
  );
}

/** Transit pack status, independent of AI. A test fixture pack is labeled as such. */
export function DataReadinessCard() {
  const { t } = useUi();
  const { pack, reloadPack } = useReadiness();
  return (
    <Card>
      <Heading level={2}>{t.dataSection}</Heading>
      {pack.status === "loading" ? (
        <StatusPill tone="info" label={t.loading} />
      ) : pack.result.ok ? (
        <>
          <StatusPill tone={pack.result.value.kind === "test_fixture" ? "fixture" : "success"} label={t.dataReady} />
          {pack.result.value.kind === "test_fixture" ? <Body>{t.testPackWarning}</Body> : null}
          <Small>{t.dataVersion(pack.result.value.version, formatDate(pack.result.value.createdAt))}</Small>
          <Heading level={3}>{t.coverageHeading}</Heading>
          {pack.result.value.coverageLabels.length === 0 ? (
            <Body>{t.coverageNone}</Body>
          ) : (
            pack.result.value.coverageLabels.map((label) => <Body key={label}>• {label}</Body>)
          )}
        </>
      ) : (
        <ErrorCard error={pack.result.error} handlers={{ retry: () => void reloadPack() }} />
      )}
    </Card>
  );
}
