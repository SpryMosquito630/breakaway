import { drills } from "../data/drills";
import { initialData, type AppData, type Active } from "../domain/model";
import { restoreAppData } from "../domain/storage";

export const APP_STORAGE_KEY = "player-accelerator-v1";
export const APP_RECOVERY_BACKUP_KEY = `${APP_STORAGE_KEY}-recovery-backup`;
export const APP_RECOVERY_ARCHIVE_PREFIX = `${APP_RECOVERY_BACKUP_KEY}-archive-`;
type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys?(): Promise<readonly string[]>;
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
  let resetting: Promise<void> | null = null;
  let tail: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  function publish(next: Snapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  function queue<T>(work: () => Promise<T>): Promise<T> {
    const next = tail.then(work);
    tail = next.catch(() => {});
    return next;
  }
  async function preserveRaw(raw: string): Promise<void> {
    const existing = await storage.getItem(APP_RECOVERY_BACKUP_KEY);
    if (existing === raw) return;
    let key = APP_RECOVERY_BACKUP_KEY;
    if (existing !== null) {
      // Keep the original recovery copy. A distinct later save gets its own slot.
      // The checksum names a slot; exact equality handles collisions and retries.
      let checksum = 2166136261;
      for (let index = 0; index < raw.length; index++)
        checksum = Math.imul(checksum ^ raw.charCodeAt(index), 16777619) >>> 0;
      const base = `${APP_RECOVERY_ARCHIVE_PREFIX}${checksum.toString(16)}-${raw.length}`;
      let collision = 0;
      key = base;
      for (;;) {
        const archived = await storage.getItem(key);
        if (archived === raw) return;
        if (archived === null) break;
        key = `${base}-${++collision}`;
      }
    }
    await storage.setItem(key, raw);
    if ((await storage.getItem(key)) !== raw)
      throw new Error(
        "The recovery backup could not be verified. Your active save was not replaced.",
      );
  }
  function persist(data: AppData) {
    if (!readable || snapshot.loading || snapshot.recovery) return Promise.resolve();
    return queue(async () => {
      // This save was admitted before a reload/reset fence. Finish it in order;
      // a later read must never discard an already accepted edit.
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
    if (resetting) return resetting;
    if (loading) return loading;
    readable = false;
    publish({ ...snapshot, loading: true });
    loading = queue(async () => {
      let raw: string | null = null;
      let backedUp = false;
      let backupFailed = false;
      try {
        raw = await storage.getItem(APP_STORAGE_KEY);
        const data = raw === null ? initialData() : restoreAppData(raw, drills);
        // Preserve the exact original before permitting an edit to a repaired/migrated save.
        if (raw !== null && JSON.stringify(JSON.parse(raw)) !== JSON.stringify(data)) {
          try {
            await preserveRaw(raw);
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
            await preserveRaw(raw);
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
    }).finally(() => {
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
    /** Export the untouched source, not a parsed/repaired/re-serialized profile. */
    exportRecoveryRaw(): Promise<string> {
      if (snapshot.loading || resetting)
        return Promise.reject(
          new Error("Wait for the current recovery action to finish."),
        );
      return queue(async () => {
        let raw: string | null = null;
        try {
          raw = await storage.getItem(APP_STORAGE_KEY);
        } catch {
          /* Try the preserved original. */
        }
        if (raw !== null) return raw;
        const backup = await storage.getItem(APP_RECOVERY_BACKUP_KEY);
        if (backup !== null) return backup;
        throw new Error(
          "No saved data could be read for export. Your stored data has not been changed.",
        );
      });
    },
    /** Explicit recovery action. Never use normal reset, which removes backups. */
    startFreshPreservingBackup(): Promise<void> {
      if (resetting) return resetting;
      if (snapshot.loading || !snapshot.recovery)
        return Promise.reject(
          new Error("Start fresh is only available after a saved-data recovery error."),
        );
      readable = false;
      let completed = false;
      resetting = queue(async () => {
        // A failed read must never be treated as a missing save.
        const raw = await storage.getItem(APP_STORAGE_KEY);
        if (raw !== null) await preserveRaw(raw);
        const data = initialData();
        await storage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
        latestData = data;
        completed = true;
        readable = true;
        publish({ data, loading: false, recovery: false, error: null });
      }).finally(() => {
        readable = completed;
        resetting = null;
      });
      return resetting;
    },
    // Only an explicit confirmed reset removes the preserved recovery copy.
    reset(): Promise<void> {
      if (resetting) return resetting;
      if (!readable || snapshot.loading || snapshot.recovery)
        return Promise.reject(
          new Error("Saved training must finish loading before it can be reset."),
        );
      readable = false;
      resetting = queue(async () => {
        // A separate confirmed Reset all data also clears archived raw copies.
        const keys = (await storage.getAllKeys?.()) ?? [];
        for (const key of keys)
          if (key.startsWith(APP_RECOVERY_ARCHIVE_PREFIX)) await storage.removeItem(key);
        await storage.removeItem(APP_RECOVERY_BACKUP_KEY);
        const data = initialData();
        await storage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
        latestData = data;
        publish({ data, loading: false, recovery: false, error: null });
      }).finally(() => {
        readable = true;
        resetting = null;
      });
      return resetting;
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
      if (resetting) return resetting;
      return snapshot.recovery || !readable ? load() : persist(latestData);
    },
    // Allows callers/tests to await the current persistence queue without adding writes.
    settled: () => tail,
  };
}
