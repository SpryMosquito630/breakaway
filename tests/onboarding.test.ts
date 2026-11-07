import test from "node:test";
import assert from "node:assert/strict";
import { initialData } from "../src/domain/model";
import {
  isOnboardingStepReady,
  profileFromDraft,
} from "../src/domain/onboarding";

test("onboarding starts unanswered and cannot skip required steps", () => {
  for (const step of [1, 2, 3, 4, 5, 6, 7])
    assert.equal(isOnboardingStepReady({}, step), false);
  assert.equal(isOnboardingStepReady({}, 0), true);
  assert.equal(profileFromDraft({}), null);
  assert.equal(isOnboardingStepReady({ goal: "Passing" }, 3), true);
  assert.equal(
    isOnboardingStepReady({ experience: "Some experience" }, 4),
    true,
  );
});

test("schedule needs selected days and an explicitly valid session length", () => {
  assert.equal(isOnboardingStepReady({ days: ["Mon"] }, 5), false);
  assert.equal(isOnboardingStepReady({ minutes: 20 }, 5), false);
  assert.equal(isOnboardingStepReady({ days: [], minutes: 20 }, 5), false);
  assert.equal(isOnboardingStepReady({ days: ["Mon"], minutes: 0 }, 5), false);
  assert.equal(isOnboardingStepReady({ days: ["Mon"], minutes: 20 }, 5), true);
});

test("equipment must be answered explicitly and complete drafts convert without defaults", () => {
  assert.equal(isOnboardingStepReady({ space: "Small space" }, 6), false);
  assert.equal(isOnboardingStepReady({ gear: [] }, 6), false);
  assert.equal(
    isOnboardingStepReady({ space: "Small space", gear: [] }, 6),
    true,
  );
  assert.equal(
    isOnboardingStepReady({ space: "Open space", gear: ["wall"] }, 6),
    true,
  );
  assert.equal(
    isOnboardingStepReady({ space: "Small space", gear: undefined }, 6),
    false,
  );
  const answers = {
    ...initialData().profile,
    ageBand: "13to17" as const,
    position: "Defender" as const,
    goal: "Passing" as const,
    days: ["Tue"],
    minutes: 20,
    gear: [],
  };
  assert.deepEqual(profileFromDraft(answers), answers);
  assert.equal(profileFromDraft({ ...answers, minutes: undefined }), null);
  assert.equal(profileFromDraft({ ...answers, gear: undefined }), null);
});


test("age range is explicit, local-only and neutral; every range can train", () => {
  for (const ageBand of ["under13", "13to17", "adult"] as const) {
    assert.equal(isOnboardingStepReady({ ageBand }, 1), true);
    assert.equal(profileFromDraft({ ...initialData().profile, position: "Defender", ageBand })?.ageBand, ageBand);
  }
  assert.equal(isOnboardingStepReady({}, 1), false);
  assert.equal(isOnboardingStepReady({ ageBand: "invalid" as never }, 1), false);
});
