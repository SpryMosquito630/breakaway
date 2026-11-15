import type { CoachPair } from "./pairing";

type Storage = {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
  remove: () => Promise<void>;
};
/** Serialize private writes; a stale async read must not replace or revive a credential. */
export function createCoachPairStore(storage: Storage) {
  let memory: CoachPair | null = null;
  let generation = 0;
  let tail: Promise<void> = Promise.resolve();
  return {
    async read(): Promise<unknown> {
      if (memory) return memory;
      await tail;
      if (memory) return memory;
      const ticket = generation;
      try {
        const raw = await storage.read();
        return ticket !== generation ? memory : raw ? JSON.parse(raw) : null;
      } catch {
        return memory;
      }
    },
    save(pair: CoachPair) {
      memory = pair;
      generation++;
      tail = tail.then(() => storage.write(JSON.stringify(pair))).catch(() => {});
      return tail;
    },
    forget() {
      memory = null;
      generation++;
      tail = tail.then(() => storage.remove()).catch(() => {});
      return tail;
    },
  };
}
