import test from "node:test";
import assert from "node:assert/strict";
import { createLocalStoreCore } from "../src/features/localStoreCore";

const options = {
  key: "test-feature",
  initial: () => ({ count: 0 }),
  restore: (v: unknown) => {
    if (!v || typeof (v as any).count !== "number")
      throw new Error("Invalid saved state");
    return { count: (v as any).count };
  },
};
function memory(raw: string | null = null) {
  let value = raw;
  return {
    read: () => value,
    getItem: async () => value,
    setItem: async (_: string, next: string) => {
      value = next;
    },
    removeItem: async () => {
      value = null;
    },
  };
}
test("feature updates load saved values first and serialize concurrent edits", async () => {
  const storage = memory('{"count":4}');
  const store = createLocalStoreCore(options, storage);
  await Promise.all([
    store.update((v) => ({ count: v.count + 1 })),
    store.update((v) => ({ count: v.count + 2 })),
  ]);
  assert.equal(store.get().count, 7);
  assert.equal(JSON.parse(storage.read()!).count, 7);
});
test("reset fences a late read and queued update without resurrecting feature data", async () => {
  let resolve!: (v: string) => void;
  const storage = memory();
  storage.getItem = () =>
    new Promise((r) => {
      resolve = r;
    });
  const store = createLocalStoreCore(options, storage);
  const pending = store.update((v) => ({ count: v.count + 1 }));
  await store.reset();
  resolve('{"count":99}');
  assert.equal(await pending, false);
  assert.equal(store.get().count, 0);
  assert.equal(storage.read(), null);
});
test("failed reads retry without overwriting the existing saved value", async () => {
  const storage = memory('{"count":8}');
  let fail = true;
  const get = storage.getItem;
  storage.getItem = async () => {
    if (fail) throw new Error("Temporary read error");
    return get();
  };
  const store = createLocalStoreCore(options, storage);
  await store.load();
  assert.ok(store.getSnapshot().error);
  assert.equal(storage.read(), '{"count":8}');
  fail = false;
  assert.equal(await store.retry(), true);
  assert.equal(store.get().count, 8);
});
test("updates after a failed read preserve saved data until retry recovers", async () => {
  const raw = '{"count":8}';
  const storage = memory(raw);
  let fail = true;
  let writes = 0;
  let changes = 0;
  const get = storage.getItem;
  storage.getItem = async () => {
    if (fail) throw new Error("Temporary read error");
    return get();
  };
  const set = storage.setItem;
  storage.setItem = async (key, next) => {
    writes++;
    return set(key, next);
  };
  const store = createLocalStoreCore(options, storage);
  const change = (value: { count: number }) => {
    changes++;
    return { count: value.count + 1 };
  };
  // The update that triggers the failed read must also be fenced.
  assert.equal(await store.update(change), false);
  const error = store.getSnapshot().error;
  assert.ok(error);
  assert.equal(await store.update(change), false);
  assert.equal(changes, 0);
  assert.equal(writes, 0);
  assert.equal(store.get().count, 0);
  assert.equal(storage.read(), raw);
  assert.equal(store.getSnapshot().error, error);
  fail = false;
  assert.equal(await store.retry(), true);
  assert.equal(store.get().count, 8);
  assert.equal(await store.update(change), true);
  assert.equal(changes, 1);
  assert.equal(writes, 1);
  assert.equal(store.get().count, 9);
  assert.equal(storage.read(), '{"count":9}');
});
test("failed writes retain editable state and retry the same data", async () => {
  const storage = memory();
  let fail = true;
  const set = storage.setItem;
  storage.setItem = async (key, next) => {
    if (fail) throw new Error("Full disk");
    return set(key, next);
  };
  const store = createLocalStoreCore(options, storage);
  assert.equal(await store.update(() => ({ count: 3 })), false);
  assert.equal(store.get().count, 3);
  fail = false;
  assert.equal(await store.retry(), true);
  assert.equal(JSON.parse(storage.read()!).count, 3);
});
