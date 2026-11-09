import test from "node:test";
import assert from "node:assert/strict";
import { createQuestionAdvance } from "../src/domain/questionAdvance";
import { autoAdvanceSteps, type FlowDraft } from "../src/domain/onboardingFlow";

function queue() {
  const callbacks: (() => void)[] = [];
  const cancelled: number[] = [];
  const delays: number[] = [];
  const advance = createQuestionAdvance((callback, delay) => {
    const id = callbacks.push(callback) - 1;
    delays.push(delay);
    return () => {
      cancelled.push(id);
    };
  });
  return { advance, callbacks, cancelled, delays };
}

test("one explicit answer is committed before transition; rapid taps cannot overwrite or advance twice", () => {
  const { advance, callbacks } = queue();
  let draft: FlowDraft = {};
  let screen = 13;
  const choose = (position: "Midfielder" | "Forward", positionDetail: string) =>
    advance.choose(
      () => {
        draft = { ...draft, position, answers: { ...draft.answers, positionDetail } };
      },
      () => {
        assert.equal(draft.position, "Midfielder");
        assert.equal(draft.answers?.positionDetail, "CM");
        screen += 1;
      },
    );
  assert.equal(choose("Midfielder", "CM"), true);
  assert.equal(screen, 13, "Feedback is shown before advancing");
  assert.equal(choose("Forward", "ST"), false);
  assert.equal(callbacks.length, 1);
  callbacks[0]();
  callbacks[0]();
  assert.equal(screen, 14);
  assert.equal(draft.position, "Midfielder");
  assert.equal(
    choose("Forward", "ST"),
    false,
    "Old row callbacks stay locked after transition",
  );
});

test("Back, cancellation, background or blur invalidates pending callbacks while retaining the chosen draft", () => {
  for (const reason of ["Back", "Cancel", "background", "blur", "unmount"]) {
    const { advance, callbacks, cancelled } = queue();
    let draft: FlowDraft = {};
    let transitions = 0;
    advance.choose(
      () => {
        draft = { answers: { frequency: "Daily" } };
      },
      () => {
        transitions += 1;
      },
    );
    advance.cancel();
    assert.deepEqual(cancelled, [0], reason);
    callbacks[0](); // Simulate an already queued timeout racing cancellation.
    assert.equal(transitions, 0, reason);
    assert.equal(draft.answers?.frequency, "Daily", reason);
    advance.choose(
      () => {
        draft = { ...draft, goal: "Passing" };
      },
      () => {
        transitions += 1;
      },
    );
    callbacks[0](); // An old screen's callback cannot move the newer screen.
    assert.equal(transitions, 0, reason);
    callbacks[1]();
    assert.equal(transitions, 1, reason);
    assert.equal(draft.goal, "Passing", reason);
  }
});

test("zero-delay reduced-motion transitions still commit the answer first and never select defaults", () => {
  const { advance, callbacks, delays } = queue();
  let draft: FlowDraft = {};
  const completed: FlowDraft[] = [];
  assert.deepEqual(draft, {});
  assert.equal(callbacks.length, 0);
  advance.choose(
    () => {
      draft = { experience: "Some experience", answers: { years: "2–5 years" } };
    },
    () => {
      completed.push(draft);
    },
    0,
  );
  assert.deepEqual(delays, [0]);
  assert.equal(completed.length, 0);
  callbacks[0]();
  assert.equal(completed[0]?.experience, "Some experience");
  assert.equal(completed[0]?.answers?.years, "2–5 years");
  for (const explicit of [
    "level",
    "commitment",
    "playstyle",
    "diet",
    "equipment",
    "days",
    "aspirations",
    "allergies",
    "measurements",
    "plan",
  ])
    assert.equal(autoAdvanceSteps.includes(explicit as never), false, explicit);
});
