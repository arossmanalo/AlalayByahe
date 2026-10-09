// Member 1 (AI-001/004/005): development-only AI diagnostics, reached by deep link
// alalaybyahe://dev-ai. Not linked from product screens. Disabled in release
// builds unless the build sets EXPO_PUBLIC_AI_DIAGNOSTICS=1 for a benchmark APK.
import { useState } from "react";
import { Text } from "react-native";
import { HELD_OUT_CORPUS } from "../src/ai/corpus";
import {
  APP_QUERY_LOCALE,
  runBenchmark,
  runLifecycleChecks,
  runProbeStep,
  type DiagnosticsDeps,
} from "../src/ai/diagnostics";
import type { AiManager } from "../src/ai/manager";
import { createPhoneModelStore, createPhoneRuntime } from "../src/ai/phone";
import { useApplication } from "../src/application/react-context";
import { AppButton, Body, Card, Heading, LabeledInput, Small } from "../src/ui/components/primitives";
import { Screen } from "../src/ui/components/Screen";

const ENABLED = __DEV__ || process.env.EXPO_PUBLIC_AI_DIAGNOSTICS === "1";
const LOG_TAG = "[AI-DIAG]";

function asManager(ai: unknown): AiManager | null {
  const candidate = ai as Partial<AiManager>;
  return typeof candidate.observeCompletions === "function" && typeof candidate.release === "function"
    ? (candidate as AiManager)
    : null;
}

export default function DevAiScreen() {
  const { services } = useApplication();
  const manager = asManager(services.ai);
  const [platformLabel, setPlatformLabel] = useState("");
  const [probeText, setProbeText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [output, setOutput] = useState("");

  if (!ENABLED || !manager) {
    return (
      <Screen title="AI diagnostics">
        <Card>
          <Body>{!ENABLED ? "AI diagnostics are disabled in this build." : "The real AI manager is not wired."}</Body>
        </Card>
      </Screen>
    );
  }
  const ai = manager;

  const deps = (): DiagnosticsDeps => ({
    ai,
    createProbeTarget: () => ({ runtime: createPhoneRuntime(), store: createPhoneModelStore() }),
    platformLabel: platformLabel.trim() || "unlabelled device",
  });

  async function run(name: string, work: () => Promise<unknown>) {
    setBusy(name);
    setProgress("");
    setOutput("");
    try {
      const report = await work();
      const json = JSON.stringify(report, null, 2);
      setOutput(json);
      // Copy from logcat: adb logcat -s ReactNativeJS | findstr AI-DIAG
      console.log(`${LOG_TAG} ${JSON.stringify(report)}`);
    } catch (e) {
      setOutput(`Diagnostics failed: ${String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen title="AI diagnostics">
      <Card>
        <Heading level={2}>Development only</Heading>
        <Small>
          Results stay on this device: shown below and written to the device log with {LOG_TAG}. Nothing is uploaded.
          Use an anonymized device label without serials or IMEI.
        </Small>
        <LabeledInput
          label="Device label"
          value={platformLabel}
          onChangeText={setPlatformLabel}
          placeholder="Android 14 / Realme 10 Pro+ 5G"
        />
      </Card>

      <Card>
        <Heading level={2}>AI-001 native probe</Heading>
        <Small>Releases the app model, loads it once more for one fresh completion, then reloads the app model.</Small>
        <LabeledInput
          label="Fresh query typed on this device"
          value={probeText}
          onChangeText={setProbeText}
          multiline
        />
        <AppButton
          label="Run native probe"
          busy={busy === "probe"}
          disabled={busy !== null || probeText.trim().length === 0}
          onPress={() => void run("probe", () => runProbeStep(deps(), probeText.trim()))}
        />
      </Card>

      <Card>
        <Heading level={2}>AI-005 corpus benchmark</Heading>
        <Small>
          {HELD_OUT_CORPUS.cases.length} held-out cases (corpus v{HELD_OUT_CORPUS.version}), sent with the app's locale
          ("{APP_QUERY_LOCALE}") like real queries. Cold-loads the model first; keep the screen on and note whether the phone
          is charging.
        </Small>
        <AppButton
          label="Run corpus benchmark"
          busy={busy === "bench"}
          disabled={busy !== null}
          onPress={() =>
            void run("bench", () =>
              runBenchmark(deps(), HELD_OUT_CORPUS, (done, total) => setProgress(`${done}/${total} cases`), "app"),
            )
          }
        />
        <AppButton
          label="Compare: per-case locale"
          variant="secondary"
          busy={busy === "bench_locale"}
          disabled={busy !== null}
          hint="Sends each case with its own en/fil/taglish value, for the locale decision only."
          onPress={() =>
            void run("bench_locale", () =>
              runBenchmark(deps(), HELD_OUT_CORPUS, (done, total) => setProgress(`${done}/${total} cases`), "per_case"),
            )
          }
        />
      </Card>

      <Card>
        <Heading level={2}>AI-004 lifecycle checks</Heading>
        <Small>Cancel mid-completion, rapid repeat queries and recovery. Background and kill/relaunch stay manual.</Small>
        <AppButton
          label="Run lifecycle checks"
          busy={busy === "lifecycle"}
          disabled={busy !== null}
          onPress={() => void run("lifecycle", () => runLifecycleChecks(deps()))}
        />
      </Card>

      {progress ? <Body>{progress}</Body> : null}
      {output ? (
        <Card>
          <Text selectable style={{ fontFamily: "monospace", fontSize: 11 }}>
            {output}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
