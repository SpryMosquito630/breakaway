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
