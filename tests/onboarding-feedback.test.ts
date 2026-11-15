import test from "node:test";
import assert from "node:assert/strict";
import {
  feedbackAfterAnswer,
  feedbackAfterContinue,
  createFeedbackLifecycle,
} from "../src/domain/onboardingFeedback";
import { createQuestionAdvance } from "../src/domain/questionAdvance";

function fakeClock() {
  const jobs: { callback: () => void; delay: number; cancelled: boolean }[] = [];
  const schedule = (callback: () => void, delay: number) => {
    const job = { callback, delay, cancelled: false };
    jobs.push(job);
    return () => {
      job.cancelled = true;
    };
  };
  return { jobs, schedule };
}
const instant = (complete: () => void) => {
  complete();
  return () => {};
};

test("feedback requires the five explicit observed contexts; intermediate multiselect changes do not trigger it", () => {
  for (const step of ["club", "ambition", "motivation", "equipment", "days"] as const) {
    assert.equal(feedbackAfterAnswer(step, {}), null);
    assert.equal(feedbackAfterContinue(step, {}), null);
  }
  assert.equal(
    feedbackAfterAnswer("club", {
      answers: { club: "Yes, a grassroots or amateur club" },
    })?.id,
    "club",
  );
  assert.equal(
    feedbackAfterAnswer("club", {
      answers: { club: "No, I play casually / with friends" },
    }),
    null,
  );
  assert.equal(
    feedbackAfterAnswer("club", { answers: { club: "Yes, a school or college team" } }),
    null,
  );
  assert.equal(
    feedbackAfterAnswer("ambition", { answers: { ambition: "Make the starting lineup" } })
      ?.id,
    "lineup",
  );
  assert.equal(
    feedbackAfterAnswer("ambition", { answers: { ambition: "Improve my technique" } }),
    null,
  );
  assert.equal(
    feedbackAfterAnswer("motivation", {
      answers: { motivation: "Stay consistent and enjoy the game" },
    })?.id,
    "routine",
  );
  assert.equal(feedbackAfterAnswer("equipment", { gear: [] }), null);
  assert.equal(feedbackAfterContinue("equipment", { gear: [] })?.id, "ball");
  assert.equal(feedbackAfterContinue("equipment", { gear: ["wall"] }), null);
  const days = ["Mon", "Tue", "Thu", "Sat"];
  assert.equal(feedbackAfterAnswer("days", { days }), null);
  assert.equal(feedbackAfterContinue("days", { days })?.id, "four-days");
  assert.equal(feedbackAfterContinue("days", { days: days.slice(0, 3) }), null);
});

test("toast hold never delays question auto-advance or loses its chosen answer", () => {
  const clock = fakeClock();
  const toast = createFeedbackLifecycle(clock.schedule);
  const advance = createQuestionAdvance(clock.schedule);
  let chosen = "";
  let question = 7;
  let hidden = 0;
  advance.choose(
    () => {
      chosen = "Make the starting lineup";
      toast.start(instant, instant, () => {
        hidden += 1;
      });
    },
    () => {
      question += 1;
    },
    180,
  );
  assert.deepEqual(
    clock.jobs.map((job) => job.delay),
    [2400, 180],
  );
  clock.jobs.find((job) => job.delay === 180)!.callback();
  assert.equal(question, 8);
  assert.equal(chosen, "Make the starting lineup");
  assert.equal(hidden, 0, "Toast remains across the next question's slide");
  clock.jobs.find((job) => job.delay === 2400)!.callback();
  assert.equal(hidden, 1);
});

test("replacement and interruption invalidate old timer and native animation completions", () => {
  const clock = fakeClock();
  const toast = createFeedbackLifecycle(clock.schedule);
  const enter: (() => void)[] = [];
  const exit: (() => void)[] = [];
  let hidden = 0;
  const animateEnter = (complete: () => void) => {
    enter.push(complete);
    return () => complete();
  };
  const animateExit = (complete: () => void) => {
    exit.push(complete);
    return () => complete();
  };
  toast.start(animateEnter, animateExit, () => {
    hidden += 1;
  });
  enter[0]();
  toast.start(animateEnter, animateExit, () => {
    hidden += 10;
  });
  assert.equal(clock.jobs[0].cancelled, true);
  clock.jobs[0].callback(); // Already queued timeout from the replaced toast.
  assert.equal(exit.length, 0);
  enter[0](); // Old native completion is also inert.
  assert.equal(clock.jobs.length, 1);
  enter[1]();
  clock.jobs[1].callback();
  assert.equal(exit.length, 1);
  toast.cancel(); // Back, Cancel, focus/background loss and unmount share this cleanup path.
  exit[0]();
  assert.equal(hidden, 0);
  toast.start(instant, instant, () => {
    hidden += 1;
  });
  clock.jobs.at(-1)!.callback();
  assert.equal(hidden, 1, "A later toast still works after cancellation");
});

test("immediate reduced-motion completion remains single-shot, and cancellation invalidates an already queued hold", () => {
  const clock = fakeClock();
  const toast = createFeedbackLifecycle(clock.schedule);
  let hidden = 0;
  toast.start(instant, instant, () => {
    hidden += 1;
  });
  assert.equal(clock.jobs.length, 1);
  clock.jobs[0].callback();
  clock.jobs[0].callback();
  assert.equal(hidden, 1);
  toast.start(instant, instant, () => {
    hidden += 10;
  });
  const queued = clock.jobs[1].callback;
  toast.cancel();
  queued();
  assert.equal(hidden, 1);
  assert.equal(clock.jobs[1].cancelled, true);
});
