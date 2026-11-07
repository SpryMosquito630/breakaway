import test from "node:test";
import assert from "node:assert/strict";
import { initialData, completeOnboarding, makeSession } from "../src/domain/model";
import { drills } from "../src/data/drills";
import { restoreAppData } from "../src/domain/storage";
import { createAppStoreCore, APP_STORAGE_KEY, APP_RECOVERY_BACKUP_KEY } from "../src/state/appStoreCore";

function saved() {
  return { ...initialData(), onboarded: true, history: [{ id: "retained", date: "2026-11-01T12:00:00Z", seconds: 180, done: 1, skipped: 0, total: 1, completed: true }],
    assessments: [{ id: "passing", date: "2026-11-01T12:00:00Z", skill: "passing", protocolVersion: 1, value: 12 }] };
}
function memory(raw: string | null) {
  const values = new Map<string, string>();
  if (raw !== null) values.set(APP_STORAGE_KEY, raw);
  const writes: [string, string][] = [];
  return { values, writes, getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { writes.push([key, value]); values.set(key, value); } };
}

test("a malformed active session preserves profile, completed history and validated assessments", () => {
  const original = saved();
  for (const active of [{ ids: ["sole"], remaining: -1 }, 5, "bad", [], { ...makeSession(["sole"], 15), index: 99 }]) {
    const data = restoreAppData(JSON.stringify({ ...original, active }), drills);
    assert.equal(data.active, null);
    assert.equal(data.onboarded, true);
    assert.deepEqual(data.profile, original.profile);
    assert.deepEqual(JSON.parse(JSON.stringify(data.history)), original.history);
    assert.deepEqual(data.assessments, original.assessments);
  }
});
test("invalid preferences restart onboarding without losing validated history", () => {
  const data = restoreAppData(JSON.stringify({ ...saved(), profile: { goal: "bad" } }), drills);
  assert.equal(data.onboarded, false);
  assert.equal(data.history[0].id, "retained");
  assert.equal(data.assessments?.[0].id, "passing");
});
test("repair backup contains exact bytes and completes before any primary write", async () => {
  const raw = JSON.stringify({ ...saved(), active: { invalid: true } }, null, 2);
  const storage = memory(raw); const store = createAppStoreCore(storage);
  let release!: () => void;
  const set = storage.setItem;
  storage.setItem = async (key, value) => { await set(key, value); if (key === APP_RECOVERY_BACKUP_KEY) await new Promise<void>(resolve => { release = resolve; }); };
  const pending = store.load();
  await new Promise(resolve => setImmediate(resolve));
  let edited = false;
  store.update(data => { edited = true; return { ...data, onboarded: false }; });
  assert.equal(edited, false); assert.equal(storage.values.get(APP_STORAGE_KEY), raw);
  release(); await pending;
  store.update(data => ({ ...data, onboarded: true })); await store.settled();
  assert.equal(storage.writes[0][0], APP_RECOVERY_BACKUP_KEY);
  assert.equal(storage.values.get(APP_RECOVERY_BACKUP_KEY), raw);
  assert.equal(JSON.parse(storage.values.get(APP_STORAGE_KEY)!).history[0].id, "retained");
});
test("invalid roots, unknown versions and invalid JSON are backed up and cannot be overwritten by onboarding or retry", async () => {
  for (const raw of ["null", "[]", "invalid json", JSON.stringify({ ...saved(), version: 99 }), JSON.stringify({ ...saved(), history: {} })]) {
    const storage = memory(raw); const store = createAppStoreCore(storage);
    await store.load(); assert.equal(store.getSnapshot().recovery, true);
    store.update(data => completeOnboarding(data, data.profile, ["sole"]));
    store.checkpointActive(makeSession(["sole"], 15));
    await store.retry(); await store.settled();
    assert.equal(storage.values.get(APP_STORAGE_KEY), raw);
    assert.equal(storage.values.get(APP_RECOVERY_BACKUP_KEY), raw);
    assert.ok(storage.writes.every(([key]) => key === APP_RECOVERY_BACKUP_KEY));
  }
});
test("backup failure fails closed for repaired saves and malformed roots", async () => {
  for (const raw of [JSON.stringify({ ...saved(), active: { invalid: true } }), "null"]) {
    const storage = memory(raw); let fail = true;
    const set = storage.setItem;
    storage.setItem = async (key, value) => { if (fail && key === APP_RECOVERY_BACKUP_KEY) throw Error("Full disk"); return set(key, value); };
    const store = createAppStoreCore(storage); await store.load();
    assert.equal(store.getSnapshot().recovery, true);
    store.update(data => ({ ...data, onboarded: true })); await store.settled();
    assert.equal(storage.values.get(APP_STORAGE_KEY), raw);
    fail = false; await store.retry();
    assert.equal(storage.values.get(APP_RECOVERY_BACKUP_KEY), raw);
    assert.equal(store.getSnapshot().recovery, raw === "null");
  }
});
test("transient read errors block updates and retry rereads the existing save", async () => {
  const raw = JSON.stringify(saved()); const storage = memory(raw); let fail = true; let reads = 0;
  const get = storage.getItem;
  storage.getItem = async key => { reads++; if (fail) throw Error("Unavailable"); return get(key); };
  const store = createAppStoreCore(storage); await store.load();
  let changes = 0;
  store.update(data => { changes++; return completeOnboarding(data, data.profile, ["sole"]); });
  assert.equal(changes, 0); assert.equal(storage.writes.length, 0);
  fail = false; await store.retry();
  assert.equal(reads, 2); assert.equal(store.getSnapshot().data.history[0].id, "retained");
  assert.equal(store.getSnapshot().data.onboarded, true);
  assert.equal(storage.values.get(APP_STORAGE_KEY), raw);
});
test("legacy optional fields migrate while invalid history and assessment records remain untrusted", async () => {
  const original = saved();
  const raw = JSON.stringify({ ...original, history: [...original.history, { ...original.history[0], seconds: -1 }, { ...original.history[0], total: 0 }, null], assessments: [...original.assessments, { ...original.assessments[0], protocolVersion: 99 }] });
  const storage = memory(raw); const store = createAppStoreCore(storage); await store.load();
  assert.equal(store.getSnapshot().data.history.length, 1);
  assert.equal(store.getSnapshot().data.assessments?.length, 1);
  assert.equal(store.getSnapshot().data.version, 1);
  assert.equal(storage.values.get(APP_RECOVERY_BACKUP_KEY), raw);
});
test("write failure retry preserves the latest edited state", async () => {
  const storage = memory(null); let fail = true;
  const set = storage.setItem;
  storage.setItem = async (key, value) => { if (fail && key === APP_STORAGE_KEY) throw Error("Full disk"); return set(key, value); };
  const store = createAppStoreCore(storage); await store.load();
  store.update(data => ({ ...data, onboarded: true })); await store.settled();
  assert.ok(store.getSnapshot().error); assert.equal(store.getSnapshot().recovery, false);
  fail = false; await store.retry();
  assert.equal(JSON.parse(storage.values.get(APP_STORAGE_KEY)!).onboarded, true);
});
