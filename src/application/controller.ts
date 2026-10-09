import type {
  AiPort, ExtractInput, Extraction, JourneyController, JourneyDraft, JourneyPreferences,
  RawIntent, Result, RoutePort, RouteRequest, RouteResult, TransitRepository,
} from "../contracts";
import { defaultPreferences, MODES } from "../contracts/defaults";
import { fail, ok } from "../contracts/result";
import {
  validateExtractInput, validateExtraction, validatePreferences,
  validateRouteRequest, validateRouteResult, validateTransitPack,
} from "../contracts/validators";
import { APP_LIMITS } from "./config";

interface Job { queryId: string; generation: number }
interface ControllerOptions { inferenceTimeoutMs?: number; allowTestFixtures?: boolean }
export interface ManagedJourneyController extends JourneyController {
  cancelActive(): Promise<void>;
}

function applyPreferences(intent: RawIntent): Result<JourneyPreferences> {
  const defaults = defaultPreferences();
  const allowed = (intent.allowedModes ?? [...MODES]).filter(mode => !intent.excludedModes.includes(mode));
  if (!allowed.length) return fail("CONSTRAINT_UNSATISFIED", "Your mode preferences conflict. Choose which modes to allow.");
  return validatePreferences({
    ...defaults, allowedModes: allowed, priority: intent.priority ?? defaults.priority,
    maxAccessWalkMeters: intent.maxAccessWalkMeters ?? defaults.maxAccessWalkMeters,
    maxTransferWalkMeters: intent.maxTransferWalkMeters ?? defaults.maxTransferWalkMeters,
    maxEgressWalkMeters: intent.maxEgressWalkMeters ?? defaults.maxEgressWalkMeters,
    budgetCentavos: intent.budgetCentavos,
    directOnly: intent.directOnly,
  });
}

