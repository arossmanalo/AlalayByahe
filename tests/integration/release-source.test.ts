import { test } from "node:test";
import assert from "node:assert/strict";
import { forbiddenReleaseImports } from "../../scripts/release-source-guard";

test("release source rejects test imports, reexports and dynamic requires", () => {
  for (const source of [
    'import { services } from "../../tests/ui/fixtures/dev-services";',
    'export { pack } from "../tests/routing/helpers";',
    'import { fixture } from "../tests";',
    'const fixture = require("../tests/ui/fixtures/dev-services");',
    'const fixture = import("../assets/data/test-fixture.json");',
  ]) assert.ok(forbiddenReleaseImports("app/index.tsx", source).length);
});
test("release source rejects an explicitly connected fixture provider", () => {
  assert.ok(forbiddenReleaseImports("src/wiring.ts", 'const services = createDevFixtureServices();').length);
  assert.ok(forbiddenReleaseImports("src/wiring.ts", 'const services = { kind: "dev_fixture" };').length);
});
test("fixture warnings, comments and real adapters are allowed in release source", () => {
  assert.deepEqual(forbiddenReleaseImports("src/ui.tsx", `
    // import { fixture } from "../tests/ui/fixtures/dev-services";
    const label = 'Do not ship test_fixture data';
    type Kind = "real" | "dev_fixture";
    import { createPhoneAi } from "../ai/phone";
    const services = { kind: "real", ai: createPhoneAi() };
  `), []);
});
