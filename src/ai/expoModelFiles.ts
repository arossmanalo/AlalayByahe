import { Directory, File, FileMode, Paths } from "expo-file-system";
import type { ChunkReader, ModelFiles } from "./modelStore";

// expo-file-system 57 adapter (File/Directory/DownloadTask/FileHandle, checked
// against the installed typings). Files live in the app's private document
// directory, which the OS does not purge like the cache directory.
export function createExpoModelFiles(directoryName = "models"): ModelFiles {
  const directory = new Directory(Paths.document, directoryName);
  const file = (name: string) => new File(directory, name);

  return {
    async ensureDir() {
      if (!directory.exists) directory.create({ intermediates: true });
    },
    async size(name) {
      const f = file(name);
      return f.exists ? f.size : null;
    },
    async remove(name) {
      const f = file(name);
      if (f.exists) f.delete();
    },
    async move(from, to) {
      await file(from).move(file(to), { overwrite: true });
    },
    async readText(name) {
      const f = file(name);
      return f.exists ? await f.text() : null;
    },
    async writeText(name, text) {
      const f = file(name);
      if (!f.exists) f.create();
      f.write(text);
    },
    async openReader(name): Promise<ChunkReader> {
      const handle = file(name).open(FileMode.ReadOnly);
      return {
        async read(maxBytes) {
          return handle.readBytes(maxBytes);
        },
        async close() {
          handle.close();
        },
      };
    },
    async availableBytes() {
      const free = Paths.availableDiskSpace;
      return Number.isFinite(free) && free > 0 ? free : null;
    },
    async download(url, name, onBytesWritten, signal) {
      const task = File.createDownloadTask(url, file(name), {
        sessionType: "foreground",
        signal,
        onProgress: (p) => onBytesWritten(p.bytesWritten),
      });
      const result = await task.downloadAsync();
      if (!result) throw new Error(signal.aborted ? "Download cancelled." : "Download did not complete.");
    },
    absolutePath(name) {
      return file(name).uri;
    },
  };
}
