import {
  AppData,
  Drill,
  DrillResult,
  DrillSnapshot,
  Profile,
  days,
  goals,
  matchPlan,
} from "./model";
const record = (x: unknown): x is Record<string, unknown> =>
  x !== null && typeof x === "object" && !Array.isArray(x);
function results(value: unknown): DrillResult[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(
    (r): r is DrillResult =>
      record(r) &&
      typeof r.id === "string" &&
      Number.isInteger(r.version) &&
      Number(r.version) >= 1 &&
      typeof r.difficulty === "number" &&
      [1, 2, 3].includes(r.difficulty) &&
      ["done", "partial", "skipped"].includes(String(r.status)) &&
      typeof r.seconds === "number" &&
      Number.isFinite(r.seconds) &&
      r.seconds >= 0 &&
      (r.status !== "done" || r.seconds > 0),
  );
}
function snapshots(value: unknown): Record<string, DrillSnapshot> | undefined {
  if (!record(value)) return undefined;
  const safe: Record<string, DrillSnapshot> = Object.create(null);
  for (const [id, v] of Object.entries(value)) {
    if (
      !record(v) ||
      !Number.isInteger(v.version) ||
      Number(v.version) < 1 ||
      typeof v.difficulty !== "number" ||
      ![1, 2, 3].includes(v.difficulty)
    )
      continue;
    safe[id] = { version: Number(v.version), difficulty: Number(v.difficulty) };
    for (const key of ["name", "cue", "tip", "target"] as const)
      if (typeof v[key] === "string") safe[id][key] = v[key];
    if (Array.isArray(v.steps) && v.steps.every((x) => typeof x === "string"))
      safe[id].steps = v.steps;
  }
  return safe;
}
export function restoreAppData(raw: string, catalog: Drill[]): AppData {
  const p = JSON.parse(raw);
  const profile = p.profile;
  if (
    p.version !== 1 ||
    typeof p.onboarded !== "boolean" ||
    !profile ||
    !goals.includes(profile.goal) ||
    !["New to training", "Some experience"].includes(profile.experience) ||
    ![15, 20, 30].includes(profile.minutes) ||
    !Array.isArray(profile.days) ||
    !profile.days.length ||
    !profile.days.every((d: string) => days.includes(d)) ||
    !Array.isArray(profile.gear) ||
    !profile.gear.every((g: string) =>
      ["markers", "wall", "partner"].includes(g),
    ) ||
    !["Small space", "Open space"].includes(profile.space) ||
    !Array.isArray(p.plan) ||
    !Array.isArray(p.history) ||
    !Array.isArray(p.benchmarks)
  )
    throw Error("Invalid saved preferences");
  const known = (id: string) => catalog.some((d) => d.id === id);
  p.plan =
    p.plan.length && p.plan.every(known) ? p.plan : matchPlan(catalog, profile);
  p.planCustomized = classifyPlanCustomization(
    p.plan,
    catalog,
    profile,
    p.planCustomized,
  );
  if (p.active) {
    const a = p.active;
    if (
      !Array.isArray(a.ids) ||
      !a.ids.length ||
      !a.ids.every(known) ||
      !Number.isInteger(a.index) ||
      a.index < 0 ||
      a.index >= a.ids.length ||
      !["setup", "timer"].includes(a.phase) ||
      !["duration", "remaining", "elapsed", "done", "skipped", "last"].every(
        (k) => Number.isFinite(a[k]) && a[k] >= 0,
      ) ||
      a.duration < 1 ||
      a.remaining > a.duration
    )
      throw Error("Invalid saved session");
    p.active = {
      ...a,
      running: false,
      blockElapsed: Math.min(
        a.duration,
        a.elapsed,
        Number.isFinite(a.blockElapsed) && a.blockElapsed >= 0
          ? a.blockElapsed
          : Math.max(0, a.duration - a.remaining),
      ),
      results: results(a.results),
      snapshots: snapshots(a.snapshots),
      warningSent: a.warningSent === true,
      finishSent: a.finishSent === true,
    };
  }
  p.history = p.history
    .filter(
      (h: any) =>
        record(h) &&
        typeof h.id === "string" &&
        typeof h.date === "string" &&
        Number.isFinite(Date.parse(h.date)) &&
        typeof h.seconds === "number" &&
        Number.isFinite(h.seconds) &&
        h.seconds >= 0 &&
        typeof h.done === "number" &&
        Number.isInteger(h.done) &&
        typeof h.total === "number" &&
        Number.isInteger(h.total) &&
        h.total > 0 &&
        h.done >= 0 &&
        h.done <= h.total,
    )
    .map((h: any) => ({
      ...h,
      completed: h.completed === true && h.done === h.total,
      effort: ["Easy", "Just right", "Challenging"].includes(h.effort)
        ? h.effort
        : undefined,
      drills: results(h.drills),
    }));
  p.benchmarks = p.benchmarks.filter(
    (b: any) =>
      record(b) &&
      typeof b.id === "string" &&
      typeof b.date === "string" &&
      Number.isFinite(Date.parse(b.date)) &&
      typeof b.count === "number" &&
      Number.isInteger(b.count) &&
      b.count >= 0 &&
      b.count <= 999,
  );
  return p;
}

export function classifyPlanCustomization(
  plan: string[],
  catalog: Drill[],
  profile: Profile,
  saved?: boolean,
): boolean {
  if (typeof saved === "boolean") return saved;
  const originals = [
    "sole",
    "inside",
    "gates",
    "turn",
    "wall",
    "partner",
    "weak",
    "push",
  ];
  const originalPlan = matchPlan(
    catalog.filter((d) => originals.includes(d.id)),
    profile,
  );
  return !(
    plan.length === originalPlan.length &&
    plan.every((id, i) => id === originalPlan[i])
  );
}
