import test from "node:test";
import assert from "node:assert/strict";
import { initialData } from "../src/domain/model";
import {
  isOnboardingStepReady,
  profileFromDraft,
} from "../src/domain/onboarding";

test("onboarding starts unanswered and cannot skip required steps", () => {
  for (const step of [1, 2, 3, 4, 5])
    assert.equal(isOnboardingStepReady({}, step), false);
  assert.equal(isOnboardingStepReady({}, 0), true);
  assert.equal(profileFromDraft({}), null);
  assert.equal(isOnboardingStepReady({ goal: "Passing" }, 1), true);
  assert.equal(
    isOnboardingStepReady({ experience: "Some experience" }, 2),
    true,
  );
});

test("schedule needs selected days and an explicitly valid session length", () => {
  assert.equal(isOnboardingStepReady({ days: ["Mon"] }, 3), false);
  assert.equal(isOnboardingStepReady({ minutes: 20 }, 3), false);
  assert.equal(isOnboardingStepReady({ days: [], minutes: 20 }, 3), false);
  assert.equal(isOnboardingStepReady({ days: ["Mon"], minutes: 0 }, 3), false);
  assert.equal(isOnboardingStepReady({ days: ["Mon"], minutes: 20 }, 3), true);
});

test("equipment must be answered explicitly and complete drafts convert without defaults", () => {
  assert.equal(isOnboardingStepReady({ space: "Small space" }, 4), false);
  assert.equal(isOnboardingStepReady({ gear: [] }, 4), false);
  assert.equal(
    isOnboardingStepReady({ space: "Small space", gear: [] }, 4),
    true,
  );
  assert.equal(
    isOnboardingStepReady({ space: "Open space", gear: ["wall"] }, 4),
    true,
  );
  assert.equal(
    isOnboardingStepReady({ space: "Small space", gear: undefined }, 4),
    false,
  );
  const answers = {
    ...initialData().profile,
    goal: "Passing" as const,
    days: ["Tue"],
    minutes: 20,
    gear: [],
  };
  assert.deepEqual(profileFromDraft(answers), answers);
  assert.equal(profileFromDraft({ ...answers, minutes: undefined }), null);
  assert.equal(profileFromDraft({ ...answers, gear: undefined }), null);
});
