import type { ModelManifest, ModelState, Result } from "../contracts";
import { AI_MESSAGES, fail, ok } from "./errors";

// Port over private persistent storage. Names are relative to one private
// model directory. The Expo adapter is src/ai/expoModelFiles.ts.
export interface ChunkReader {
  /** Returns at most maxBytes; an empty array means end of file. */
  read(maxBytes: number): Promise<Uint8Array>;
  close(): Promise<void>;
}

export interface ModelFiles {
  ensureDir(): Promise<void>;
  size(name: string): Promise<number | null>;
  remove(name: string): Promise<void>;
  /** Same-directory rename that replaces any existing target. */
  move(from: string, to: string): Promise<void>;
  readText(name: string): Promise<string | null>;
  writeText(name: string, text: string): Promise<void>;
  openReader(name: string): Promise<ChunkReader>;
  /** Free bytes on the volume, or null when the platform cannot tell. */
  availableBytes(): Promise<number | null>;
  download(url: string, name: string, onBytesWritten: (bytes: number) => void, signal: AbortSignal): Promise<void>;
  /** Absolute file URI/path handed to the native runtime. */
  absolutePath(name: string): string;
}

export interface Sha256Hasher {
  update(chunk: Uint8Array): void;
  digestHex(): string;
}

export type ModelInspection =
  | { status: "absent" }
  | { status: "unverified" }
  | { status: "verified"; path: string };

export type StoreProgress = (state: ModelState) => void;

export interface ModelStore {
  readonly manifest: ModelManifest;
  /** Cheap, offline: size + verification marker only. Never downloads. */
  inspect(): Promise<ModelInspection>;
  /** Full byte/SHA256 check of an existing final file (e.g. a manually preloaded one). */
  verifyExisting(onProgress: StoreProgress, signal: AbortSignal): Promise<Result<string>>;
  /** Explicit setup action: download to .part, verify, then promote. */
  acquire(onProgress: StoreProgress, signal: AbortSignal): Promise<Result<string>>;
}

export interface ModelStoreDeps {
  manifest: ModelManifest;
  files: ModelFiles;
  createHasher: () => Sha256Hasher;
  /** Bounded read size; the whole model is never held in one JS buffer. */
  chunkBytes?: number;
  /** Keep this headroom free after the download completes. */
  storageMarginBytes?: number;
  yieldToEventLoop?: () => Promise<void>;
  nowIso?: () => string;
}

interface VerifiedMarker {
  id: string;
  revision: string;
  filename: string;
  bytes: number;
  sha256: string;
  verifiedAt: string;
}

const DEFAULT_CHUNK_BYTES = 4 * 1024 * 1024;
const DEFAULT_MARGIN_BYTES = 64 * 1024 * 1024;

const defaultYield = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function cancelled<T>(): Result<T> {
  return fail("CANCELLED", AI_MESSAGES.downloadInterrupted, true);
}

function integrityFailure<T>(why: string): Result<T> {
  return fail("AI_NOT_READY", AI_MESSAGES.integrity, true, { field: "sha256", missingConnection: why });
}

