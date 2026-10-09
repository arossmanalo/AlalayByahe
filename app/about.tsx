// Member 3 (UI-001): product disclosures, actual loaded coverage and model provenance.
import { Body, Card, Heading, Small } from "../src/ui/components/primitives";
import { Screen } from "../src/ui/components/Screen";
import { formatDate } from "../src/ui/format";
import { useReadiness, useUi } from "../src/ui/services";

export default function AboutScreen() {
  const { t, services } = useUi();
  const { pack } = useReadiness();
  const manifest = services.modelManifest;
  const loaded = pack.status === "loaded" && pack.result.ok ? pack.result.value : null;

  return (
    <Screen title={t.aboutTitle}>
      <Card>
        <Body>{t.aboutWhat}</Body>
        <Body>{t.aboutAi}</Body>
        <Body>{t.aboutRoutes}</Body>
        <Body>{t.aboutTracking}</Body>
        <Body>{t.aboutFares}</Body>
        <Body>{t.aboutOffline}</Body>
        <Body>{t.aboutPrivacy}</Body>
      </Card>

      <Card>
        <Heading level={2}>{t.coverageHeading}</Heading>
        {loaded && loaded.coverageLabels.length > 0 ? (
          loaded.coverageLabels.map((label) => <Body key={label}>• {label}</Body>)
        ) : (
          <Body>{t.coverageNone}</Body>
        )}
        {loaded ? <Small>{t.dataVersion(loaded.version, formatDate(loaded.createdAt))}</Small> : null}
        {loaded?.kind === "test_fixture" ? <Body>{t.testPackWarning}</Body> : null}
      </Card>

      {manifest ? (
        <Card>
          <Heading level={2}>{t.modelHeading}</Heading>
          <Small>{t.modelDetails(manifest.id, manifest.revision, manifest.license)}</Small>
        </Card>
      ) : null}
    </Screen>
  );
}
