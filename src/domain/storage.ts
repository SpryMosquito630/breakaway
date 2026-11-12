import { sanitizeOnboardingAnswers } from "./onboardingFlow";
import { restorePracticeClock } from "./practiceClock";
import {
  combinedCatalog,
  sanitizeCustomDrills,
  sanitizeTrainingFields,
} from "./training";
import { sanitizeAssessments } from "./assessments";
import { sanitizeTodaySession } from "./sessionTime";
import {
  AppData,
  Drill,
  DrillResult,
  DrillSnapshot,
  Profile,
  days,
  goals,
  positions,
  matchPlan,
  initialData,
} from "./model";
const isRecord = (x: unknown): boolean => record(x);
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
export function restoreAppData(raw: string, catalog: Drill[], now = Date.now()): AppData {
  const p = JSON.parse(raw);
  if (!isRecord(p)) throw Error("Invalid saved data");
  p.customDrills = sanitizeCustomDrills(p.customDrills);
  catalog = combinedCatalog(catalog, p);
  if (
    p.version !== 1 ||
    typeof p.onboarded !== "boolean" ||
    !Array.isArray(p.plan) ||
    !Array.isArray(p.history) ||
    !Array.isArray(p.benchmarks)
  )
    throw Error("Invalid saved data");
  const defaults = initialData().profile;
  const profile = isRecord(p.profile) ? { ...p.profile } : {};
  const preferenceChecks = {
    goal: (value: any) => goals.includes(value),
    experience: (value: any) => ["New to training", "Some experience"].includes(value),
    minutes: (value: any) => [15, 20, 30].includes(value),
    days: (value: any) =>
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((day: any) => days.includes(day)),
    gear: (value: any) =>
      Array.isArray(value) &&
      value.every((item: any) => ["markers", "wall", "partner"].includes(item)),
    space: (value: any) => ["Small space", "Open space"].includes(value),
  };
  for (const key of Object.keys(preferenceChecks) as (keyof typeof preferenceChecks)[]) {
    if (!preferenceChecks[key](profile[key])) {
      profile[key] = defaults[key];
      p.onboarded = false;
    }
  }
  p.profile = profile;
  const onboardingAnswers = sanitizeOnboardingAnswers(p.onboardingAnswers);
  if (onboardingAnswers) p.onboardingAnswers = onboardingAnswers;
  else delete p.onboardingAnswers;
  if (!positions.includes(profile.position)) delete profile.position;
  if (!["under13", "13to17", "adult"].includes(profile.ageBand)) delete profile.ageBand;
  const known = (id: string) => catalog.some((d) => d.id === id);
  const lostCustom = (id: unknown) =>
    typeof id === "string" && id.startsWith("custom-") && !known(id);
  const recoveryNotice =
    "Some custom drill data could not be read. Your saved history is intact. Review your plan and playlists before practicing.";
  if (
    typeof p.trainingRecoveryNotice !== "string" ||
    p.trainingRecoveryNotice.length > 300
  )
    delete p.trainingRecoveryNotice;
  if (p.plan.some(lostCustom)) {
    p.trainingRecoveryNotice = recoveryNotice;
    p.plan = p.plan.filter(known);
    if (!p.plan.length) p.planCustomized = false;
  }
  if (p.active && Array.isArray(p.active.ids) && p.active.ids.some(lostCustom)) {
    p.trainingRecoveryNotice =
      recoveryNotice + " The interrupted custom session could not be restored.";
    p.active = null;
  }
  p.plan = p.plan.length && p.plan.every(known) ? p.plan : matchPlan(catalog, profile);
  p.planCustomized = classifyPlanCustomization(
    p.plan,
    catalog,
    profile,
    p.planCustomized,
  );
  p.backgroundPractice = p.backgroundPractice === true;
  if (p.active) {
    const a = p.active;
    if (
      !isRecord(a) ||
      typeof a.id !== "string" ||
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
      p.active = null;
    else
      p.active = restorePracticeClock(
        {
          ...a,
          running: a.running === true,
          backgroundClock:
            typeof a.backgroundClock === "boolean" ? a.backgroundClock : undefined,
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
        },
        now,
      );
  }
  if (!p.active) p.active = null;
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
      skipped:
        Number.isInteger(h.skipped) && h.skipped >= 0 && h.skipped <= h.total
          ? h.skipped
          : Math.max(0, h.total - h.done),
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
  sanitizeTrainingFields(p, catalog);
  p.assessments = sanitizeAssessments(p.assessments);
  const todaySession = sanitizeTodaySession(p.todaySession);
  if (todaySession) p.todaySession = todaySession;
  else delete p.todaySession;
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
    plan.length === originalPlan.length && plan.every((id, i) => id === originalPlan[i])
  );
}