export function createModelStore(deps: ModelStoreDeps): ModelStore {
  const { manifest, files, createHasher } = deps;
  const chunkBytes = deps.chunkBytes ?? DEFAULT_CHUNK_BYTES;
  const margin = deps.storageMarginBytes ?? DEFAULT_MARGIN_BYTES;
  const yieldToEventLoop = deps.yieldToEventLoop ?? defaultYield;
  const nowIso = deps.nowIso ?? (() => new Date().toISOString());

  const finalName = manifest.filename;
  const partName = `${manifest.filename}.part`;
  const markerName = `${manifest.filename}.verified.json`;
  const expectedSha = manifest.sha256.toLowerCase();

  async function markerMatches(): Promise<boolean> {
    const text = await files.readText(markerName);
    if (text === null) return false;
    try {
      const m = JSON.parse(text) as Partial<VerifiedMarker>;
      return (
        m.id === manifest.id &&
        m.revision === manifest.revision &&
        m.filename === manifest.filename &&
        m.bytes === manifest.bytes &&
        typeof m.sha256 === "string" &&
        m.sha256.toLowerCase() === expectedSha
      );
    } catch {
      return false;
    }
  }

  async function writeMarker(): Promise<void> {
    const marker: VerifiedMarker = {
      id: manifest.id,
      revision: manifest.revision,
      filename: manifest.filename,
      bytes: manifest.bytes,
      sha256: expectedSha,
      verifiedAt: nowIso(),
    };
    await files.writeText(markerName, JSON.stringify(marker));
  }

  /** Incremental SHA256 over bounded chunks, yielding between chunks. */
  async function hashFile(
    name: string,
    onProgress: StoreProgress,
    signal: AbortSignal,
  ): Promise<Result<string>> {
    const size = await files.size(name);
    if (size !== manifest.bytes) {
      return integrityFailure(`Expected ${manifest.bytes} bytes, found ${size ?? "no file"}.`);
    }
    const hasher = createHasher();
    const reader = await files.openReader(name);
    let read = 0;
    try {
      onProgress({ phase: "checking", progress: 0 });
      while (read < size) {
        if (signal.aborted) return cancelled();
        const chunk = await reader.read(Math.min(chunkBytes, size - read));
        if (chunk.length === 0) return integrityFailure("File ended early while hashing.");
        hasher.update(chunk);
        read += chunk.length;
        onProgress({ phase: "checking", progress: read / size });
        await yieldToEventLoop();
      }
    } finally {
      await reader.close();
    }
    const digest = hasher.digestHex().toLowerCase();
    if (digest !== expectedSha) return integrityFailure("SHA256 does not match the pinned manifest.");
    return ok(digest);
  }

  async function inspect(): Promise<ModelInspection> {
    const size = await files.size(finalName);
    if (size === null) return { status: "absent" };
    if (size === manifest.bytes && (await markerMatches())) {
      return { status: "verified", path: files.absolutePath(finalName) };
    }
    return { status: "unverified" };
  }

  async function verifyExisting(onProgress: StoreProgress, signal: AbortSignal): Promise<Result<string>> {
    try {
      const hashed = await hashFile(finalName, onProgress, signal);
      if (!hashed.ok) {
        // A corrupt final file must never initialize; remove it so setup can retry.
        if (hashed.error.code !== "CANCELLED") {
          await files.remove(markerName);
          await files.remove(finalName);
        }
        return hashed;
      }
      await writeMarker();
      return ok(files.absolutePath(finalName));
    } catch (e) {
      return fail("AI_NOT_READY", AI_MESSAGES.notReady, true, { missingConnection: String(e) });
    }
  }

  async function acquire(onProgress: StoreProgress, signal: AbortSignal): Promise<Result<string>> {
    try {
      await files.ensureDir();
      await files.remove(partName);

      const available = await files.availableBytes();
      if (available !== null && available < manifest.bytes + margin) {
        return fail("STORAGE_FULL", AI_MESSAGES.storageFull, true, {
          missingConnection: `Needs about ${Math.ceil((manifest.bytes + margin) / 1e6)} MB free.`,
        });
      }

      onProgress({ phase: "downloading", progress: 0 });
      try {
        await files.download(
          manifest.url,
          partName,
          (written) => onProgress({ phase: "downloading", progress: Math.min(1, Math.max(0, written / manifest.bytes)) }),
          signal,
        );
      } catch (e) {
        await files.remove(partName);
        if (signal.aborted) return cancelled();
        const after = await files.availableBytes();
        if (after !== null && after < margin) return fail("STORAGE_FULL", AI_MESSAGES.storageFull, true);
        return fail("NETWORK_UNAVAILABLE", AI_MESSAGES.downloadInterrupted, true, { missingConnection: String(e) });
      }
      if (signal.aborted) {
        await files.remove(partName);
        return cancelled();
      }

      const hashed = await hashFile(partName, onProgress, signal);
      if (!hashed.ok) {
        await files.remove(partName);
        return hashed;
      }

      // Promote only a complete verified file; the marker is written last so an
      // interrupted promotion is re-verified on the next launch.
      await files.remove(markerName);
      await files.move(partName, finalName);
      await writeMarker();
      return ok(files.absolutePath(finalName));
    } catch (e) {
      await files.remove(partName).catch(() => undefined);
      return fail("AI_NOT_READY", AI_MESSAGES.notReady, true, { missingConnection: String(e) });
    }
  }

  return { manifest, inspect, verifyExisting, acquire };
}
