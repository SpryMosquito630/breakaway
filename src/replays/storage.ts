// Metro resolves storage.web.ts for browser builds; native keeps media in Documents.
import { Directory, File, Paths } from "expo-file-system";
import { createReplayRepository, ReplayDriver } from "./repository";
const root = () => new Directory(Paths.document, "breakaway-replays");
const folder = (id: string) => new Directory(root(), id);
const driver: ReplayDriver = {
  async list() {
    const dir = root();
    if (!dir.exists) return [];
    const result: unknown[] = [];
    for (const child of dir.list()) {
      if (!(child instanceof Directory)) continue;
      const meta = new File(child, "replay.json");
      // A killed process may leave a partial copy; it was never committed.
      if (!meta.exists) {
        await child.delete();
        continue;
      }
      try {
        result.push(JSON.parse(await meta.text()));
      } catch {
        result.push(null);
      }
    }
    return result;
  },
  async size(input) {
    return new File(input.uri).size;
  },
  async put(record, input) {
    root().create({ intermediates: true, idempotent: true });
    const dir = folder(record.id);
    dir.create();
    try {
      await new File(input.uri).copy(new File(dir, "video.mp4"));
      if (new File(dir, "video.mp4").size !== record.bytes)
        throw new Error("The video copy did not finish.");
      await new File(dir, "replay.json").write(JSON.stringify(record));
    } catch (error) {
      if (dir.exists) await dir.delete();
      throw error;
    }
  },
  async open(id) {
    const file = new File(folder(id), "video.mp4");
    if (!file.exists)
      throw new Error(
        "The saved video is missing. Delete this entry and import the original again.",
      );
    return file.uri;
  },
  release() {},
  async remove(id) {
    const dir = folder(id);
    if (dir.exists) await dir.delete();
  },
  async clear() {
    const dir = root();
    if (dir.exists) await dir.delete();
  },
};
export const replays = createReplayRepository(driver);
