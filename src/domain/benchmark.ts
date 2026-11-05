export type BenchmarkRun = {
  phase: "ready" | "countdown" | "running" | "entry" | "cancelled";
  deadline: number;
  remaining: number;
  warningSent: boolean;
  finishSent: boolean;
};
export const readyBenchmark = (): BenchmarkRun => ({
  phase: "ready",
  deadline: 0,
  remaining: 30,
  warningSent: false,
  finishSent: false,
});
export const startBenchmark = (now = Date.now()): BenchmarkRun => ({
  ...readyBenchmark(),
  phase: "countdown",
  deadline: now + 3000,
  remaining: 3,
});
export function tickBenchmark(
  run: BenchmarkRun,
  now = Date.now(),
): { run: BenchmarkRun; signals: ("warning" | "finish")[] } {
  if (run.phase !== "countdown" && run.phase !== "running")
    return { run, signals: [] };
  let next = { ...run };
  if (next.phase === "countdown") {
    if (now < next.deadline)
      return {
        run: { ...next, remaining: Math.ceil((next.deadline - now) / 1000) },
        signals: [],
      };
    next = { ...next, phase: "running", deadline: next.deadline + 30000 };
  }
  next.remaining = Math.max(0, (next.deadline - now) / 1000);
  const signals: ("warning" | "finish")[] = [];
  if (next.remaining > 0 && next.remaining <= 10 && !next.warningSent) {
    next.warningSent = true;
    signals.push("warning");
  }
  if (next.remaining <= 0 && !next.finishSent) {
    next.phase = "entry";
    next.finishSent = true;
    signals.push("finish");
  }
  return { run: next, signals };
}
export function cancelBenchmark(run: BenchmarkRun): BenchmarkRun {
  return {
    ...readyBenchmark(),
    phase: run.phase === "ready" ? "ready" : "cancelled",
  };
}
export function canSaveBenchmark(run: BenchmarkRun, count: string) {
  return run.phase === "entry" && /^\d{1,3}$/.test(count);
}
