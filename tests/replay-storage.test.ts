import test from "node:test";
import assert from "node:assert/strict";
import {
  createReplayRepository,
  ReplayDriver,
  SavedReplay,
  MAX_BYTES,
  validSavedReplay,
} from "../src/replays/repository";
import { ReplayAnalysis, trailAt } from "../src/domain/replay";
const analysis: ReplayAnalysis = {
  width: 320,
  height: 240,
  duration: 2,
  frames: [
    { time: 0, x: 0.2, y: 0.4, trackId: 0, confidence: 0.8 },
    { time: 1, x: null, y: null, trackId: null, confidence: null },
  ],
};
function fake() {
  const rows = new Map<string, SavedReplay>();
  let bytes = 100;
  let fail = false;
  let writes = 0;
  const driver: ReplayDriver = {
    async list() {
      return [...rows.values()];
    },
    async size() {
      return bytes;
    },
    async put(r) {
      rows.set(r.id, r);
      writes++;
      if (fail) throw Error("disk full");
    },
    async open(id) {
      if (!rows.has(id)) throw Error("missing");
      return `local:${id}`;
    },
    release() {},
    async remove(id) {
      rows.delete(id);
    },
    async clear() {
      rows.clear();
    },
  };
  return {
    rows,
    driver,
    repo: createReplayRepository(driver),
    setBytes(n: number) {
      bytes = n;
    },
    fail() {
      fail = true;
    },
    get writes() {
      return writes;
    },
  };
}
const input = { uri: "file:///temporary.mp4" };
test("saved metadata validates and preserves measured tracking gaps", async () => {
  const f = fake();
  const record = await f.repo.save("replay-a", input, analysis);
  assert.equal(validSavedReplay(record), true);
  assert.equal(record.title, "Practice replay");
  assert.deepEqual(trailAt((await f.repo.list())[0].analysis, 1), []);
  assert.equal(validSavedReplay({ ...record, id: "../../private" }), false);
  assert.equal(
    validSavedReplay({
      ...record,
      analysis: { ...analysis, frames: [{ ...analysis.frames[0], x: 20 }] },
    }),
    false,
  );
  assert.equal(await f.repo.open(record.id), "local:replay-a");
});
test("concurrent repeated save is idempotent; deletion removes playable entry", async () => {
  const f = fake();
  await Promise.all([
    f.repo.save("replay-a", input, analysis),
    f.repo.save("replay-a", input, analysis),
  ]);
  assert.equal(f.writes, 1);
  await f.repo.remove("replay-a");
  assert.equal((await f.repo.list()).length, 0);
  await assert.rejects(f.repo.open("replay-a"));
});
test("storage count and byte caps never silently evict existing videos", async () => {
  const f = fake();
  for (let i = 0; i < 10; i++) await f.repo.save(`replay-${i}`, input, analysis);
  await assert.rejects(f.repo.save("replay-extra", input, analysis), /storage is full/);
  assert.equal(f.rows.size, 10);
  const b = fake();
  b.setBytes(MAX_BYTES / 4);
  for (let i = 0; i < 4; i++) await b.repo.save(`replay-${i}`, input, analysis);
  await assert.rejects(b.repo.save("replay-extra", input, analysis), /storage is full/);
});
test("bad metadata, oversized media, and disk-full writes fail without orphan records", async () => {
  const f = fake();
  f.setBytes(51 * 1024 * 1024);
  await assert.rejects(f.repo.save("replay-a", input, analysis));
  assert.equal(f.rows.size, 0);
  f.setBytes(10);
  f.fail();
  await assert.rejects(f.repo.save("replay-a", input, analysis), /disk full/);
  assert.equal(f.rows.size, 0);
  f.rows.set("bad", {} as SavedReplay);
  await assert.rejects(f.repo.list(), /Clear saved replays/);
  await f.repo.clear();
  assert.deepEqual(await f.repo.list(), []);
});
test("reset fences in-flight and queued copies, removing partial media", async () => {
  const f = fake();
  let copied!: () => void;
  let release!: () => void;
  const began = new Promise<void>((r) => (copied = r));
  const gate = new Promise<void>((r) => (release = r));
  const original = f.driver.put;
  f.driver.put = async (r, i) => {
    await original(r, i);
    copied();
    await gate;
  };
  const saving = f.repo.save("replay-a", input, analysis);
  await began;
  const queued = f.repo.save("replay-b", input, analysis);
  const reset = f.repo.clear();
  release();
  await assert.rejects(saving, /canceled/);
  await assert.rejects(queued, /canceled/);
  await reset;
  assert.deepEqual(await f.repo.list(), []);
});
test("unmount cancellation cleans completed copy and keeps existing replays", async () => {
  const f = fake();
  await f.repo.save("replay-existing", input, analysis);
  const controller = new AbortController();
  const original = f.driver.put;
  f.driver.put = async (r, i) => {
    await original(r, i);
    controller.abort();
  };
  await assert.rejects(
    f.repo.save("replay-new", input, analysis, controller.signal),
    /canceled/,
  );
  assert.deepEqual(
    (await f.repo.list()).map((r) => r.id),
    ["replay-existing"],
  );
});

test("damaged replay metadata offers replay-only recovery and permits saving again", async () => {
  const f = fake();
  await f.repo.save("replay-valid", input, analysis);
  f.rows.set("replay-damaged", { version: 99 } as unknown as SavedReplay);
  await assert.rejects(f.repo.list(), (error) => {
    assert.match((error as Error).message, /Clear saved replays/);
    assert.match((error as Error).message, /training history and preferences will stay/);
    assert.doesNotMatch((error as Error).message, /Reset all data/);
    return true;
  });
  // Listing corrupt data never silently discards a personal video.
  assert.equal(f.rows.size, 2);
  await f.repo.clear();
  assert.deepEqual(await f.repo.list(), []);
  await f.repo.save("replay-after-recovery", input, analysis);
  assert.equal(await f.repo.open("replay-after-recovery"), "local:replay-after-recovery");
});
