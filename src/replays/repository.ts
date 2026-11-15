import { ReplayAnalysis, validAnalysis } from "../domain/replay";
export const MAX_REPLAYS = 10;
export const MAX_BYTES = 200 * 1024 * 1024;
export const MAX_CLIP_BYTES = 50 * 1024 * 1024;
export type SavedReplay = {
  version: 1;
  id: string;
  createdAt: string;
  title: string;
  bytes: number;
  analysis: ReplayAnalysis;
};
export type ReplayInput = {
  uri: string;
  file?: Blob;
  mimeType?: string | null;
};
export type ReplayDriver = {
  list(): Promise<unknown[]>;
  size(input: ReplayInput): Promise<number>;
  put(record: SavedReplay, input: ReplayInput): Promise<void>;
  open(id: string): Promise<string>;
  release(uri: string): void;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
};
export function validSavedReplay(value: unknown): value is SavedReplay {
  if (!value || typeof value !== "object") return false;
  const r = value as SavedReplay;
  return (
    r.version === 1 &&
    typeof r.id === "string" &&
    /^replay-[a-z0-9-]{1,80}$/.test(r.id) &&
    typeof r.title === "string" &&
    r.title.length > 0 &&
    r.title.length <= 80 &&
    typeof r.createdAt === "string" &&
    Number.isFinite(Date.parse(r.createdAt)) &&
    Number.isSafeInteger(r.bytes) &&
    r.bytes > 0 &&
    r.bytes <= MAX_CLIP_BYTES &&
    validAnalysis(r.analysis)
  );
}
export function createReplayRepository(driver: ReplayDriver) {
  let tail: Promise<unknown> = Promise.resolve();
  let generation = 0;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((fn) => fn());
  function run<T>(fn: () => Promise<T>): Promise<T> {
    const result = tail.then(fn);
    tail = result.catch(() => {});
    return result;
  }
  async function records() {
    const values = await driver.list();
    if (!values.every(validSavedReplay))
      throw new Error(
        "Saved replays could not be read. Use Clear saved replays below to remove damaged replay storage. Your training history and preferences will stay.",
      );
    return (values as SavedReplay[]).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
  return {
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    list: () => run(records),
    release: driver.release,
    open: (id: string) =>
      run(async () => {
        if (!(await records()).some((r) => r.id === id))
          throw new Error("This replay is no longer saved.");
        return driver.open(id);
      }),
    save(id: string, input: ReplayInput, analysis: ReplayAnalysis, signal?: AbortSignal) {
      const epoch = generation;
      return run(async () => {
        const check = () => {
          if (epoch !== generation || signal?.aborted)
            throw new Error("Replay save canceled.");
        };
        check();
        const existing = await records();
        check();
        const duplicate = existing.find((r) => r.id === id);
        if (duplicate) return duplicate;
        if (!validAnalysis(analysis)) throw new Error("This analysis cannot be saved.");
        const bytes = await driver.size(input);
        check();
        if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > MAX_CLIP_BYTES)
          throw new Error("Choose a video under 50 MB.");
        if (
          existing.length >= MAX_REPLAYS ||
          existing.reduce((n, r) => n + r.bytes, 0) + bytes > MAX_BYTES
        )
          throw new Error(
            "Replay storage is full. Delete a saved replay first (10 clips or 200 MB maximum).",
          );
        const record: SavedReplay = {
          version: 1,
          id,
          createdAt: new Date().toISOString(),
          title: "Practice replay",
          bytes,
          analysis,
        };
        if (!validSavedReplay(record)) throw new Error("This replay cannot be saved.");
        try {
          await driver.put(record, input);
          check();
        } catch (error) {
          await driver.remove(id).catch(() => {});
          throw error;
        }
        emit();
        return record;
      });
    },
    remove: (id: string) =>
      run(async () => {
        if ((await records()).some((r) => r.id === id)) await driver.remove(id);
        emit();
      }),
    clear() {
      generation++;
      return run(async () => {
        await driver.clear();
        emit();
      });
    },
  };
}
