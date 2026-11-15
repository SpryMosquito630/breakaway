import test from "node:test";
import assert from "node:assert/strict";
import { initialData } from "../src/domain/model";
import {
  createAppStoreCore,
  APP_STORAGE_KEY,
  APP_RECOVERY_BACKUP_KEY,
  APP_RECOVERY_ARCHIVE_PREFIX,
} from "../src/state/appStoreCore";
import { recoveryExportArtifact } from "../src/recovery/exportArtifact";

function memory(raw: string | null) {
  const values = new Map<string, string>();
  if (raw !== null) values.set(APP_STORAGE_KEY, raw);
  const events: [string, string][] = [];
  return {
    values,
    events,
    getItem: async (key: string) => {
      events.push(["read", key]);
      return values.get(key) ?? null;
    },
    setItem: async (key: string, value: string) => {
      events.push(["write", key]);
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      events.push(["remove", key]);
      values.delete(key);
    },
    getAllKeys: async () => [...values.keys()],
  };
}
const raw = ' \n {"broken": "Alex ⚽", \r\n';

test("raw export preserves malformed content byte-for-byte and start fresh keeps its verified backup", async () => {
  const storage = memory(raw);
  const store = createAppStoreCore(storage);
  await store.load();
  assert.equal(store.getSnapshot().recovery, true);
  const before = storage.events.length;
  assert.equal(await store.exportRecoveryRaw(), raw);
  assert.ok(storage.events.slice(before).every(([operation]) => operation === "read"));
  assert.deepEqual(recoveryExportArtifact(raw, 42), {
    name: "breakaway-raw-recovery-42.txt",
    content: raw,
    mimeType: "text/plain;charset=utf-8",
  });
  storage.events.length = 0;
  await store.startFreshPreservingBackup();
  assert.deepEqual(store.getData(), initialData());
  assert.equal(store.getSnapshot().recovery, false);
  assert.equal(storage.values.get(APP_RECOVERY_BACKUP_KEY), raw);
  assert.equal(storage.values.get(APP_STORAGE_KEY), JSON.stringify(initialData()));
  const verify = storage.events.findIndex(
    ([action, key]) => action === "read" && key === APP_RECOVERY_BACKUP_KEY,
  );
  const overwrite = storage.events.findIndex(
    ([action, key]) => action === "write" && key === APP_STORAGE_KEY,
  );
  assert.ok(verify >= 0 && overwrite > verify);
  assert.ok(storage.events.every(([action]) => action !== "remove"));
  store.update((data) => ({ ...data, onboardingAnswers: { name: "New setup" } }));
  await store.settled();
  assert.equal(
    JSON.parse(storage.values.get(APP_STORAGE_KEY)!).onboardingAnswers.name,
    "New setup",
  );
  assert.equal(storage.values.get(APP_RECOVERY_BACKUP_KEY), raw);
});

test("different previous backup stays untouched and the new raw copy archives once across retries and fresh start", async () => {
  const storage = memory(raw);
  storage.values.set(APP_RECOVERY_BACKUP_KEY, "older preserved bytes");
  const store = createAppStoreCore(storage);
  await store.load();
  await store.retry();
  assert.equal(await store.exportRecoveryRaw(), raw);
  await store.startFreshPreservingBackup();
  const archives = [...storage.values.entries()].filter(([key]) =>
    key.startsWith(APP_RECOVERY_ARCHIVE_PREFIX),
  );
  assert.equal(archives.length, 1);
  assert.equal(archives[0][1], raw);
  assert.equal(storage.values.get(APP_RECOVERY_BACKUP_KEY), "older preserved bytes");
});

test("start fresh fails closed on read, backup write or backup verification failure", async () => {
  for (const failure of ["read", "write", "verify"] as const) {
    const storage = memory(raw);
    const store = createAppStoreCore(storage);
    await store.load();
    storage.values.delete(APP_RECOVERY_BACKUP_KEY);
    const get = storage.getItem;
    const set = storage.setItem;
    storage.getItem = async (key) => {
      if (failure === "read" && key === APP_STORAGE_KEY) throw Error("Read unavailable");
      if (
        failure === "verify" &&
        key === APP_RECOVERY_BACKUP_KEY &&
        storage.values.has(key)
      )
        return "incorrect bytes";
      return get(key);
    };
    storage.setItem = async (key, value) => {
      if (failure === "write" && key === APP_RECOVERY_BACKUP_KEY)
        throw Error("Full disk");
      await set(key, value);
    };
    await assert.rejects(store.startFreshPreservingBackup());
    store.update((data) => ({ ...data, onboarded: true }));
    await store.settled();
    assert.equal(store.getSnapshot().recovery, true, failure);
    assert.equal(storage.values.get(APP_STORAGE_KEY), raw, failure);
  }
});

