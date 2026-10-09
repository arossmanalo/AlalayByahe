// DEV FIXTURE: fake native adapters for pure lifecycle/storage tests only.
// Nothing here proves real inference, real file I/O or device behavior.
import { createHash } from "node:crypto";
import type { ModelManifest, RawIntent } from "../../src/contracts";
import type { ChunkReader, ModelFiles, Sha256Hasher } from "../../src/ai/modelStore";
import type { CompletionOutcome, CompletionRequest, LlamaRuntime, LlamaSession, LoadSettings } from "../../src/ai/runtime";

export function nodeSha256(): Sha256Hasher {
  const h = createHash("sha256");
  return {
    update: (chunk) => {
      h.update(chunk);
    },
    digestHex: () => h.digest("hex"),
  };
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function fakeModelBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) bytes[i] = (i * 31 + 7) % 251;
  return bytes;
}

export function fakeManifest(content: Uint8Array): ModelManifest {
  return {
    id: "test_fixture_model",
    revision: "test_revision",
    filename: "test-fixture-model.gguf",
    bytes: content.length,
    sha256: sha256Hex(content),
    license: "TEST ONLY",
    url: "https://example.invalid/test-fixture-model.gguf",
  };
}

export interface MemoryFilesOptions {
  /** Bytes served by download(); defaults to an empty response. */
  remote?: Uint8Array;
  /** Throw after writing this many bytes, simulating a dropped connection. */
  failAfterBytes?: number;
  availableBytes?: number | null;
  downloadChunk?: number;
}

export class MemoryFiles implements ModelFiles {
  readonly store = new Map<string, Uint8Array>();
  readonly texts = new Map<string, string>();
  downloads = 0;
  largestRead = 0;
  totalRead = 0;
  openReaders = 0;
  /** Called between download chunks so tests can cancel mid-transfer. */
  onDownloadChunk: (written: number) => void = () => {};

  constructor(private readonly options: MemoryFilesOptions = {}) {}

  async ensureDir() {}

  async size(name: string) {
    const bin = this.store.get(name);
    if (bin) return bin.length;
    const text = this.texts.get(name);
    return text === undefined ? null : text.length;
  }

  async remove(name: string) {
    this.store.delete(name);
    this.texts.delete(name);
  }

  async move(from: string, to: string) {
    const bin = this.store.get(from);
    if (!bin) throw new Error(`move: missing ${from}`);
    this.store.set(to, bin);
    this.store.delete(from);
  }

  async readText(name: string) {
    return this.texts.get(name) ?? null;
  }

  async writeText(name: string, text: string) {
    this.texts.set(name, text);
  }

  async openReader(name: string): Promise<ChunkReader> {
    const bin = this.store.get(name);
    if (!bin) throw new Error(`open: missing ${name}`);
    let offset = 0;
    this.openReaders++;
    return {
      read: async (maxBytes: number) => {
        this.largestRead = Math.max(this.largestRead, maxBytes);
        const chunk = bin.slice(offset, offset + maxBytes);
        offset += chunk.length;
        this.totalRead += chunk.length;
        return chunk;
      },
      close: async () => {
        this.openReaders--;
      },
    };
  }

  async availableBytes() {
    return this.options.availableBytes === undefined ? null : this.options.availableBytes;
  }

  async download(_url: string, name: string, onBytesWritten: (b: number) => void, signal: AbortSignal) {
    this.downloads++;
    const remote = this.options.remote ?? new Uint8Array(0);
    const step = this.options.downloadChunk ?? 1024;
    for (let offset = 0; offset < remote.length; offset += step) {
      if (signal.aborted) throw new Error("aborted");
      const end = Math.min(remote.length, offset + step);
      if (this.options.failAfterBytes !== undefined && end > this.options.failAfterBytes) {
        this.store.set(name, remote.slice(0, offset));
        throw new Error("connection reset");
      }
      this.store.set(name, remote.slice(0, end));
      onBytesWritten(end);
      this.onDownloadChunk(end);
      await Promise.resolve();
    }
    if (remote.length === 0) this.store.set(name, new Uint8Array(0));
  }

  absolutePath(name: string) {
    return `file:///test-fixture/models/${name}`;
  }
}

export const VALID_INTENT: RawIntent = {
  kind: "journey",
  originText: "Lipa",
  destinationText: "San Pablo",
  useCurrentLocation: false,
  allowedModes: null,
  excludedModes: ["bus"],
  priority: "fewest_transfers",
  maxAccessWalkMeters: null,
  maxTransferWalkMeters: null,
  maxEgressWalkMeters: null,
  budgetCentavos: null,
  directOnly: false,
  ambiguities: [],
};

export function outcome(text: string, overrides: Partial<CompletionOutcome> = {}): CompletionOutcome {
  return {
    text,
    truncated: false,
    contextFull: false,
    interrupted: false,
    stoppedEos: true,
    stoppedLimit: false,
    tokensPredicted: 60,
    tokensEvaluated: 400,
    tokensCached: 0,
    promptMs: 1,
    predictedMs: 1,
    ...overrides,
  };
}

export interface ScriptedReply {
  /** Milliseconds before the fake completion resolves on its own. */
  delayMs: number;
  result?: CompletionOutcome;
  error?: Error;
  /** Simulate native code that ignores stopCompletion. */
  ignoreStop?: boolean;
}

/** Fake llama runtime with an observable single context. */
export class FakeRuntime implements LlamaRuntime {
  info = { kind: "phone_local" as const, label: "TEST FIXTURE runtime", llamaCppBuild: "test_build" };
  loads = 0;
  releases = 0;
  stops = 0;
  running = 0;
  maxConcurrent = 0;
  requests: CompletionRequest[] = [];
  loadDelayMs = 0;
  failLoad: Error | null = null;
  replies: ScriptedReply[] = [];
  defaultReply: ScriptedReply = { delayMs: 5, result: outcome(JSON.stringify(VALID_INTENT)) };

  async load(_path: string, _settings: LoadSettings, onProgress?: (f: number) => void): Promise<LlamaSession> {
    this.loads++;
    onProgress?.(0.5);
    if (this.loadDelayMs > 0) await delay(this.loadDelayMs);
    if (this.failLoad) throw this.failLoad;
    onProgress?.(1);
    let finishActive: ((o: CompletionOutcome) => void) | null = null;
    let activeIgnoresStop = false;
    let released = false;
    const runtime = this;
    return {
      complete(request) {
        if (released) return Promise.reject(new Error("released"));
        runtime.requests.push(request);
        const reply = runtime.replies.shift() ?? runtime.defaultReply;
        runtime.running++;
        runtime.maxConcurrent = Math.max(runtime.maxConcurrent, runtime.running);
        return new Promise<CompletionOutcome>((resolve, reject) => {
          let done = false;
          const finish = (fn: () => void) => {
            if (done) return;
            done = true;
            runtime.running--;
            finishActive = null;
            fn();
          };
          activeIgnoresStop = reply.ignoreStop ?? false;
          finishActive = (o) => finish(() => resolve(o));
          setTimeout(() => {
            if (reply.ignoreStop) return; // never settles: native hang
            finish(() => (reply.error ? reject(reply.error) : resolve(reply.result ?? outcome("{}"))));
          }, reply.delayMs);
        });
      },
      async stop() {
        runtime.stops++;
        if (finishActive && !activeIgnoresStop) finishActive(outcome("", { interrupted: true, stoppedEos: false }));
      },
      async release() {
        if (!released) runtime.releases++;
        released = true;
      },
    };
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
