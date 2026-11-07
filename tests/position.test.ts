import test from "node:test";
import assert from "node:assert/strict";
import { initialData, positions, matchPlan, allowed, updateTrainingProfile, completeOnboarding } from "../src/domain/model";
import { isOnboardingStepReady, profileFromDraft } from "../src/domain/onboarding";
import { planForDate } from "../src/domain/planning";
import { restoreAppData } from "../src/domain/storage";
import { drills } from "../src/data/drills";
const monday = new Date(2026, 10, 2, 12);

test("position is an explicit required onboarding answer, including exploring; no answer is inferred", () => {
  const oldProfile = initialData().profile;
  assert.equal(oldProfile.position, undefined);
  assert.equal(isOnboardingStepReady({}, 2), false);
  assert.equal(isOnboardingStepReady({ position: undefined }, 2), false);
  assert.equal(profileFromDraft(oldProfile), null);
  for (const position of positions) {
    assert.equal(isOnboardingStepReady({ position }, 2), true);
    assert.equal(profileFromDraft({ ...oldProfile, position, ageBand: "13to17" })?.position, position);
  }
});
test("saved positions round-trip; legacy and malformed positions stay unset without rejecting progress", () => {
  const data = { ...initialData(), benchmarks: [{ id: "old", count: 25, date: new Date(0).toISOString() }] };
  for (const position of positions) {
    assert.equal(restoreAppData(JSON.stringify({ ...data, profile: { ...data.profile, position } }), drills).profile.position, position);
  }
  for (const position of [undefined, "invalid", null, 5, []]) {
    const restored = restoreAppData(JSON.stringify({ ...data, profile: { ...data.profile, position } }), drills);
    assert.equal(restored.profile.position, undefined);
    assert.deepEqual(restored.benchmarks, data.benchmarks);
    assert.equal(restored.onboarded, false);
  }
});
test("position selects a daily support family while two focus drills and rotation remain", () => {
  const base = initialData().profile;
  const keeper = { ...base, position: "Goalkeeper" as const };
  const forward = { ...base, position: "Forward" as const };
  const keeperPlan = planForDate(drills, keeper, [], monday, false);
  const forwardPlan = planForDate(drills, forward, [], monday, false);
  assert.notDeepEqual(keeperPlan, forwardPlan);
  assert.equal(drills.find((d) => d.id === keeperPlan[2])!.skill, "Passing");
  assert.equal(drills.find((d) => d.id === forwardPlan[2])!.skill, "Dribbling");
  for (const profile of [keeper, forward]) {
    const week = [2, 4, 6].map((day) => planForDate(drills, profile, [], new Date(2026, 10, day, 12), false));
    assert.equal(new Set(week.map((plan) => plan.join())).size, 3);
    for (const plan of week) assert.ok(plan.slice(0, 2).every((id) => drills.find((d) => d.id === id)!.skill === profile.goal));
  }
  assert.deepEqual(planForDate(drills, { ...base, position: "Still exploring" }, [], monday, false), planForDate(drills, base, [], monday, false));
});
test("all position plans honor space and equipment constraints without duplicate drills", () => {
  for (const position of positions) for (const goal of ["Ball control", "Passing", "Dribbling", "Weaker foot"] as const) for (const space of ["Small space", "Open space"]) {
    const profile = { ...initialData().profile, position, goal, space };
    for (const plan of [matchPlan(drills, profile), planForDate(drills, profile, [], monday, false)]) {
      assert.equal(plan.length, 3);
      assert.equal(new Set(plan).size, 3);
      assert.ok(plan.every((id) => allowed(drills.find((d) => d.id === id)!, profile)));
    }
  }
});
test("position-only edits and replay preserve customized plans and all data; unrelated legacy edits stay possible", () => {
  const state = { ...initialData(), onboarded: true, planCustomized: true, plan: ["weak", "sole", "inside"] };
  const profile = { ...state.profile, position: "Forward" as const };
  const edited = updateTrainingProfile(state, profile, drills);
  assert.deepEqual(edited.plan, state.plan);
  assert.equal(edited.planCustomized, true);
  assert.deepEqual(completeOnboarding(state, profile, matchPlan(drills, profile), true).plan, state.plan);
  assert.deepEqual(planForDate(drills, profile, edited.plan, monday, edited.planCustomized), state.plan);
  const legacyEdit = updateTrainingProfile(initialData(), { ...initialData().profile, minutes: 20 }, drills);
  assert.equal(legacyEdit.profile.position, undefined);
  assert.equal(legacyEdit.profile.minutes, 20);
  // Canonical comparison must not depend on object key insertion order.
  const positionFirst = { position: "Forward" as const, ...state.profile };
  assert.equal(updateTrainingProfile({ ...edited }, positionFirst, drills).planCustomized, true);
});


test("replaying onboarding or editing training cannot upgrade a saved under-13 restriction", () => {
  const state = initialData(); state.profile.ageBand = "under13";
  const incoming = { ...state.profile, ageBand: "adult" as const, position: "Forward" as const };
  assert.equal(completeOnboarding(state, incoming, matchPlan(drills, incoming), true).profile.ageBand, "under13");
  assert.equal(updateTrainingProfile(state, incoming, drills).profile.ageBand, "under13");
});
