import assert from "node:assert/strict";
import test from "node:test";
import { createClipSaveLease, createClipUrlOwner } from "../src/domain/clipUrlOwner";
import { createReplayRepository, type SavedReplay } from "../src/replays/repository";

test("only acquired object URLs are revoked, exactly once on replace/reject/unmount", () => {
  const revoked: string[] = [];
  const owner = createClipUrlOwner((uri) => revoked.push(uri));
  for (const uri of [
    "blob:selected",
    "blob:rejected",
    "blob:extra",
    "file:///clip.mp4",
    "https://example.com/video.mp4",
  ])
    owner.acquire(uri);
  owner.acquire("blob:selected");
  owner.release("blob:rejected");
  owner.release("blob:rejected");
  owner.release("blob:unowned");
  owner.release("file:///clip.mp4");
  owner.release("https://example.com/video.mp4");
  owner.clear();
  owner.clear();
  assert.deepEqual(revoked, ["blob:rejected", "blob:selected", "blob:extra"]);
});

test("same-turn repeated saves cannot escape cancellation and persist after unmount", async () => {
  const rows = new Map<string, SavedReplay>();
  let releaseCopy!: () => void;
  let copyStarted!: () => void;
  const copying = new Promise<void>((resolve) => {
    copyStarted = resolve;
  });
  const wait = new Promise<void>((resolve) => {
    releaseCopy = resolve;
  });
  const repo = createReplayRepository({
    list: async () => [...rows.values()],
    size: async () => 100,
    put: async (row) => {
      copyStarted();
      await wait;
      rows.set(row.id, row);
    },
    open: async () => "",
    release: () => {},
    remove: async (id) => {
      rows.delete(id);
    },
    clear: async () => {
      rows.clear();
    },
  });
  const lease = createClipSaveLease();
  const controller = lease.begin()!;
  assert.equal(lease.begin(), null);
  const pending = repo.save(
    "replay-cancel",
    { uri: "file:///synthetic.mp4" },
    {
      width: 320,
      height: 240,
      duration: 2,
      frames: [{ time: 0, x: null, y: null, trackId: null, confidence: null }],
    },
    controller.signal,
  );
  await copying;
  lease.cancel();
  releaseCopy();
  await assert.rejects(pending, /canceled/);
  assert.equal(rows.size, 0);
  lease.finish(controller);
  const next = lease.begin()!;
  lease.finish(controller);
  assert.equal(lease.begin(), null, "old completion cannot release a newer save");
  lease.finish(next);
  assert.ok(lease.begin());
});
