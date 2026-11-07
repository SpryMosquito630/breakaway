export type LocalSnapshot<T> = {
  data: T;
  ready: boolean;
  resetting: boolean;
  error: string | null;
};
type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
export type LocalStoreOptions<T> = {
  key: string;
  initial: () => T;
  restore: (value: unknown) => T;
};

/** Versioned feature stores share persistence ordering, cancellation and reset behavior. */
export function createLocalStoreCore<T>(options: LocalStoreOptions<T>, storage: Storage) {
  let snapshot: LocalSnapshot<T> = {
    data: options.initial(),
    ready: false,
    resetting: false,
    error: null,
  };
  let epoch = 0;
  let loading: Promise<void> | null = null;
  let readFailed = false;
  let tail: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  const publish = (next: LocalSnapshot<T>) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };
  function queue<R>(work: () => Promise<R>): Promise<R> {
    const result = tail.then(work);
    tail = result.catch(() => {});
    return result;
  }
  function load(): Promise<void> {
    if (snapshot.ready) return Promise.resolve();
    if (loading) return loading;
    const generation = epoch;
    loading = (async () => {
      try {
        const raw = await storage.getItem(options.key);
        const data = raw === null ? options.initial() : options.restore(JSON.parse(raw));
        if (generation === epoch) {
          readFailed = false;
          publish({ data, ready: true, resetting: false, error: null });
        }
      } catch {
        if (generation === epoch) {
          readFailed = true;
          publish({
            ...snapshot,
            ready: true,
            resetting: false,
            error: "Saved data could not be read. Your other training data is unchanged.",
          });
        }
      }
    })().finally(() => {
      if (generation === epoch) loading = null;
    });
    return loading;
  }
  async function persist(generation: number): Promise<boolean> {
    if (generation !== epoch || snapshot.resetting || readFailed) return false;
    try {
      await storage.setItem(options.key, JSON.stringify(snapshot.data));
      if (generation !== epoch) return false;
      publish({ ...snapshot, error: null });
      return true;
    } catch {
      if (generation === epoch)
        publish({
          ...snapshot,
          error: "Changes could not be saved. Keep the app open and try again.",
        });
      return false;
    }
  }
  return {
    load,
    get: () => snapshot.data,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async update(change: (data: T) => T): Promise<boolean> {
      const generation = epoch;
      if (snapshot.resetting || readFailed) return false;
      await load();
      return queue(async () => {
        if (generation !== epoch || snapshot.resetting || readFailed) return false;
        try {
          publish({ ...snapshot, data: change(snapshot.data) });
        } catch {
          publish({ ...snapshot, error: "This change could not be applied. Try again." });
          return false;
        }
        return persist(generation);
      });
    },
    retry() {
      if (readFailed) {
        loading = null;
        publish({ ...snapshot, ready: false, error: null });
        return load().then(() => snapshot.error === null);
      }
      const generation = epoch;
      return queue(() => persist(generation));
    },
    reset(): Promise<void> {
      epoch++;
      readFailed = false;
      loading = null;
      const generation = epoch;
      const previous = snapshot.data;
      publish({ data: options.initial(), ready: true, resetting: true, error: null });
      return queue(async () => {
        try {
          await storage.removeItem(options.key);
          if (generation === epoch)
            publish({
              data: options.initial(),
              ready: true,
              resetting: false,
              error: null,
            });
        } catch {
          if (generation === epoch)
            publish({
              data: previous,
              ready: true,
              resetting: false,
              error: "Local data could not be cleared. Try again.",
            });
          throw new Error("Local data could not be cleared.");
        }
      });
    },
  };
}
