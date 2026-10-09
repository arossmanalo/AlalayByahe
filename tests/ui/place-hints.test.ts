import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { TransitPack } from "../../src/contracts";
import { MAX_PLACE_HINTS, selectPlaceHints } from "../../src/ui/place-hints";

const demo = JSON.parse(readFileSync("assets/demo/demo-pack.json", "utf8")) as TransitPack;
const release = JSON.parse(readFileSync("assets/data/release.json", "utf8")) as TransitPack;

describe("place hints for the on-device model", () => {
  it("offers places from every part of the demo network, not only the first ones in the pack", () => {
    const late = demo.places.slice(40);
    assert.ok(late.length > 20);
    for (const place of late) {
      const hints = selectPlaceHints(`Paano pumunta sa ${place.name}?`, demo.places);
      assert.ok(hints.includes(place.name), `${place.name} should be offered when the request names it`);
    }
  });

  it("names both places of a two-place request and stays within the limit", () => {
    const hints = selectPlaceHints("Galing Baguio papuntang Candelaria, ayoko ng bus", demo.places);
    assert.ok(hints.some((h) => /Baguio/.test(h)), hints.join("; "));
    assert.ok(hints.some((h) => /Candelaria/.test(h)), hints.join("; "));
    assert.ok(hints.length <= MAX_PLACE_HINTS);
  });

  it("tolerates a one-letter typo in a longer name", () => {
    assert.ok(selectPlaceHints("papuntang Candelarya", demo.places).some((h) => /Candelaria/.test(h)));
  });

  it("sends no hints, not a default list, when no stored place is mentioned", () => {
    assert.deepEqual(selectPlaceHints("Saan ang pinakamalapit na sakayan?", demo.places), []);
    assert.deepEqual(selectPlaceHints("", demo.places), []);
  });

  it("is deterministic and works the same on the release pack", () => {
    const a = selectPlaceHints("Vito Cruz to Baclaran", release.places);
    assert.deepEqual(a, selectPlaceHints("Vito Cruz to Baclaran", release.places));
    assert.ok(a.includes("Vito Cruz Station") && a.includes("Baclaran Station"), a.join("; "));
    assert.ok(a.every((h) => h.length <= 120));
  });
});
