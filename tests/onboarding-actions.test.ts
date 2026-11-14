import test from "node:test";
import assert from "node:assert/strict";
import {
  flowSteps,
  secondaryActionForStep,
  isFlowStepReady,
  autoAdvanceSteps,
  type FlowDraft,
} from "../src/domain/onboardingFlow";

const ready: FlowDraft = {
  ageBand: "adult",
  position: "Midfielder",
  goal: "Passing",
  experience: "Some experience",
  gear: [],
  space: "Small space",
  days: ["Tue"],
  minutes: 15,
  answers: { playstyle: "Kevin De Bruyne", positionDetail: "CM" },
};

test("short setup visits ten useful screens including optional measurements without legacy questionnaires or fake generation", () => {
  assert.deepEqual(flowSteps, [
    "welcome",
    "focus",
    "position",
    "playstyle",
    "experience",
    "equipment",
    "days",
    "identity",
    "measurements",
    "plan",
  ]);
  assert.deepEqual(autoAdvanceSteps, ["focus", "position", "experience"]);
  for (const step of flowSteps) assert.equal(secondaryActionForStep(step), null);
});

test("fresh setup never preselects required choices and merged forms require both parts", () => {
  for (const step of flowSteps) {
    assert.equal(
      isFlowStepReady({}, step),
      step === "welcome" || step === "measurements",
      step,
    );
    assert.equal(isFlowStepReady(ready, step), true, step);
  }
  assert.equal(isFlowStepReady({ gear: [] }, "equipment"), false);
  assert.equal(isFlowStepReady({ space: "Small space" }, "equipment"), false);
  assert.equal(isFlowStepReady({ gear: [], space: "Small space" }, "equipment"), true);
  assert.equal(isFlowStepReady({ days: ["Tue"] }, "days"), false);
  assert.equal(isFlowStepReady({ minutes: 15 }, "days"), false);
  assert.equal(isFlowStepReady({ days: [], minutes: 15 }, "days"), false);
  assert.equal(isFlowStepReady({ days: ["Tue"], minutes: 15 }, "days"), true);
  assert.equal(autoAdvanceSteps.includes("equipment"), false);
  assert.equal(autoAdvanceSteps.includes("days"), false);
  assert.equal(autoAdvanceSteps.includes("identity"), false);
});
