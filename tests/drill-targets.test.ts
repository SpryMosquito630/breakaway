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
test("all catalog stages define work rounds, rest and movement-specific counts", () => {
  for (const drill of drills) {
    assert.equal(drill.version, 3);
    const variants = drill.variants!;
    assert.equal(variants.length, 3);
    assert.ok(new Set(variants.map((v) => v.target)).size >= 2);
    assert.equal(new Set(variants.map((v) => v.steps.at(-1))).size, 3);
    assert.ok(
      variants.every((v) =>
        /per \d+-second work round\. Rest \d+ seconds/.test(v.target),
      ),
    );
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

test("slalom counts out-and-back runs with its rest budget, not six runs each minute", () => {
  const stage = drills.find((d) => d.id === "slalom")!.variants![2];
  assert.match(drillTarget(stage.target, 360)!, /45s practice \/ 30s rest/);
  assert.match(drillTarget(stage.target, 360)!, /up to 10 over 6:00/);
  assert.doesNotMatch(stage.steps.join(" "), /every four repetitions/);
});

test("toe taps use controlled work rounds and do not count rest as practice", () => {
  const stage = drills.find((d) => d.id === "toe-taps")!.variants![0];
  assert.match(stage.target, /^20 balanced taps per 30-second/);
  assert.match(drillTarget(stage.target, 30)!, /up to 20/);
  assert.match(drillTarget(stage.target, 44)!, /up to 20/);
  assert.match(drillTarget(stage.target, 60)!, /up to 30/);
  assert.match(drillTarget(stage.target, 360)!, /up to 160/);
});
