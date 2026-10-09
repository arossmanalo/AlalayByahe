import type { AiPort, GeoPort, Result, RoutePort, TransitRepository } from "../contracts";
import { createJourneyController, type ManagedJourneyController } from "./controller";
import { disabledGeo, unavailableAi, unavailableRoutes } from "./unavailable-ports";
import { validateTransitPack } from "../contracts/validators";

export interface ApplicationServices {
  ai: AiPort;
  repository: TransitRepository;
  controller: ManagedJourneyController;
  geo: GeoPort;
  initialize(): Promise<{ data: Result<void>; ai: Result<void> }>;
  close(): Promise<void>;
  cancelModelSetup?: () => void;
}
export function createApplicationServices(input: {
  repository: TransitRepository; ai?: AiPort; routes?: RoutePort; geo?: GeoPort; bundledPack?: unknown;
}): ApplicationServices {
  const ai = input.ai ?? unavailableAi();
  const setupControl = ai as AiPort & { cancelModelSetup?: () => void };
  const routes = input.routes ?? unavailableRoutes();
  const controller = createJourneyController({ ai, routes, repository: input.repository });
  let lifecycle: Promise<unknown> = Promise.resolve();
  function sequence<T>(work: () => Promise<T>): Promise<T> {
    const next = lifecycle.then(work, work);
    lifecycle = next.catch(() => undefined);
    return next;
  }
  return {
    ai, repository: input.repository, controller, geo: input.geo ?? disabledGeo(),
    cancelModelSetup: setupControl.cancelModelSetup ? () => setupControl.cancelModelSetup!() : undefined,
    initialize: () => sequence(async () => {
      const data = await input.repository.initialize();
      let pack = data.ok ? await input.repository.getPack() : data;
      if (!pack.ok && pack.error.code === "DATA_NOT_READY" && input.bundledPack != null) {
        const bundled = validateTransitPack(input.bundledPack);
        const installed = bundled.ok ? await input.repository.replacePack(bundled.value) : bundled;
        pack = installed.ok ? await input.repository.getPack() : installed;
      }
      const aiResult = await ai.initialize().catch(() =>
        ({ ok: false as const, error: { code: "AI_INIT_FAILED" as const,
          message: "Local AI is unavailable. Choose places manually.", retryable: true } }));
      return { data: pack.ok ? { ok: true as const, value: undefined } : pack, ai: aiResult };
    }),
    close: () => sequence(async () => {
      try { await controller.cancelActive(); }
      finally {
        try { await ai.release(); }
        finally { await input.repository.close(); }
      }
    }),
  };
}
