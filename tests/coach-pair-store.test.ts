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

test("failed delete writes a durable null marker instead of reviving the old credential", async () => {
  let raw: string | null = JSON.stringify(pair("x"));
  const adapter = {
    read: async () => raw,
    write: async (value: string) => {
      raw = value;
    },
    remove: async () => {
      throw Error("synthetic protected storage deletion failure");
    },
  };
  const store = createCoachPairStore(adapter);
  assert.ok(await store.read());
  assert.equal(await store.forget(), true);
  assert.equal(await store.read(), null);
  assert.equal(await createCoachPairStore(adapter).read(), null);
});

test("failed delete and failed null write keep a session tombstone and report that persistence failed", async () => {
  const raw = JSON.stringify(pair("x"));
  const store = createCoachPairStore({
    read: async () => raw,
    write: async () => {
      throw Error("synthetic storage lock");
    },
    remove: async () => {
      throw Error("synthetic storage lock");
    },
  });
  assert.ok(await store.read());
  assert.equal(await store.forget(), false);
  assert.equal(store.persisted(), false);
  assert.equal(
    await store.read(),
    null,
    "a later successful read must not revive this session's revoked credential",
  );
});

test("an old pairing exchange cannot overwrite a newer private invite", async () => {
  let raw: string | null = null;
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const adapter = {
    read: async () => raw,
    write: async (value: string) => {
      if (JSON.parse(value).token === pair("x").token) await pending;
      raw = value;
    },
    remove: async () => {
      raw = null;
    },
  };
  const store = createCoachPairStore(adapter);
  const oldExchange = store.saveIfUnchanged(pair("x"), store.revision());
  const warmInvite = store.save(pair("y"));
  finish();
  assert.equal((await oldExchange).applied, false);
  await warmInvite;
  assert.deepEqual(await store.read(), pair("y"));
  assert.deepEqual(await createCoachPairStore(adapter).read(), pair("y"));
  assert.equal((await store.saveIfUnchanged(pair("x"), 0)).applied, false);
});

test("a late old-request rejection cannot forget a newer private invite", async () => {
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
  await store.save(pair("x"));
  const oldRequest = store.revision();
  await store.save(pair("y"));
  await store.forget(oldRequest);
  assert.deepEqual(await store.read(), pair("y"));
  assert.deepEqual(await createCoachPairStore(adapter).read(), pair("y"));
});

test("failed save is usable only in memory and a locked read can retry after unlock", async () => {
  let locked = true;
  const store = createCoachPairStore({
    read: async () => {
      if (locked) throw Error("synthetic lock");
      return JSON.stringify(pair("x"));
    },
    write: async () => {
      throw Error("synthetic full storage");
    },
    remove: async () => {},
  });
  assert.equal(await store.read(), null);
  locked = false;
  assert.deepEqual(await store.read(), pair("x"));
  assert.equal(await store.save(pair("y")), false);
  assert.equal(store.persisted(), false);
  assert.deepEqual(await store.read(), pair("y"));
});

test("a warm invite arriving while revocation persists survives and exposes a changed revision", async () => {
  let raw: string | null = JSON.stringify(pair("x"));
  let finish!: () => void;
  const deletion = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const adapter = {
    read: async () => raw,
    write: async (value: string) => {
      raw = value;
    },
    remove: async () => {
      await deletion;
      raw = null;
    },
  };
  const store = createCoachPairStore(adapter);
  const oldRequest = store.revision();
  const forgetting = store.forget(oldRequest);
  const latest = store.save(pair("y"));
  finish();
  await Promise.all([forgetting, latest]);
  assert.notEqual(
    store.revision(),
    oldRequest + 1,
    "the old recovery UI must request a fresh explicit retry",
  );
  assert.deepEqual(await store.read(), pair("y"));
  assert.deepEqual(await createCoachPairStore(adapter).read(), pair("y"));
});
