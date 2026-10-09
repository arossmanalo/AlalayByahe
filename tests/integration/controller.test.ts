import { test } from "node:test";
import assert from "node:assert/strict";
import type { Extraction, Result, RouteResult } from "../../src/contracts";
import { createJourneyController } from "../../src/application/controller";
import { createApplicationServices } from "../../src/application/services";
import { fail, ok } from "../../src/contracts/result";
import { createRoutePort, planRoute } from "../../src/routing/routePort";
import { ai, deferred, errorCode, extraction, NOW, pack, repository, request, value } from "./helpers";
const input = (queryId = "query_test") => ({ queryId, text: "Mula a papunta c", locale: "taglish" as const, knownPlaceLabels: [] });
const routes = () => createRoutePort({ now: () => NOW });

test("interpretation creates an editable draft and never plans automatically", async () => {
  const h = await repository(); let planned = 0;
  const controller = createJourneyController({ ai: ai(), repository: h.repo, routes: { plan: async (...args) => {
    planned++; return routes().plan(...args);
  } } }, { allowTestFixtures: true });
  const draft = value(await controller.interpret(input()));
  assert.equal(draft.requiresConfirmation, true); assert.equal(planned, 0);
  assert.equal(draft.destinationCandidates[0]?.place.id, "place_test_c");
  const journey = value(await controller.submitConfirmed(request(pack())));
  assert.equal(journey.options[0]?.transfers, 1); assert.equal(journey.options[0]?.fare.status, "partial");
  assert.equal((await controller.submitConfirmed(request(pack()))).ok, true);
  await controller.cancel("query_test");
  assert.equal(errorCode(await controller.submitConfirmed(request(pack()))), "NEEDS_CLARIFICATION");
  await h.repo.close();
});
test("manual planning works without a ready AI and keeps real routing errors", async () => {
  const h = await repository();
  const controller = createJourneyController({ ai: ai({ extract: async () => fail("AI_NOT_READY", "Absent") }),
    repository: h.repo, routes: routes() }, { allowTestFixtures: true });
  assert.equal(errorCode(await controller.interpret(input())), "AI_NOT_READY");
  assert.equal((await controller.submitManual(request(pack()))).ok, true);
  const direct = request(pack()); direct.preferences.directOnly = true;
  assert.equal(errorCode(await controller.submitManual(direct)), "CONSTRAINT_UNSATISFIED"); await h.repo.close();
});
test("production controller refuses synthetic packs", async () => {
  const h = await repository();
  const controller = createJourneyController({ ai: ai(), repository: h.repo, routes: routes() });
  assert.equal(errorCode(await controller.submitManual(request(pack()))), "DATA_INVALID"); await h.repo.close();
});
test("missing places, onboard details and GPS remain explicit confirmation fields", async () => {
  const h = await repository();
  const controller = createJourneyController({ ai: ai({ extract: async () => ok(extraction({
    kind: "onboard", originText: null, destinationText: null, useCurrentLocation: true,
  })) }), repository: h.repo, routes: routes() }, { allowTestFixtures: true });
  const draft = value(await controller.interpret(input()));
  assert.deepEqual(draft.missingFields, ["origin", "destination", "onboard_context"]); assert.ok(draft.warnings.length);
  await h.repo.close();
});
test("conflicting AI mode constraints are never relaxed", async () => {
  const h = await repository();
  const controller = createJourneyController({ ai: ai({ extract: async () => ok(extraction({
    allowedModes: ["bus"], excludedModes: ["bus"],
  })) }), repository: h.repo, routes: routes() });
  assert.equal(errorCode(await controller.interpret(input())), "CONSTRAINT_UNSATISFIED"); await h.repo.close();
});
test("stale inference completion cannot replace a newer draft", async () => {
  const h = await repository(), old = deferred<Result<Extraction>>(), started = deferred<void>();
  const cancelled: string[] = [];
  const controller = createJourneyController({ ai: ai({
    extract: async i => { if (i.queryId === "old") { started.resolve(); return old.promise; } return ok(extraction()); },
    cancel: async id => { cancelled.push(id); },
  }), repository: h.repo, routes: routes() });
  const first = controller.interpret(input("old")); await started.promise;
  assert.equal((await controller.interpret(input("new"))).ok, true);
  old.resolve(ok(extraction())); assert.equal(errorCode(await first), "CANCELLED");
  assert.deepEqual(cancelled, ["old"]); await h.repo.close();
});
test("AI timeout calls native cancellation and returns manual recovery", async () => {
  const h = await repository(), cancelled: string[] = [];
  const controller = createJourneyController({ ai: ai({ extract: async () => new Promise(() => {}),
    cancel: async id => { cancelled.push(id); } }), repository: h.repo, routes: routes() }, { inferenceTimeoutMs: 10 });
  assert.equal(errorCode(await controller.interpret(input())), "AI_TIMEOUT");
  assert.deepEqual(cancelled, ["query_test"]); await h.repo.close();
});
test("cancellation suppresses a late routing result", async () => {
  const data = pack(), h = await repository(data), pending = deferred<Result<RouteResult>>(), started = deferred<void>();
  const controller = createJourneyController({ ai: ai(), repository: h.repo,
    routes: { plan: async () => { started.resolve(); return pending.promise; } } }, { allowTestFixtures: true });
  const task = controller.submitManual(request(data)); await started.promise; await controller.cancelActive();
  pending.resolve(planRoute(request(data), data, { now: () => NOW }));
  assert.equal(errorCode(await task), "CANCELLED"); await h.repo.close();
});
test("invalid or throwing peer output remains a typed error", async () => {
  const h = await repository();
  const badAI = createJourneyController({ ai: ai({ extract: async () => ok({ ...extraction(), extra: true }) }),
    repository: h.repo, routes: routes() });
  assert.equal(errorCode(await badAI.interpret(input())), "AI_INVALID_OUTPUT");
  const badRoutes = createJourneyController({ ai: ai(), repository: h.repo,
    routes: { plan: async () => { throw new Error("Internal"); } } }, { allowTestFixtures: true });
  assert.equal(errorCode(await badRoutes.submitManual(request(pack()))), "DATA_INVALID"); await h.repo.close();
});
test("out-of-coverage endpoints never trigger online helpers", async () => {
  const h = await repository(), req = request(pack()); req.destination.placeId = "place_missing";
  const controller = createJourneyController({ ai: ai(), repository: h.repo, routes: routes() }, { allowTestFixtures: true });
  assert.equal(errorCode(await controller.submitManual(req)), "OUTSIDE_COVERAGE"); await h.repo.close();
});
test("application init, close, and remount are serialized", async () => {
  const events: string[] = [];
  const services = createApplicationServices({ repository: {
    initialize: async () => { events.push("init"); return ok(undefined); },
    getPack: async () => ok(pack()), resolvePlace: async () => ok({ candidates: [], needsConfirmation: true }),
    getPlace: async () => fail("PLACE_NOT_FOUND", "Missing"), replacePack: async () => ok(undefined),
    close: async () => { events.push("close"); },
  }, ai: ai({ initialize: async () => { events.push("ai-init"); return ok(undefined); },
    release: async () => { events.push("release"); } }) });
  await Promise.all([services.initialize(), services.close(), services.initialize()]);
  assert.deepEqual(events, ["init", "ai-init", "release", "close", "init", "ai-init"]);
  assert.equal(errorCode(await services.geo.searchAddress("new address")), "NETWORK_UNAVAILABLE");
});
test("AI initialization failure keeps installed manual data available", async () => {
  const h = await repository();
  const services = createApplicationServices({ repository: h.repo, ai: ai({
    initialize: async () => { throw new Error("Native load failed"); },
  }) });
  const readiness = await services.initialize();
  assert.equal(readiness.data.ok, true);
  assert.equal(errorCode(readiness.ai), "AI_INIT_FAILED");
  await services.close();
});
test("bundled fixtures are refused and cannot initialize a release database", async () => {
  let installed = false;
  const services = createApplicationServices({ bundledPack: pack(), repository: {
    initialize: async () => ok(undefined), getPack: async () => fail("DATA_NOT_READY", "Missing"),
    replacePack: async () => { installed = true; return ok(undefined); },
    getPlace: async () => fail("PLACE_NOT_FOUND", "Missing"),
    resolvePlace: async () => ok({ candidates: [], needsConfirmation: true }), close: async () => undefined,
  } });
  assert.equal(errorCode((await services.initialize()).data), "DATA_INVALID");
  assert.equal(installed, false); await services.close();
});
