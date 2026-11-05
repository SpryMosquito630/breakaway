export type Goal = "Ball control" | "Dribbling" | "Passing" | "Weaker foot";
export type Profile = {
  goal: Goal;
  experience: string;
  days: string[];
  minutes: number;
  gear: string[];
  space: string;
};
export type Drill = {
  id: string;
  name: string;
  skill: string;
  gear: string[];
  space: string;
  level: string;
  cue: string;
  steps: string[];
  tip: string;
  version?: number;
  difficulty?: 1 | 2 | 3;
  variants?: {
    difficulty: 1 | 2 | 3;
    label: string;
    target: string;
    cue: string;
    steps: string[];
    tip: string;
  }[];
};
export type DrillResult = {
  id: string;
  version: number;
  difficulty: number;
  status: "done" | "partial" | "skipped";
  seconds: number;
};
export type DrillSnapshot = {
  version: number;
  difficulty: number;
  name?: string;
  cue?: string;
  steps?: string[];
  tip?: string;
  target?: string;
};
export type Active = {
  id: string;
  ids: string[];
  index: number;
  duration: number;
  remaining: number;
  elapsed: number;
  done: number;
  skipped: number;
  running: boolean;
  warmed: boolean;
  phase: "setup" | "timer";
  last: number;
  blockElapsed?: number;
  results?: DrillResult[];
  snapshots?: Record<string, DrillSnapshot>;
  warningSent?: boolean;
  finishSent?: boolean;
};
export type History = {
  id: string;
  date: string;
  seconds: number;
  done: number;
  skipped: number;
  total: number;
  completed: boolean;
  effort?: string;
  drills?: DrillResult[];
};
export type Benchmark = { id: string; date: string; count: number };
export type AppData = {
  version: 1;
  planCustomized?: boolean;
  onboarded: boolean;
  profile: Profile;
  plan: string[];
  active: Active | null;
  history: History[];
  benchmarks: Benchmark[];
};
export const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const goals: Goal[] = [
  "Ball control",
  "Dribbling",
  "Passing",
  "Weaker foot",
];
export const initialData = (): AppData => ({
  version: 1,
  planCustomized: false,
  onboarded: false,
  profile: {
    goal: "Ball control",
    experience: "New to training",
    days: ["Mon", "Wed", "Fri"],
    minutes: 15,
    gear: [],
    space: "Small space",
  },
  plan: [],
  active: null,
  history: [],
  benchmarks: [],
});
export function allowed(d: Drill, p: Profile) {
  return (
    d.gear.every((g) => p.gear.includes(g)) &&
    (p.space === "Open space" || d.space === "Small space")
  );
}
export function matchPlan(all: Drill[], p: Profile) {
  return all
    .filter((d) => allowed(d, p))
    .sort(
      (a, b) =>
        Number(b.skill === p.goal) - Number(a.skill === p.goal) ||
        Number(b.level === p.experience) - Number(a.level === p.experience),
    )
    .slice(0, 3)
    .map((d) => d.id);
}
export function getDrillDuration(minutes: number, count: number) {
  return Math.max(30, Math.floor((minutes * 60 - 120) / Math.max(1, count)));
}
export function snapshotDrill(d?: Drill): DrillSnapshot {
  const difficulty = d?.difficulty ?? 1;
  const variant = d?.variants?.find((v) => v.difficulty === difficulty);
  return {
    version: d?.version ?? 1,
    difficulty,
    ...(d
      ? {
          name: d.name,
          cue: d.cue,
          steps: [...d.steps],
          tip: d.tip,
          target: variant?.target,
        }
      : {}),
  };
}
export function makeSession(
  ids: string[],
  minutes: number,
  now = Date.now(),
  catalog: Drill[] = [],
): Active {
  const duration = getDrillDuration(minutes, ids.length);
  const snapshots: Record<string, DrillSnapshot> = {};
  for (const id of ids) {
    const d = catalog.find((x) => x.id === id);
    snapshots[id] = snapshotDrill(d);
  }
  return {
    id: String(now),
    ids: [...ids],
    index: 0,
    duration,
    remaining: duration,
    elapsed: 0,
    done: 0,
    skipped: 0,
    running: false,
    warmed: false,
    phase: "setup",
    last: now,
    blockElapsed: 0,
    results: [],
    snapshots,
    warningSent: false,
    finishSent: false,
  };
}
export function tick(a: Active, now = Date.now()): Active {
  if (!a.running) return a;
  const used = Math.min(a.remaining, Math.max(0, (now - a.last) / 1000));
  return {
    ...a,
    last: now,
    remaining: a.remaining - used,
    elapsed: a.elapsed + used,
    blockElapsed:
      (a.blockElapsed ?? Math.max(0, a.duration - a.remaining)) + used,
    running: a.remaining - used > 0,
  };
}
export function pause(a: Active, now = Date.now()) {
  return { ...tick(a, now), running: false };
}
export function currentDrillResult(
  a: Active,
  skip = false,
): DrillResult | null {
  const id = a.ids[a.index];
  if (!id) return null;
  const seconds = Math.round(
    a.blockElapsed ?? Math.max(0, a.duration - a.remaining),
  );
  const snapshot = a.snapshots?.[id] ?? { version: 1, difficulty: 1 };
  return {
    id,
    ...snapshot,
    status:
      !skip && a.remaining <= 0 ? "done" : seconds > 0 ? "partial" : "skipped",
    seconds,
  };
}
export function advance(a: Active, skip = false, now = Date.now()) {
  const t = pause(a, now);
  const completed = !skip && t.remaining <= 0;
  const result = currentDrillResult(t, skip);
  return {
    ...t,
    done: t.done + Number(completed),
    skipped: t.skipped + Number(!completed),
    results: [...(t.results ?? []), ...(result ? [result] : [])],
    index: t.index + 1,
    remaining: t.duration,
    blockElapsed: 0,
    warningSent: false,
    finishSent: false,
    phase: "setup" as const,
  };
}
export function replaceActiveDrill(
  a: Active,
  index: number,
  id: string,
  drill?: Drill,
  now = Date.now(),
): Active {
  const t = pause(a, now);
  const result = currentDrillResult(t);
  const results = [
    ...(t.results ?? []),
    ...(result && result.seconds > 0
      ? [{ ...result, status: "partial" as const }]
      : []),
  ];
  const ids = [...t.ids];
  ids[index] = id;
  return {
    ...t,
    ids,
    results,
    snapshots: {
      ...t.snapshots,
      [id]: snapshotDrill(drill),
    },
    remaining: t.duration,
    blockElapsed: 0,
    warningSent: false,
    finishSent: false,
    phase: "setup",
  };
}
export function recap(a: Active, now = Date.now()): History {
  const t = pause(a, now);
  const current = currentDrillResult(t);
  const results = [
    ...(t.results ?? []),
    ...(current && current.seconds > 0 ? [current] : []),
  ];
  const done = t.done + Number(current?.status === "done");
  return {
    id: t.id,
    date: new Date(now).toISOString(),
    seconds: Math.round(t.elapsed),
    done,
    skipped: t.skipped,
    total: t.ids.length,
    completed: done === t.ids.length,
    drills: results,
  };
}
export type TimerSignal = "warning" | "finish";
export function tickWithSignals(
  a: Active,
  now = Date.now(),
): { active: Active; signals: TimerSignal[] } {
  const next = tick(a, now);
  const signals: TimerSignal[] = [];
  if (!a.running) return { active: next, signals };
  if (next.remaining > 0 && next.remaining <= 10 && !next.warningSent) {
    next.warningSent = true;
    signals.push("warning");
  }
  if (next.remaining <= 0 && !next.finishSent) {
    next.finishSent = true;
    signals.push("finish");
  }
  return { active: next, signals };
}
export function benchmarkDelta(first: number, last: number) {
  const value = last - first;
  return {
    value,
    direction: value > 0 ? "up" : value < 0 ? "down" : "same",
    label:
      value > 0
        ? `${value} more than first`
        : value < 0
          ? `${Math.abs(value)} fewer than first`
          : "Same as first",
  } as const;
}
export function time(seconds: number) {
  const n = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

export function completeOnboarding(
  data: AppData,
  profile: Profile,
  matchedPlan: string[],
  replay = false,
): AppData {
  const normalize = (p: Profile) =>
    JSON.stringify({
      ...p,
      days: [...p.days].sort(),
      gear: [...p.gear].sort(),
    });
  const keepPlan =
    replay && data.onboarded && normalize(data.profile) === normalize(profile);
  return {
    ...data,
    profile,
    plan: keepPlan ? data.plan : matchedPlan,
    planCustomized: keepPlan ? data.planCustomized : false,
    onboarded: true,
  };
}
