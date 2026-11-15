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
  answers: {
    playstyle: "Kevin De Bruyne",
    positionDetail: "CM",
    trainingLocation: "Backyard / small space",
  },
};

test("setup ends with a separate player card after the real first-session preview", () => {
  assert.deepEqual(flowSteps, [
    "welcome",
    "focus",
    "position",
    "playstyle",
    "experience",
    "equipment",
    "days",
    "name",
    "identity",
    "measurements",
    "plan",
    "playerCard",
  ]);
  assert.deepEqual(autoAdvanceSteps, ["focus", "position", "experience"]);
  for (const step of flowSteps) assert.equal(secondaryActionForStep(step), null);
});

test("fresh setup never preselects required choices and merged forms require both parts", () => {
  for (const step of flowSteps) {
    assert.equal(
      isFlowStepReady({}, step),
      ["welcome", "name", "measurements"].includes(step),
      step,
    );
    assert.equal(isFlowStepReady(ready, step), true, step);
  }
  assert.equal(isFlowStepReady({ gear: [] }, "equipment"), false);
  assert.equal(isFlowStepReady({ space: "Small space" }, "equipment"), false);
  assert.equal(isFlowStepReady({ gear: [], space: "Small space" }, "equipment"), false);
  assert.equal(
    isFlowStepReady(
      {
        gear: [],
        space: "Small space",
        answers: { trainingLocation: "Backyard / small space" },
      },
      "equipment",
    ),
    true,
  );
  assert.equal(
    isFlowStepReady(
      { gear: [], space: "Open space", answers: { trainingLocation: "Indoor / garage" } },
      "equipment",
    ),
    false,
  );
  assert.equal(isFlowStepReady({ days: ["Tue"] }, "days"), false);
  assert.equal(isFlowStepReady({ minutes: 15 }, "days"), false);
  assert.equal(isFlowStepReady({ days: [], minutes: 15 }, "days"), false);
  assert.equal(isFlowStepReady({ days: ["Tue"], minutes: 15 }, "days"), true);
  assert.equal(autoAdvanceSteps.includes("equipment"), false);
  assert.equal(autoAdvanceSteps.includes("days"), false);
  assert.equal(autoAdvanceSteps.includes("identity"), false);
  assert.equal(autoAdvanceSteps.includes("name"), false);
  assert.equal(isFlowStepReady({ answers: { name: "Alex" } }, "identity"), false);
});
