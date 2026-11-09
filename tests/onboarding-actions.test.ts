import test from "node:test";
import assert from "node:assert/strict";
import {
  flowSteps,
  secondaryActionForStep,
  isFlowStepReady,
  answerOptions,
} from "../src/domain/onboardingFlow";

test("secondary actions are limited to the reference's skip and notification-decline screens", () => {
  const actions = Object.fromEntries(
    flowSteps
      .map((step) => [step, secondaryActionForStep(step)])
      .filter(([, action]) => action !== null),
  );
  assert.deepEqual(actions, {
    measurements: "Skip quiz",
    bodyGoal: "Skip quiz",
    planComparison: "Skip quiz",
    notifications: "Not right now",
    brief: "Skip",
  });
});

test("removing secondary actions keeps private notes optional while quiz choices remain explicit", () => {
  for (const step of [
    "diet",
    "measurements",
    "allergies",
    "aspirations",
    "clubName",
    "schedule",
  ] as const)
    assert.equal(isFlowStepReady({}, step), true, step);
  for (const step of [
    "frequency",
    "club",
    "ambition",
    "tracking",
    "blocker",
    "motivation",
    "level",
    "commitment",
    "consistency",
    "foodSource",
    "playstyle",
  ] as const) {
    assert.equal(isFlowStepReady({}, step), false, step);
    assert.equal(
      isFlowStepReady(
        { position: "Midfielder", answers: { [step]: answerOptions[step][0] } },
        step,
      ),
      true,
      step,
    );
  }
  for (const step of [
    "focus",
    "position",
    "experience",
    "days",
    "duration",
    "space",
    "equipment",
    "identity",
    "plan",
  ] as const)
    assert.equal(isFlowStepReady({}, step), false, step);
});
