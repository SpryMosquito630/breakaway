import type { CoachPair } from "./pairing";

type Storage = {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
  remove: () => Promise<void>;
};
/** Serialize private writes and retain a session tombstone even if protected storage fails. */
export function createCoachPairStore(storage: Storage) {
  let memory: unknown = null;
  let hasMemory = false;
  let generation = 0;
  let persisted: boolean | undefined;
  let tail: Promise<void> = Promise.resolve();
  function save(pair: CoachPair): Promise<boolean> {
    memory = pair;
    hasMemory = true;
    const ticket = ++generation;
    persisted = undefined;
    const write = tail.then(() => storage.write(JSON.stringify(pair)));
    tail = write.catch(() => {});
    return write.then(
      () => {
        if (ticket === generation) persisted = true;
        return true;
      },
      () => {
        if (ticket === generation) persisted = false;
        return false;
      },
    );
  }
  return {
    revision: () => generation,
    persisted: () => persisted,
    async read(): Promise<unknown> {
      if (hasMemory) return memory;
      await tail;
      if (hasMemory) return memory;
      const ticket = generation;
      try {
        const raw = await storage.read();
        if (ticket !== generation) return memory;
        memory = raw ? JSON.parse(raw) : null;
        hasMemory = true;
        persisted = true;
        return memory;
      } catch {
        // A locked device can retry the read later; explicit save/forget still wins.
        return memory;
      }
    },
    save,
    async saveIfUnchanged(pair: CoachPair, revision: number) {
      if (revision !== generation) return { applied: false, persisted: false };
      const result = await save(pair);
      return { applied: generation === revision + 1, persisted: result };
    },
    forget(revision?: number): Promise<boolean> {
      // A late rejection of an old request must not delete a newer private invite.
      if (revision !== undefined && revision !== generation) return Promise.resolve(true);
      memory = null;
      hasMemory = true;
      const ticket = ++generation;
      persisted = undefined;
      const remove = tail.then(async () => {
        try {
          await storage.remove();
        } catch {
          await storage.write("null");
        }
      });
      tail = remove.catch(() => {});
      return remove.then(
        () => {
          if (ticket === generation) persisted = true;
          return true;
        },
        () => {
          if (ticket === generation) persisted = false;
          return false;
        },
      );
    },
  };
}
