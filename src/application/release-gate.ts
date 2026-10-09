import type { ModelManifest, TransitPack } from "../contracts";
import { validateTransitPack } from "../contracts/validators";

export interface PhysicalProof {
  platform: "android" | "ios";
  artifactSha256: string;
  sourceCommit: string;
  packVersion: string;
  modelId: string;
  modelRevision: string;
  checkedAt: string;
  standaloneColdLaunch: boolean;
  nativeSqliteRestart: boolean;
  phoneLocalInference: boolean;
  airplaneModeFreshQuery: boolean;
  cancellationAndRecovery: boolean;
}
export function releaseBlockers(input: {
  pack: unknown; ai: string; commuteUi: string; model: ModelManifest; physicalProof: unknown;
}): string[] {
  const blockers: string[] = [];
  const pack = validateTransitPack(input.pack);
  if (!pack.ok) blockers.push("A source-backed release pack must pass validation.");
  if (input.ai !== "integrated") blockers.push("The real phone-local AiPort is not integrated.");
  if (input.commuteUi !== "integrated") blockers.push("The confirmed commute screens are not integrated.");
  const proofs = Array.isArray(input.physicalProof) ? input.physicalProof : [];
  for (const platform of ["android", "ios"] as const) {
    const valid = proofs.some((proof: unknown) => {
      if (!proof || typeof proof !== "object") return false;
      const p = proof as Record<string, unknown>;
      return p.platform === platform && typeof p.artifactSha256 === "string" && /^[a-f0-9]{64}$/.test(p.artifactSha256)
        && typeof p.sourceCommit === "string" && /^[a-f0-9]{40}$/.test(p.sourceCommit)
        && typeof p.checkedAt === "string" && /^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(p.checkedAt)
        && Number.isFinite(Date.parse(p.checkedAt))
        && pack.ok && p.packVersion === pack.value.version
        && p.modelId === input.model.id && p.modelRevision === input.model.revision
        && ["standaloneColdLaunch", "nativeSqliteRestart", "phoneLocalInference", "airplaneModeFreshQuery", "cancellationAndRecovery"]
          .every(key => p[key] === true);
    });
    if (!valid) blockers.push("Missing matching " + platform + " physical release evidence.");
  }
  return blockers;
}
