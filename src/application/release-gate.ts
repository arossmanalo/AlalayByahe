import type { ModelManifest } from "../contracts";
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
export interface NativeArtifact {
  platform: "android" | "ios";
  artifactSha256: string;
  sourceCommit: string;
}
export function matchesPhysicalProof(
  proof: unknown, artifact: unknown, packVersion: string, model: ModelManifest,
): boolean {
  if (!proof || typeof proof !== "object" || !artifact || typeof artifact !== "object") return false;
  const p = proof as Record<string, unknown>, a = artifact as Record<string, unknown>;
  return (a.platform === "android" || a.platform === "ios") && p.platform === a.platform
    && typeof a.artifactSha256 === "string" && /^[a-f0-9]{64}$/.test(a.artifactSha256)
    && typeof a.sourceCommit === "string" && /^[a-f0-9]{40}$/.test(a.sourceCommit)
    && p.artifactSha256 === a.artifactSha256 && p.sourceCommit === a.sourceCommit
    && typeof p.checkedAt === "string" && /^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(p.checkedAt)
    && Number.isFinite(Date.parse(p.checkedAt)) && p.packVersion === packVersion
    && p.modelId === model.id && p.modelRevision === model.revision
    && ["standaloneColdLaunch", "nativeSqliteRestart", "phoneLocalInference", "airplaneModeFreshQuery", "cancellationAndRecovery"]
      .every(key => p[key] === true);
}
export function releaseBlockers(input: {
  pack: unknown; ai: string; commuteUi: string; model: ModelManifest; physicalProof: unknown;
  artifacts?: unknown;
}): string[] {
  const blockers: string[] = [];
  const pack = validateTransitPack(input.pack);
  if (!pack.ok) blockers.push("A source-backed release pack must pass validation.");
  if (input.ai !== "integrated") blockers.push("The real phone-local AiPort is not integrated.");
  if (input.commuteUi !== "integrated") blockers.push("The confirmed commute screens are not integrated.");
  const proofs = Array.isArray(input.physicalProof) ? input.physicalProof : [];
  const artifacts = Array.isArray(input.artifacts) ? input.artifacts : [];
  for (const platform of ["android", "ios"] as const) {
    const valid = pack.ok && artifacts.some(artifact => artifact?.platform === platform
      && proofs.some(proof => matchesPhysicalProof(proof, artifact, pack.value.version, input.model)));
    if (!valid) blockers.push("Missing matching " + platform + " physical release evidence.");
  }
  return blockers;
}
