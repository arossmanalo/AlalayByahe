import { File, FileMode } from "expo-file-system";
import { hashChunks, type FileDigest } from "./integrity";

// Member 1 can use this with its private .part file. It performs no download,
// promotion, or inference. The handle is always closed, including cancellation.
export async function hashNativeFile(
  file: File,
  options: { maxBytes?: number; isCancelled?: () => boolean } = {},
): Promise<FileDigest> {
  async function* read() {
    const handle = file.open(FileMode.ReadOnly);
    try {
      while (true) {
        const chunk = handle.readBytes(64 * 1024);
        if (!chunk.byteLength) return;
        yield chunk;
      }
    } finally { handle.close(); }
  }
  return hashChunks(read(), options);
}
