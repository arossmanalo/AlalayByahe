import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export interface FileDigest { bytes: number; sha256: string }
export async function hashChunks(
  chunks: AsyncIterable<Uint8Array>,
  options: { maxBytes?: number; isCancelled?: () => boolean } = {},
): Promise<FileDigest> {
  const hash = sha256.create();
  let bytes = 0;
  try {
    for await (const chunk of chunks) {
      if (options.isCancelled?.()) throw new Error("CANCELLED");
      bytes += chunk.byteLength;
      if (options.maxBytes !== undefined && bytes > options.maxBytes) throw new Error("FILE_TOO_LARGE");
      hash.update(chunk);
      // FileHandle reads may be synchronous. Yield to cancellation/UI between chunks.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    if (options.isCancelled?.()) throw new Error("CANCELLED");
    return { bytes, sha256: bytesToHex(hash.digest()) };
  } finally { hash.destroy(); }
}

