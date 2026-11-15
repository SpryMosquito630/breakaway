import test from "node:test";
import assert from "node:assert/strict";
import { drillTarget } from "../src/domain/targets";
import { drills } from "../src/data/drills";
import { makeSession } from "../src/domain/model";

test("the same stage scales its suggested count to the actual frozen block duration", () => {
  const target = "6 clean turns per minute. Rest as needed.";
  assert.equal(
    drillTarget(target, 160),
    "About 16 clean turns over 2:40 (6 per minute). Rest as needed.",
  );
  assert.equal(
    drillTarget(target, 560),
    "About 56 clean turns over 9:20 (6 per minute). Rest as needed.",
  );
});
test("legacy snapshots stay unchanged and have no invented fixed block threshold", () => {
  const snapshot = { target: "6 clean turns per block. Reset between sets." };
  assert.match(drillTarget(snapshot.target, 560)!, /9:20/);
  assert.doesNotMatch(drillTarget(snapshot.target, 560)!, /6 clean turns/);
  assert.equal(snapshot.target, "6 clean turns per block. Reset between sets.");
  assert.equal(drillTarget(undefined, 160), undefined);
});
test("all catalog stages define pacing and distinct set constraints", () => {
  for (const drill of drills) {
    assert.equal(drill.version, 2);
    const variants = drill.variants!;
    assert.equal(variants.length, 3);
    assert.equal(new Set(variants.map((v) => v.target)).size, 3);
    assert.equal(new Set(variants.map((v) => v.steps.at(-1))).size, 3);
    assert.ok(variants.every((v) => v.target.includes("per minute")));
  }
});

test("session stage and pacing remain frozen when the next plan changes", () => {
  const base = drills[0];
  const stage = base.variants![1];
  const session = makeSession([base.id], 10, 1000, [
    { ...base, ...stage, difficulty: 2 },
  ]);
  const snapshot = session.snapshots![base.id];
  const original = JSON.stringify(snapshot);
  const before = drillTarget(snapshot.target, session.duration);
  const laterCatalog = { ...base, ...base.variants![2], difficulty: 3 as const };
  assert.notEqual(snapshot.target, laterCatalog.target);
  assert.equal(snapshot.difficulty, 2);
  assert.equal(drillTarget(snapshot.target, session.duration), before);
  assert.equal(JSON.stringify(snapshot), original);
});
