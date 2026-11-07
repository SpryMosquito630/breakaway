import { drills } from "../data/drills";
import { initialData, type AppData, type Active } from "../domain/model";
import { restoreAppData } from "../domain/storage";

export const APP_STORAGE_KEY = "player-accelerator-v1";
export const APP_RECOVERY_BACKUP_KEY = `${APP_STORAGE_KEY}-recovery-backup`;
type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
type Snapshot = {
  data: AppData;
  loading: boolean;
  recovery: boolean;
  error: string | null;
};

/** All writes pass through the same read/recovery fence, including lifecycle checkpoints. */
export function createAppStoreCore(storage: Storage) {
  let snapshot: Snapshot = {
    data: initialData(),
    loading: true,
    recovery: false,
    error: null,
  };
  let latestData: AppData = snapshot.data;
  let readable = false;
  let loading: Promise<void> | null = null;
  let tail: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  function publish(next: Snapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  function queue(work: () => Promise<void>) {
    const next = tail.then(work);
    tail = next.catch(() => {});
    return next;
  }
  function persist(data: AppData) {
    if (!readable || snapshot.loading || snapshot.recovery) return Promise.resolve();
    return queue(async () => {
      if (!readable || snapshot.loading || snapshot.recovery) return;
      try {
        await storage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
        if (snapshot.error !== null) publish({ ...snapshot, error: null });
      } catch {
        publish({
          ...snapshot,
          error:
            "Changes could not be saved on this device. Keep the app open and try again.",
        });
      }
    });
  }
  function load(): Promise<void> {
    if (loading) return loading;
    readable = false;
    publish({ ...snapshot, loading: true });
    loading = (async () => {
      let raw: string | null = null;
      let backedUp = false;
      let backupFailed = false;
      try {
        raw = await storage.getItem(APP_STORAGE_KEY);
        const data = raw === null ? initialData() : restoreAppData(raw, drills);
        // Preserve the exact original before permitting an edit to a repaired/migrated save.
        if (raw !== null && JSON.stringify(JSON.parse(raw)) !== JSON.stringify(data)) {
          try {
            await storage.setItem(APP_RECOVERY_BACKUP_KEY, raw);
            backedUp = true;
          } catch {
            backupFailed = true;
            throw new Error("Backup failed");
          }
        }
        readable = true;
        latestData = data;
        publish({ data, loading: false, recovery: false, error: null });
      } catch {
        if (raw !== null && !backedUp && !backupFailed) {
          try {
            await storage.setItem(APP_RECOVERY_BACKUP_KEY, raw);
          } catch {
            backupFailed = true;
          }
        }
        publish({
          ...snapshot,
          loading: false,
          recovery: true,
          error: backupFailed
            ? "Saved data could not be backed up. Your original save is unchanged. Free device storage and retry."
            : "Saved data could not be read. Your original save is unchanged. Retry to read it again.",
        });
      }
    })().finally(() => {
      loading = null;
    });
    return loading;
  }
  return {
    getSnapshot: () => snapshot,
    getData: (): AppData => latestData,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load,
    update(change: (data: AppData) => AppData) {
      if (!readable || snapshot.loading || snapshot.recovery) return;
      const data = change(latestData);
      latestData = data;
      publish({ ...snapshot, data });
      void persist(data);
    },
    checkpointActive(active: Active) {
      if (!readable || snapshot.loading || snapshot.recovery) return;
      const current = latestData.active;
      if (
        !current ||
        current.id !== active.id ||
        current.index !== active.index ||
        current.ids[current.index] !== active.ids[active.index] ||
        !current.running
      )
        return;
      const data = { ...latestData, active };
      // Timer checkpoints stay current without rerendering the entire app each tick.
      latestData = data;
      void persist(data);
    },
    retry() {
      return snapshot.recovery || !readable ? load() : persist(latestData);
    },
    // Allows callers/tests to await the current persistence queue without adding writes.
    settled: () => tail,
  };
}
