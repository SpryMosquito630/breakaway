import type { FlowDraft, FlowStep } from "./onboardingFlow";

export type OnboardingFeedback = {
  id: string;
  title: string;
  body: string;
  icon: "club" | "lineup" | "ball" | "routine" | "calendar";
};
export function feedbackAfterAnswer(
  step: FlowStep,
  draft: FlowDraft,
): OnboardingFeedback | null {
  if (
    step === "club" &&
    ["Yes, a professional / pro academy", "Yes, a grassroots or amateur club"].includes(
      draft.answers?.club ?? "",
    )
  )
    return {
      id: "club",
      title: "Club football is real football",
      body: "Keep your individual practice alongside your club sessions.",
      icon: "club",
    };
  if (step === "ambition" && draft.answers?.ambition === "Make the starting lineup")
    return {
      id: "lineup",
      title: "Starting spots are earned midweek",
      body: "A repeatable week starts with the sessions you can actually keep.",
      icon: "lineup",
    };
  if (
    step === "motivation" &&
    draft.answers?.motivation === "Stay consistent and enjoy the game"
  )
    return {
      id: "routine",
      title: "Consistent beats intense",
      body: "Sessions you enjoy are the ones you repeat. Make room for them in your week.",
      icon: "routine",
    };
  return null;
}
export function feedbackAfterContinue(
  step: FlowStep,
  draft: FlowDraft,
): OnboardingFeedback | null {
  if (step === "equipment" && Array.isArray(draft.gear) && draft.gear.length === 0)
    return {
      id: "ball",
      title: "A ball is enough to start",
      body: "Your plan uses ball-only drills that fit your space.",
      icon: "ball",
    };
  if (step === "days" && new Set(draft.days).size === 4)
    return {
      id: "four-days",
      title: "Four days, serious rhythm",
      body: "Your week has four practice days. You can adjust them any time.",
      icon: "calendar",
    };
  return null;
}

/** The toast owns its own animation/timer lifetime, independent of question navigation. */
export function createFeedbackLifecycle(
  schedule: (callback: () => void, delay: number) => () => void = (callback, delay) => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  },
) {
  let generation = 0;
  let phase = 0;
  let stopTimer: (() => void) | undefined;
  let stopMotion: (() => void) | undefined;
  const cancel = () => {
    generation += 1;
    phase += 1;
    stopTimer?.();
    stopTimer = undefined;
    const stop = stopMotion;
    stopMotion = undefined;
    stop?.();
  };
  return {
    cancel,
    start(
      enter: (complete: () => void) => () => void,
      exit: (complete: () => void) => () => void,
      onHidden: () => void,
      hold = 2400,
    ) {
      cancel();
      const ticket = generation;
      const animate = (run: typeof enter, complete: () => void) => {
        const phaseTicket = ++phase;
        const stop = run(() => {
          if (ticket !== generation || phaseTicket !== phase) return;
          phase += 1;
          stopMotion = undefined;
          complete();
        });
        if (ticket === generation && phaseTicket === phase) stopMotion = stop;
      };
      animate(enter, () => {
        const holdTicket = ++phase;
        stopTimer = schedule(() => {
          if (ticket !== generation || holdTicket !== phase) return;
          phase += 1;
          stopTimer = undefined;
          animate(exit, () => {
            generation += 1;
            onHidden();
          });
        }, hold);
      });
    },
  };
}
