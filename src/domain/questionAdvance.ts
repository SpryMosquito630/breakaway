/** A selection owns at most one delayed transition. Cancellation invalidates queued callbacks too. */
export function createQuestionAdvance(
  schedule: (callback: () => void, delay: number) => () => void = (callback, delay) => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  },
) {
  let generation = 0;
  let locked = false;
  let stop: (() => void) | undefined;
  const cancel = () => {
    generation += 1;
    locked = false;
    stop?.();
    stop = undefined;
  };
  return {
    cancel,
    choose(applyAnswer: () => void, advance: () => void, delay = 180): boolean {
      if (locked) return false;
      locked = true;
      const ticket = ++generation;
      // Commit the explicit answer before starting its transition, including zero-delay mode.
      applyAnswer();
      stop = schedule(() => {
        if (ticket !== generation || !locked) return;
        // Remain locked until the owner changes screens or cancels; duplicate callbacks are inert.
        generation += 1;
        stop = undefined;
        advance();
      }, delay);
      return true;
    },
  };
}

/** Interruptible scene ownership; stale native animation completions cannot clear a newer scene. */
export function createSceneTransition() {
  let generation = 0;
  let active = false;
  let stop: (() => void) | undefined;
  return {
    get active() {
      return active;
    },
    start(run: (complete: () => void) => () => void, onComplete: () => void) {
      if (active) return false;
      active = true;
      const ticket = ++generation;
      const cancelRun = run(() => {
        if (ticket !== generation || !active) return;
        active = false;
        stop = undefined;
        generation += 1;
        onComplete();
      });
      if (ticket === generation && active) stop = cancelRun;
      return true;
    },
    cancel() {
      generation += 1;
      active = false;
      const cancelRun = stop;
      stop = undefined;
      cancelRun?.();
    },
  };
}

/** The reference opens Q1 with an overlapping dissolve; later questions slide. */
export function sceneTransitionForSteps(
  from: import("./onboardingFlow").FlowStep,
  to: import("./onboardingFlow").FlowStep,
): { kind: "crossfade" | "slide"; duration: number } {
  return from === "intro" && to === "frequency"
    ? { kind: "crossfade", duration: 240 }
    : { kind: "slide", duration: 260 };
}