export function createJourneyController(
  ports: { ai: AiPort; repository: TransitRepository; routes: RoutePort },
  options: ControllerOptions = {},
): ManagedJourneyController {
  let active: Job | null = null;
  let generation = 0;
  const drafts = new Map<string, JourneyDraft>();
  const timeoutMs = options.inferenceTimeoutMs ?? APP_LIMITS.controllerTimeoutMs;
  const current = (job: Job): boolean => active === job && job.generation === generation;
  const cancelled = <T>(): Result<T> => fail("CANCELLED", "Query cancelled.", true);
  const finish = (job: Job): void => { if (active === job) active = null; };

  async function begin(queryId: string): Promise<Job> {
    const previous = active;
    const job = { queryId, generation: ++generation };
    active = job;
    if (previous) await ports.ai.cancel(previous.queryId);
    return job;
  }
  async function extract(input: ExtractInput, job: Job): Promise<Result<Extraction>> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      const timeout = new Promise<Result<never>>(resolve => {
        timer = setTimeout(() => {
          timedOut = true;
          resolve(fail("AI_TIMEOUT", "AI took too long. Try again or choose places manually.", true));
        }, timeoutMs);
      });
      // Catch rejection on the losing promise too; ports cannot cause an unhandled rejection.
      const inference = ports.ai.extract(input).catch(() => fail<never>("AI_INIT_FAILED", "AI is unavailable. Choose places manually.", true));
      const result = await Promise.race([inference, timeout]);
      if (timedOut) await ports.ai.cancel(job.queryId);
      return result;
    } finally { if (timer) clearTimeout(timer); }
  }

  async function plan(request: RouteRequest, needsDraft: boolean): Promise<Result<RouteResult>> {
    const shape = validateRouteRequest(request);
    if (!shape.ok) return shape;
    // Snapshot at entry: edits to UI state during an await cannot alter this job.
    request = JSON.parse(JSON.stringify(shape.value)) as RouteRequest;
    if (!needsDraft) drafts.clear();
    if (needsDraft && !drafts.has(request.queryId)) {
      return fail("NEEDS_CLARIFICATION", "Confirm a current journey draft, or use manual planning.", false, { field: "confirmation" });
    }
    let job: Job | undefined;
    try {
      job = await begin(request.queryId);
      if (!current(job)) return cancelled();
      const stored = await ports.repository.getPack();
      if (!current(job)) return cancelled();
      if (!stored.ok) return stored;
      const validatedPack = validateTransitPack(stored.value, { allowTestFixtures: options.allowTestFixtures ?? false });
      if (!validatedPack.ok) return validatedPack;
      const scoped = validateRouteRequest(request, validatedPack.value);
      if (!scoped.ok) {
        const field = scoped.error.detail?.field;
        return field?.includes("outside coverage")
          ? fail("OUTSIDE_COVERAGE", "Choose places within the verified transit pack.", false, { field })
          : scoped;
      }
      const result = await ports.routes.plan(scoped.value, validatedPack.value);
      if (!current(job)) return cancelled();
      if (!result.ok) return result;
      const validated = validateRouteResult(result.value, scoped.value, validatedPack.value,
        { allowUnverified: options.allowTestFixtures ?? false });
      // Keep the current draft for explicit edits/reconfirmation. New input,
      // manual planning or explicit cancellation invalidates it.
      return validated;
    } catch {
      return job && !current(job) ? cancelled()
        : fail("DATA_INVALID", "The journey could not be safely computed. Please retry.", true);
    } finally { if (job) finish(job); }
  }

  return {
    async interpret(input): Promise<Result<JourneyDraft>> {
      const shape = validateExtractInput(input);
      if (!shape.ok) return shape;
      input = JSON.parse(JSON.stringify(shape.value)) as ExtractInput;
      drafts.clear();
      let job: Job | undefined;
      try {
        job = await begin(input.queryId);
        if (!current(job)) return cancelled();
        const extracted = await extract(input, job);
        if (!current(job)) return cancelled();
        if (!extracted.ok) return extracted;
        const validated = validateExtraction(extracted.value);
        if (!validated.ok) return validated;
        const extraction = validated.value, intent = extraction.intent;
        if (intent.kind === "unrelated") return fail("INVALID_INPUT", "Enter an origin and destination.");
        const prefs = applyPreferences(intent);
        if (!prefs.ok) return prefs;
        const [origin, destination] = await Promise.all([
          intent.originText ? ports.repository.resolvePlace(intent.originText)
            : Promise.resolve(ok({ candidates: [], needsConfirmation: true })),
          intent.destinationText ? ports.repository.resolvePlace(intent.destinationText)
            : Promise.resolve(ok({ candidates: [], needsConfirmation: true })),
        ]);
        if (!current(job)) return cancelled();
        if (!origin.ok) return origin;
        if (!destination.ok) return destination;
        const warnings: string[] = [];
        const missingFields: JourneyDraft["missingFields"] = [];
        if (!origin.value.candidates.length) missingFields.push("origin");
        if (!destination.value.candidates.length) missingFields.push("destination");
        if (intent.kind === "onboard") missingFields.push("onboard_context");
        if (intent.useCurrentLocation) warnings.push("Confirm your starting point. GPS and new walking paths may need an explicit online action.");
        if (intent.ambiguities.length) warnings.push("Some parts of your request need clarification.");
        if (origin.value.needsConfirmation || destination.value.needsConfirmation) warnings.push("Choose the correct place and locality.");
        const draft: JourneyDraft = {
          queryId: input.queryId, extraction,
          originCandidates: origin.value.candidates, destinationCandidates: destination.value.candidates,
          preferences: prefs.value, missingFields, warnings, requiresConfirmation: true,
        };
        drafts.set(input.queryId, draft);
        return ok(draft);
      } catch {
        return job && !current(job) ? cancelled()
          : fail("AI_INIT_FAILED", "AI is unavailable. Choose places manually.", true);
      } finally { if (job) finish(job); }
    },
    submitConfirmed: request => plan(request, true),
    submitManual: request => plan(request, false),
    async cancel(queryId) {
      drafts.delete(queryId);
      if (active?.queryId === queryId) { generation++; active = null; }
      await ports.ai.cancel(queryId);
    },
    async cancelActive() {
      const queryId = active?.queryId;
      if (queryId) {
        drafts.delete(queryId);
        generation++; active = null;
        await ports.ai.cancel(queryId);
      }
    },
  };
}
