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
};
export type Benchmark = { id: string; date: string; count: number };
export type AppData = {
  version: 1;
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
export function makeSession(
  ids: string[],
  minutes: number,
  now = Date.now(),
): Active {
  const duration = Math.max(30, Math.floor((minutes * 60 - 120) / ids.length));
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
    running: a.remaining - used > 0,
  };
}
export function pause(a: Active, now = Date.now()) {
  return { ...tick(a, now), running: false };
}
export function advance(a: Active, skip = false, now = Date.now()) {
  const t = pause(a, now);
  const completed = !skip && t.remaining <= 0;
  return {
    ...t,
    done: t.done + Number(completed),
    skipped: t.skipped + Number(!completed),
    index: t.index + 1,
    remaining: t.duration,
    phase: "setup" as const,
  };
}
export function recap(a: Active, now = Date.now()): History {
  const t = pause(a, now);
  return {
    id: t.id,
    date: new Date(now).toISOString(),
    seconds: Math.round(t.elapsed),
    done: t.done,
    skipped: t.skipped,
    total: t.ids.length,
    completed: t.done === t.ids.length,
  };
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
    onboarded: true,
  };
}
