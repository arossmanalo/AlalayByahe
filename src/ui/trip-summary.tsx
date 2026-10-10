// Trip summary card (AI written from the verified route, user-approved 2026-10-10).
// The same option shows the same summary whether the trip was typed or picked manually: one request per
// option and language, cached for the session. The numbered steps below stay the authority.
import { useEffect, useState } from "react";
import type { JourneyOption, Result, RouteRequest } from "../contracts";
import type { TripSummary } from "../ai/summary";
import { StyleSheet, View } from "react-native";
import { Body, Footnote, ListGroup, ProgressBar } from "./components/primitives";
import { useUi } from "./services";

const cache = new Map<string, Promise<Result<TripSummary>>>();

export function summaryKey(option: JourneyOption, request: Pick<RouteRequest, "origin" | "destination">, language: string): string {
  return [option.id, option.datasetVersion, request.origin.placeId, request.destination.placeId, language].join("|");
}

export function TripSummaryCard({ option, request }: { option: JourneyOption; request: RouteRequest | null }) {
  const { t, services, language } = useUi();
  const [summary, setSummary] = useState<TripSummary | null>(null);
  const summarize = services.summarizeTrip;

  useEffect(() => {
    if (!summarize || !request) return;
    let alive = true;
    setSummary(null);
    const key = summaryKey(option, request, language);
    let pending = cache.get(key);
    if (!pending) {
      pending = summarize({ queryId: `summary_${option.id}_${language}`, option, request, language });
      cache.set(key, pending);
    }
    void pending.then((result) => {
      if (!result.ok) cache.delete(key); // cancelled (for example by backgrounding): try again next time
      if (alive && result.ok) setSummary(result.value);
    });
    return () => { alive = false; };
  }, [summarize, option, request, language]);

  if (!summarize || !request) return null;
  return (
    <ListGroup header={t.summaryHeading}>
      <View style={styles.block}>
        {summary === null ? (
          <>
            <Footnote>{t.summaryWriting}</Footnote>
            <ProgressBar progress={null} label={t.summaryWriting} />
          </>
        ) : (
          <>
            <Body>{summary.text}</Body>
            <Footnote>
              {summary.source === "phone_ai" && summary.engine
                ? t.summaryByAi(summary.engine.modelId)
                : `${t.summaryFromData}${summary.fallbackReason ? ` ${t.summaryFallback[summary.fallbackReason]}` : ""}`}
            </Footnote>
          </>
        )}
      </View>
    </ListGroup>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
});
