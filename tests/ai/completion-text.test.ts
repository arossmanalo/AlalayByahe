import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractCompletionText } from "../../src/ai/completionText";
import { interpretCompletion } from "../../src/ai/extract";
import { outcome } from "./fakes";

// Raw `text` returned by llama.rn 0.12.9 on the Honor X9b (AI-001 probe run 2, 2026-10-10 04:46 PHT).
const DEVICE_RAW =
  '<|im_start|>assistant\n{"kind":"journey","originText":"none","destinationText":"EDSA station","useCurrentLocation":false,"allowedModes":["bus"],"excludedModes":[],"priority":null,"maxAccessWalkMeters":null,"maxTransferWalkMeters":null,"maxEgressWalkMeters":null,"budgetCentavos":null,"directOnly":false,"ambiguities":["home place unknown"]}';
const JSON_PART = DEVICE_RAW.slice(DEVICE_RAW.indexOf("{"));

describe("extractCompletionText (llama.rn chat header)", () => {
  it("uses llama.rn's parsed content when it is the JSON, keeping the raw text for evidence", () => {
    assert.deepEqual(extractCompletionText(DEVICE_RAW, JSON_PART), { text: JSON_PART, rawText: DEVICE_RAW });
  });

  it("strips exactly the assistant header when content is empty", () => {
    assert.deepEqual(extractCompletionText(DEVICE_RAW, ""), { text: JSON_PART, rawText: DEVICE_RAW });
    assert.deepEqual(extractCompletionText(DEVICE_RAW, undefined), { text: JSON_PART, rawText: DEVICE_RAW });
  });

  it("leaves clean output untouched", () => {
    assert.deepEqual(extractCompletionText(JSON_PART, JSON_PART), { text: JSON_PART });
    assert.deepEqual(extractCompletionText(JSON_PART, undefined), { text: JSON_PART });
  });

  it("does not rescue anything else: other prefixes still fail strict validation", () => {
    const junk = "Sure! " + JSON_PART;
    const picked = extractCompletionText(junk, "Sure!");
    assert.equal(picked.text, junk);
    const r = interpretCompletion(outcome(picked.text), {
      queryId: "q", text: "Paano ako makakarating sa Taft galing EDSA station, walang bus", locale: "taglish", knownPlaceLabels: [],
    });
    assert.equal(r.ok, false);
  });

  it("the device output now reaches semantic checks instead of failing as non-JSON", () => {
    const picked = extractCompletionText(DEVICE_RAW, undefined);
    const r = interpretCompletion(outcome(picked.text), {
      queryId: "q", text: "Paano ako makakarating sa Taft galing EDSA station, walang bus", locale: "taglish", knownPlaceLabels: [],
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      // The model's own mistakes are still visible as notes for the confirmation screen.
      assert.ok(r.value.ambiguities.some((a) => a.includes("Origin")), "invented origin 'none' is flagged");
    }
  });
});
