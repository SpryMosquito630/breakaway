import { type Active, pause, tick } from "./model";

/** Background time is wall-clock reconciliation, never a background JS interval. */
export function restorePracticeClock(active: Active, now = Date.now()): Active {
  if (!active.backgroundClock) return { ...active, running: false };
  const next = tick(active, now);
  return next.remaining <= 0 ? { ...next, finishSent: true } : next;
}
export function practiceLifecycle(
  active: Active,
  foreground: boolean,
  now = Date.now(),
): Active {
  if (active.backgroundClock) return restorePracticeClock(active, now);
  return foreground ? { ...active, running: false } : pause(active, now);
}
export function practiceDeadline(active: Active | null): number | null {
  return active?.backgroundClock &&
    active.running &&
    active.phase === "timer" &&
    active.remaining > 0
    ? Math.round(active.last + active.remaining * 1000)
    : null;
}
