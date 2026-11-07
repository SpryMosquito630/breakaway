import type { AppData, Drill } from "../domain/model";
import { restoreAppData } from "../domain/storage";
export const TRAINING_KEYS = [
  "version",
  "onboarded",
  "profile",
  "plan",
  "history",
  "benchmarks",
  "assessments",
  "customDrills",
  "favorites",
  "playlists",
  "trainingPreferences",
  "dailyReadiness",
  "planCustomized",
  "todaySession",
] as const;
type Shape = true | { [key: string]: Shape } | readonly [Shape];
const primitive: Shape = true;
const list: Shape = [primitive];
const resultShape: Shape = {
  id: true,
  version: true,
  difficulty: true,
  status: true,
  seconds: true,
};
const shapes: Record<string, Shape> = {
  profile: {
    position: true,
    goal: true,
    experience: true,
    days: list,
    minutes: true,
    gear: list,
    space: true,
  },
  plan: list,
  favorites: list,
  history: [
    {
      id: true,
      date: true,
      seconds: true,
      done: true,
      skipped: true,
      total: true,
      completed: true,
      effort: true,
      drills: [resultShape],
    },
  ],
  benchmarks: [{ id: true, date: true, count: true }],
  assessments: [
    { id: true, date: true, skill: true, protocolVersion: true, value: true },
  ],
  customDrills: [
    {
      id: true,
      name: true,
      skill: true,
      gear: list,
      space: true,
      level: true,
      cue: true,
      steps: list,
      tip: true,
      version: true,
      difficulty: true,
      variants: [
        {
          difficulty: true,
          label: true,
          target: true,
          cue: true,
          steps: list,
          tip: true,
        },
      ],
    },
  ],
  playlists: [{ id: true, name: true, ids: list }],
  trainingPreferences: { pathId: true, weeklyTarget: true, matchDays: list },
  dailyReadiness: { date: true, energy: true, gear: list },
  todaySession: { date: true, minutes: true },
};
function project(value: unknown, shape: Shape): unknown {
  if (shape === true)
    return value === null || ["string", "boolean", "number"].includes(typeof value)
      ? value
      : undefined;
  if (Array.isArray(shape))
    return Array.isArray(value)
      ? value.map((item) => project(item, shape[0])).filter((item) => item !== undefined)
      : undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const target: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(shape)) {
    const next = project((value as Record<string, unknown>)[key], child);
    if (next !== undefined) target[key] = next;
  }
  return target;
}
export function buildTrainingPayload(data: AppData) {
  const payload: Record<string, unknown> = { active: null };
  for (const key of TRAINING_KEYS)
    if (data[key] !== undefined) payload[key] = project(data[key], shapes[key] ?? true);
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}
export function parseTrainingPayload(value: unknown, catalog: Drill[]) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid cloud backup.");
  if (JSON.stringify(value).length > 2_000_000)
    throw Error("Cloud backup exceeds the supported size.");
  const source = value as Record<string, unknown>;
  const safe: Record<string, unknown> = { active: null };
  for (const key of TRAINING_KEYS) if (source[key] !== undefined) safe[key] = source[key];
  return restoreAppData(JSON.stringify(buildTrainingPayload(safe as AppData)), catalog);
}
export function assertUnchangedTraining(current: AppData, captured: string) {
  if (current.active)
    throw Error("Finish or discard the active practice before restoring a cloud backup.");
  if (JSON.stringify(buildTrainingPayload(current)) !== captured)
    throw Error("Local training changed during download. Review and try again.");
}
export function assertRevision(expected: number | null, actual: number | null) {
  if (expected !== actual)
    throw Error("Cloud backup changed on another device. Refresh before uploading.");
}
