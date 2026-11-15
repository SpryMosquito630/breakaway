export const assessmentProtocols = {
  pace: {
    title: "10 m run",
    measure: "seconds",
    target: 2.5,
    duration: null,
    max: 120,
    setup: "A clear, flat 10 m lane plus stopping space · 2 markers · a helper",
    cue: "Stand at the first line. On Go, run through the 10 m line. Your helper stands at the finish and stops the timer as your torso crosses it.",
    count: "Elapsed seconds",
    scoring: "100 at 2.5 sec; score = 2.5 ÷ your seconds × 100, capped at 100.",
    proxy: "Manual timing includes your helper’s reaction time.",
  },
  shooting: {
    title: "10-shot gate test",
    measure: "count",
    target: 10,
    duration: null,
    max: 10,
    setup: "Ball · 2 markers making a 1 m gate · 5 m of clear space",
    cue: "Take 10 ground shots from 5 m. A hit passes fully through the gate without touching a marker. Retrieve and reset each time.",
    count: "Gate hits out of 10",
    scoring: "10 points per hit. Finish all 10 shots before saving.",
    proxy: "Ground-shot accuracy test; not shot power or match finishing.",
  },
  passing: {
    title: "20-pass gate test",
    measure: "count",
    target: 20,
    duration: null,
    max: 20,
    setup: "Ball · 2 markers making a 1 m gate · 5 m of clear space",
    cue: "Take 20 inside-foot ground passes from 5 m. A hit clears the gate without touching a marker. Retrieve and reset each time.",
    count: "Gate hits out of 20",
    scoring: "5 points per hit. Finish all 20 passes before saving.",
    proxy: "Stationary passing accuracy; not passing decisions in play.",
  },
  dribbling: {
    title: "Out-and-back slalom",
    measure: "seconds",
    target: 12,
    duration: null,
    max: 600,
    setup: "Ball · 5 markers in a straight line, 1 m apart · a helper",
    cue: "Start with the ball at marker 1. On Go, weave past markers 2, 3 and 4, round marker 5 once, then weave back past 4, 3 and 2. Helper stops when ball and player cross the start line at marker 1. Missed marker? Repeat the test.",
    count: "Elapsed seconds",
    scoring: "100 at 12 sec; score = 12 ÷ your seconds × 100, capped at 100.",
    proxy: "Fixed-course ball-control test; manual timing has reaction error.",
  },
  defending: {
    title: "Lateral shuffle",
    measure: "count",
    target: 16,
    duration: 30,
    max: 999,
    setup: "2 marked lines, 3 m apart · flat, clear space",
    cue: "Start with one foot on a line. Shuffle sideways between the lines for 30 sec. Keep facing forward, without crossing your feet. Count each arrival with one foot on the opposite line.",
    count: "Line-to-line arrivals",
    scoring: "100 at 16 arrivals; score = arrivals ÷ 16 × 100, capped at 100.",
    proxy: "Defending footwork proxy only; not tackling or tactical defending.",
  },
  physical: {
    title: "60-second toe taps",
    measure: "count",
    target: 90,
    duration: 60,
    max: 999,
    setup: "Ball · a flat, clear 2 m space",
    cue: "Alternate light sole taps on top of the ball for 60 sec. Count each controlled contact. If the ball rolls away, reset and continue.",
    count: "Controlled toe taps",
    scoring: "100 at 90 taps; score = taps ÷ 90 × 100, capped at 100.",
    proxy: "Sustained coordination proxy; not overall fitness or strength.",
  },
} as const;
export type AssessmentSkill = keyof typeof assessmentProtocols;
export type SkillAssessment = {
  id: string;
  date: string;
  skill: AssessmentSkill;
  protocolVersion: 1;
  value: number;
};
export const isAssessmentSkill = (value: unknown): value is AssessmentSkill =>
  typeof value === "string" && Object.hasOwn(assessmentProtocols, value);
export function validAssessmentValue(skill: AssessmentSkill, value: number) {
  const protocol = assessmentProtocols[skill];
  return (
    Number.isFinite(value) &&
    value <= protocol.max &&
    (protocol.measure === "count" ? Number.isInteger(value) && value >= 0 : value >= 1)
  );
}
export function assessmentScore(skill: AssessmentSkill, value: number): number | null {
  if (!validAssessmentValue(skill, value)) return null;
  const protocol = assessmentProtocols[skill];
  return Math.min(
    100,
    Math.round(
      (protocol.measure === "seconds"
        ? protocol.target / value
        : value / protocol.target) * 100,
    ),
  );
}
export function sanitizeAssessments(value: unknown): SkillAssessment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (row): row is SkillAssessment =>
        row !== null &&
        typeof row === "object" &&
        typeof row.id === "string" &&
        typeof row.date === "string" &&
        Number.isFinite(Date.parse(row.date)) &&
        row.protocolVersion === 1 &&
        isAssessmentSkill(row.skill) &&
        typeof row.value === "number" &&
        validAssessmentValue(row.skill, row.value),
    )
    .map(({ id, date, skill, protocolVersion, value }) => ({
      id,
      date,
      skill,
      protocolVersion,
      value,
    }));
}
export function skillAssessmentHistory(
  results: readonly SkillAssessment[],
  skill: AssessmentSkill,
) {
  return sanitizeAssessments(results)
    .filter((row) => row.skill === skill)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .map((row) => ({ ...row, score: assessmentScore(skill, row.value)! }));
}
export type AssessmentRun = {
  phase: "ready" | "countdown" | "running" | "entry" | "cancelled";
  startAt: number;
  remaining: number;
  elapsed: number;
  warningSent: boolean;
};
export const readyAssessment = (): AssessmentRun => ({
  phase: "ready",
  startAt: 0,
  remaining: 0,
  elapsed: 0,
  warningSent: false,
});
export const startAssessment = (now: number): AssessmentRun => ({
  ...readyAssessment(),
  phase: "countdown",
  startAt: now + 3000,
  remaining: 3,
});
export function tickAssessment(
  run: AssessmentRun,
  duration: number | null,
  now: number,
): { run: AssessmentRun; signals: ("start" | "warning" | "finish")[] } {
  if (run.phase !== "countdown" && run.phase !== "running") return { run, signals: [] };
  if (now < run.startAt)
    return {
      run: { ...run, remaining: Math.ceil((run.startAt - now) / 1000) },
      signals: [],
    };
  const elapsed = Math.max(0, (now - run.startAt) / 1000);
  const remaining = duration === null ? 0 : Math.max(0, duration - elapsed);
  const signals: ("start" | "warning" | "finish")[] =
    run.phase === "countdown" ? ["start"] : [];
  const finish = duration !== null && remaining === 0;
  const warning =
    duration !== null && remaining > 0 && remaining <= 10 && !run.warningSent;
  if (finish) signals.push("finish");
  else if (warning) signals.push("warning");
  return {
    run: {
      ...run,
      phase: finish ? "entry" : "running",
      elapsed: duration === null ? elapsed : Math.min(elapsed, duration),
      remaining,
      warningSent: run.warningSent || warning,
    },
    signals,
  };
}
export function finishAssessment(run: AssessmentRun, now: number): AssessmentRun {
  return run.phase === "running"
    ? { ...run, phase: "entry", elapsed: Math.max(0, (now - run.startAt) / 1000) }
    : run;
}