test("raw export falls back to preserved bytes on read failure and reports unavailable data without writes", async () => {
  const storage = memory(raw);
  const store = createAppStoreCore(storage);
  await store.load();
  const get = storage.getItem;
  storage.getItem = async (key) => {
    if (key === APP_STORAGE_KEY) throw Error("Read failed");
    return get(key);
  };
  const writes = storage.events.filter(([action]) => action === "write").length;
  assert.equal(await store.exportRecoveryRaw(), raw);
  storage.values.delete(APP_RECOVERY_BACKUP_KEY);
  await assert.rejects(store.exportRecoveryRaw(), /No saved data could be read/);
  assert.equal(storage.events.filter(([action]) => action === "write").length, writes);
  assert.equal(storage.values.get(APP_STORAGE_KEY), raw);
});

test("fresh start is single-owner and blocks queued edits, reset and overlapping exports until safely persisted", async () => {
  const storage = memory(raw);
  const store = createAppStoreCore(storage);
  await store.load();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const set = storage.setItem;
  storage.setItem = async (key, value) => {
    if (key === APP_STORAGE_KEY) await gate;
    await set(key, value);
  };
  const fresh = store.startFreshPreservingBackup();
  assert.equal(store.startFreshPreservingBackup(), fresh);
  assert.equal(store.retry(), fresh);
  assert.equal(store.load(), fresh);
  assert.equal(store.reset(), fresh);
  await assert.rejects(store.exportRecoveryRaw(), /current recovery action/);
  let edits = 0;
  store.update((data) => {
    edits++;
    return { ...data, onboarded: true };
  });
  assert.equal(edits, 0);
  release();
  await fresh;
  assert.equal(store.getSnapshot().recovery, false);
  assert.equal(storage.values.get(APP_RECOVERY_BACKUP_KEY), raw);
  assert.deepEqual(store.getData(), initialData());
});

test("a separate confirmed normal reset removes all raw recovery copies, and fresh start cannot run on a healthy store", async () => {
  const storage = memory(raw);
  storage.values.set(APP_RECOVERY_BACKUP_KEY, "previous preserved original");
  const store = createAppStoreCore(storage);
  await store.load();
  await store.startFreshPreservingBackup();
  assert.ok(
    [...storage.values.keys()].some((key) => key.startsWith(APP_RECOVERY_ARCHIVE_PREFIX)),
  );
  await assert.rejects(store.startFreshPreservingBackup(), /only available/);
  await store.reset();
  assert.ok(
    ![...storage.values.keys()].some((key) => key.startsWith(APP_RECOVERY_BACKUP_KEY)),
  );
});

test("a fresh-primary write failure retains verified original bytes and leaves recovery locked", async () => {
  const storage = memory(raw);
  const store = createAppStoreCore(storage);
  await store.load();
  const set = storage.setItem;
  storage.setItem = async (key, value) => {
    if (key === APP_STORAGE_KEY) throw Error("Primary write failed");
    await set(key, value);
  };
  await assert.rejects(store.startFreshPreservingBackup(), /Primary write failed/);
  assert.equal(storage.values.get(APP_RECOVERY_BACKUP_KEY), raw);
  assert.equal(storage.values.get(APP_STORAGE_KEY), raw);
  assert.equal(store.getSnapshot().recovery, true);
  assert.equal(await store.exportRecoveryRaw(), raw);
});

test("an occupied archive slot is preserved rather than overwritten", async () => {
  const storage = memory(raw);
  storage.values.set(APP_RECOVERY_BACKUP_KEY, "first original");
  const store = createAppStoreCore(storage);
  await store.load();
  const firstArchive = [...storage.values.keys()].find((key) =>
    key.startsWith(APP_RECOVERY_ARCHIVE_PREFIX),
  )!;
  storage.values.set(firstArchive, "different preserved bytes");
  await store.startFreshPreservingBackup();
  assert.equal(storage.values.get(firstArchive), "different preserved bytes");
  assert.ok(
    [...storage.values.entries()].some(
      ([key, value]) =>
        key !== firstArchive &&
        key.startsWith(APP_RECOVERY_ARCHIVE_PREFIX) &&
        value === raw,
    ),
  );
});
