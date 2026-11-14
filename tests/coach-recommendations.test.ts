import test from "node:test";
import assert from "node:assert/strict";
import {
  coachContext,
  coachDrills,
  offlineCoach,
  remoteCoachAllowed,
  saveMissingCoachAge,
  validateCoachReply,
} from "../src/coachAi/recommendations";
import { initialData, allowed, recommendedForPosition } from "../src/domain/model";
import { drills } from "../src/data/drills";

test("Legacy Coach age recovery only fills a missing range and preserves training data", () => {
  const legacy = initialData();
  delete legacy.profile.ageBand;
  const saved = saveMissingCoachAge(legacy, "adult");
  assert.equal(legacy.profile.ageBand, undefined);
  assert.equal(saved.profile.ageBand, "adult");
  assert.equal(remoteCoachAllowed(saved.profile.ageBand, true), true);
  assert.equal(saved.plan, legacy.plan);
  assert.equal(saved.history, legacy.history);
  assert.equal(saved.assessments, legacy.assessments);
  assert.equal(saved.active, legacy.active);
  for (const age of ["under13", "13to17", "adult"] as const) {
    const existing = { ...legacy, profile: { ...legacy.profile, ageBand: age } };
    assert.equal(saveMissingCoachAge(existing, "adult"), existing);
    assert.equal(existing.profile.ageBand, age);
  }
  const younger = saveMissingCoachAge(legacy, "under13");
  assert.equal(remoteCoachAllowed(younger.profile.ageBand, true), false);
  assert.equal(saveMissingCoachAge(younger, "adult"), younger);
});

test("Coach recommends real catalog drills that respect gear, space and specialist position", () => {
  const data = initialData();
  data.profile.position = "Forward";
  for (const query of ["practice", "passing", "weaker foot", "dribbling"]) {
    const result = coachDrills(query, data, drills);
    assert.ok(result.length > 0);
    assert.ok(
      result.every(
        (d) =>
          drills.includes(d) &&
          allowed(d, data.profile) &&
          recommendedForPosition(d, data.profile),
      ),
    );
  }
  assert.equal(coachDrills("weaker foot", data, drills)[0].skill, "Weaker foot");
  assert.ok(!coachDrills("passing", data, drills).some((d) => d.gear.includes("wall")));
  data.profile.gear = ["wall"];
  assert.ok(coachDrills("passing", data, drills).some((d) => d.id === "wall"));
});
test("Offline guide labels its source and uses actual catalog cues and saved activity", () => {
  const data = initialData();
  const reply = offlineCoach("practice today", data, drills);
  assert.equal(reply.source, "offline");
  const first = drills.find((d) => d.id === reply.drillIds[0])!;
  assert.ok(reply.reply.includes(first.name));
  assert.ok(reply.reply.includes(first.cue));
  assert.match(
    offlineCoach("my sessions", data, drills).reply,
    /0 completed saved sessions/,
  );
  assert.match(offlineCoach("tests", data, drills).reply, /no saved skill assessments/);
  assert.deepEqual(offlineCoach("injury pain", data, drills).drillIds, []);
  assert.match(offlineCoach("injury pain", data, drills).reply, /qualified professional/);
});
test("Explicit focus requests return that skill and describe the requested focus", () => {
  const data = initialData();
  data.profile.goal = "Ball control";
  for (const [query, skill] of [
    ["passing", "Passing"],
    ["passing drills for a goalkeeper", "Passing"],
    ["work on my weaker foot", "Weaker foot"],
    ["non-dominant foot", "Weaker foot"],
    ["dribbling", "Dribbling"],
  ]) {
    const reply = offlineCoach(query, data, drills);
    assert.ok(reply.drillIds.length > 0);
    assert.ok(
      reply.drillIds.every((id) => drills.find((d) => d.id === id)?.skill === skill),
    );
    assert.ok(reply.reply.includes(skill.toLowerCase()));
  }
  assert.equal(data.profile.goal, "Ball control");
});
test("Unavailable focus does not silently return unrelated drills", () => {
  const data = initialData();
  const catalog = drills.filter((d) => d.skill === "Ball control");
  const reply = offlineCoach("passing", data, catalog);
  assert.deepEqual(reply.drillIds, []);
  assert.match(reply.reply, /No passing catalog drills/);
});
test("Unsupported questions explain offline capabilities instead of repeating generic drills", () => {
  const data = initialData();
  for (const query of [
    "hello",
    "how does this work?",
    "shooting drills",
    "shooting practice",
    "how can I improve shooting",
    "fitness training",
    "return",
    "weather today",
  ]) {
    const reply = offlineCoach(query, data, drills);
    assert.deepEqual(reply.drillIds, []);
    assert.match(reply.reply, /offline guide matches catalog drills/);
  }
  data.plan = ["sole"];
  assert.match(offlineCoach("my plan", data, drills).reply, /Sole rolls/);
});
test("Remote gate fails closed for unknown and under-13 age or disabled build", () => {
  assert.equal(remoteCoachAllowed(undefined, true), false);
  assert.equal(remoteCoachAllowed("under13", true), false);
  assert.equal(remoteCoachAllowed("adult", false), false);
  assert.equal(remoteCoachAllowed("adult", true), true);
  assert.equal(remoteCoachAllowed("13to17", true), true);
});
test("Remote context minimizes personal data and constrains AI to usable catalog drills", () => {
  const data = initialData();
  const context = coachContext(data, drills);
  assert.deepEqual(Object.keys(context).sort(), [
    "allowedDrillIds",
    "goal",
    "plan",
    "position",
  ]);
  assert.ok(context.plan.every((row) => context.allowedDrillIds.includes(row.id)));
  assert.ok(!context.allowedDrillIds.includes("wall"));
  assert.throws(() =>
    validateCoachReply(
      { source: "openai", reply: "Try this", drillIds: ["wall"] },
      context.allowedDrillIds,
    ),
  );
  assert.throws(() =>
    validateCoachReply({ reply: "fake", drillIds: [] }, context.allowedDrillIds),
  );
  assert.throws(() =>
    validateCoachReply(
      { source: "openai", reply: "", drillIds: [] },
      context.allowedDrillIds,
    ),
  );
  assert.equal(
    validateCoachReply(
      { source: "openai", reply: "Try this", drillIds: [context.allowedDrillIds[0]] },
      context.allowedDrillIds,
    ).source,
    "openai",
  );
});
test("Gemini replies require the selected provider and eligible drill IDs", () => {
  const value = { source: "gemini", reply: "Try sole rolls.", drillIds: ["sole"] };
  assert.equal(validateCoachReply(value, ["sole"], "gemini").source, "gemini");
  assert.throws(() => validateCoachReply(value, ["sole"], "openai"));
  assert.throws(() => validateCoachReply(value, [], "gemini"));
});
