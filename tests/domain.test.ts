import test from "node:test";
import assert from "node:assert/strict";
import {
  initialData,
  completeOnboarding,
  matchPlan,
  allowed,
  makeSession,
  tick,
  pause,
  advance,
  recap,
} from "../src/domain/model";
import { drills } from "../src/data/drills";
test("plan satisfies equipment and small-space constraints for every focus", () => {
  for (const goal of ["Ball control", "Passing", "Dribbling", "Weaker foot"] as const) {
    const p = { ...initialData().profile, goal };
    const plan = matchPlan(drills, p).map((id) => drills.find((d) => d.id === id)!);
    assert.equal(plan.length, 3);
    assert.equal(new Set(plan.map((d) => d.id)).size, 3);
    assert.ok(plan.every((d) => allowed(d, p)));
    if (goal === "Passing") assert.equal(plan[0].id, "push");
  }
});
test("experience breaks matching ties and wall drills require a wall", () => {
  const p = {
    ...initialData().profile,
    goal: "Passing" as const,
    experience: "Some experience",
    gear: ["wall"],
  };
  assert.equal(matchPlan(drills, p)[0], "wall");
  assert.equal(
    allowed(
      drills.find((d) => d.id === "partner")!,
      p,
    ),
    false,
  );
});
test("timer uses elapsed time rather than tick count, caps at remaining duration", () => {
  let a = makeSession(["sole"], 5, 1000);
  a = { ...a, running: true };
  a = tick(a, 2500);
  assert.equal(a.elapsed, 1.5);
  a = tick(a, 999999);
  assert.equal(a.elapsed, 180);
  assert.equal(a.remaining, 0);
  assert.equal(a.running, false);
});
test("pause excludes background and resume only counts newly elapsed practice", () => {
  let a = { ...makeSession(["sole"], 5, 1000), running: true };
  a = pause(a, 6000);
  a = tick(a, 999000);
  assert.equal(a.elapsed, 5);
  a = { ...a, running: true, last: 999000 };
  a = tick(a, 1000000);
  assert.equal(a.elapsed, 6);
});
test("early advance is partial while full blocks complete", () => {
  let a = { ...makeSession(["sole", "inside"], 5, 0), running: true };
  a = advance(a, false, 5000);
  assert.equal(a.done, 0);
  assert.equal(a.skipped, 1);
  assert.equal(a.elapsed, 5);
  a = { ...a, running: true, last: 5000 };
  a = advance(a, false, 1000000);
  const h = recap(a, 1000000);
  assert.equal(h.done, 1);
  assert.equal(h.completed, false);
  assert.equal(h.seconds, 95);
});
test("all finished timers create a completed recap; skipped blocks do not", () => {
  let a = { ...makeSession(["sole"], 5, 0), running: true };
  a = advance(a, false, 180000);
  assert.equal(recap(a, 180000).completed, true);
  const skipped = advance(makeSession(["sole"], 5, 0), true, 1000);
  assert.equal(recap(skipped, 1000).completed, false);
  assert.equal(recap(skipped, 1000).seconds, 0);
});
test("replacing a block keeps elapsed time and restores full remaining duration", () => {
  let a = { ...makeSession(["sole"], 5, 0), running: true };
  a = pause(a, 12000);
  a = { ...a, ids: ["weak"], remaining: a.duration, phase: "setup" };
  assert.equal(a.elapsed, 12);
  assert.equal(a.remaining, 180);
  assert.equal(a.running, false);
});

test("replaying unchanged preferences preserves custom plan and all saved progress", () => {
  const data = initialData();
  data.onboarded = true;
  data.profile.gear = ["wall", "markers"];
  data.plan = ["weak", "sole", "inside"];
  data.active = makeSession(["weak"], 5, 1000);
  data.history = [
    {
      id: "old",
      date: new Date(0).toISOString(),
      seconds: 15,
      done: 0,
      skipped: 1,
      total: 1,
      completed: false,
    },
  ];
  data.benchmarks = [{ id: "baseline", date: new Date(0).toISOString(), count: 25 }];
  const replayed = completeOnboarding(
    data,
    {
      ...data.profile,
      gear: ["markers", "wall"],
      days: [...data.profile.days].reverse(),
    },
    ["inside", "sole", "push"],
    true,
  );
  assert.equal(replayed.plan, data.plan);
  assert.equal(replayed.history, data.history);
  assert.equal(replayed.benchmarks, data.benchmarks);
  assert.equal(replayed.active, data.active);
});

test("changed replay answers rebuild the next plan without clearing saved session data", () => {
  const data = initialData();
  data.onboarded = true;
  data.plan = ["inside", "sole", "turn"];
  data.active = makeSession(data.plan, 15, 1000);
  const profile = { ...data.profile, goal: "Passing" as const };
  const matched = matchPlan(drills, profile);
  const replayed = completeOnboarding(data, profile, matched, true);
  assert.equal(replayed.plan, matched);
  assert.equal(replayed.profile.goal, "Passing");
  assert.equal(replayed.active, data.active);
  assert.equal(replayed.history, data.history);
  assert.equal(replayed.benchmarks, data.benchmarks);
  const firstRun = completeOnboarding(initialData(), initialData().profile, matched);
  assert.equal(firstRun.plan, matched);
  assert.equal(firstRun.onboarded, true);
});
