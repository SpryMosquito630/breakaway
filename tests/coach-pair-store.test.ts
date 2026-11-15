import test from "node:test";
import assert from "node:assert/strict";
import { createCoachPairStore } from "../src/coachAi/pairStoreCore";
import type { CoachPair } from "../src/coachAi/pairing";
const pair = (token: string): CoachPair => ({
  base: "https://test.example/api/replay",
  token: token.repeat(43),
  expiresAt: 1800000100000,
});

test("protected-storage adapter persists across a fresh store instance and preserves write order", async () => {
  let raw: string | null = null;
  const adapter = {
    read: async () => raw,
    write: async (value: string) => {
      raw = value;
    },
    remove: async () => {
      raw = null;
    },
  };
  const store = createCoachPairStore(adapter);
  const first = store.save(pair("x"));
  const second = store.save(pair("y"));
  await Promise.all([first, second]);
  assert.deepEqual(await createCoachPairStore(adapter).read(), pair("y"));
  await store.forget();
  assert.equal(await createCoachPairStore(adapter).read(), null);
});

test("a warm invite arriving during storage read wins; forgetting cannot revive stale storage credentials", async () => {
  for (const action of ["save", "forget"] as const) {
    let finish!: (value: string) => void;
    const pending = new Promise<string>((resolve) => {
      finish = resolve;
    });
    const store = createCoachPairStore({
      read: () => pending,
      write: async () => {},
      remove: async () => {},
    });
    const read = store.read();
    await new Promise((resolve) => setImmediate(resolve));
    if (action === "save") await store.save(pair("y"));
    else await store.forget();
    finish(JSON.stringify(pair("x")));
    assert.deepEqual(await read, action === "save" ? pair("y") : null);
  }
});

test("failed protected storage retains current in-memory authorization but does not invent one", async () => {
  const store = createCoachPairStore({
    read: async () => {
      throw Error("locked");
    },
    write: async () => {
      throw Error("full");
    },
    remove: async () => {
      throw Error("locked");
    },
  });
  assert.equal(await store.read(), null);
  await store.save(pair("x"));
  assert.deepEqual(await store.read(), pair("x"));
  await store.forget();
  assert.equal(await store.read(), null);
});
