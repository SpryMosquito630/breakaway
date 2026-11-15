import type { JointResult } from "../coachAi/service";

export const TECHNIQUE_CATEGORIES = [
  "body_control",
  "striking_action",
  "follow_through",
] as const;
export type ShotTechnique = {
  source: "gemini";
  subjective: true;
  label: "AI coaching estimate";
  score: number | null;
  confidence: "low" | "medium" | "high";
  shotStyle: string;
  summary: string;
  limitations: string;
  categories: {
    id: (typeof TECHNIQUE_CATEGORIES)[number];
    score: number | null;
    reason: string;
    timestampSeconds: number | null;
  }[];
  improvement: { text: string; timestampSeconds: number } | null;
  durationSeconds: number;
  sampledFrames: number;
  pose?: JointResult | null;
};
const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const score = (v: unknown) =>
  v === null || (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100);
/** Server derives the total; reject invented, inconsistent or out-of-clip evidence. */
export function validShotTechnique(
  value: unknown,
  duration: number,
): value is ShotTechnique {
  if (!value || typeof value !== "object") return false;
  const v = value as ShotTechnique;
  const stamp = (t: unknown) =>
    typeof t === "number" && Number.isFinite(t) && t >= 0 && t <= duration;
  if (
    v.source !== "gemini" ||
    v.subjective !== true ||
    v.label !== "AI coaching estimate" ||
    !score(v.score) ||
    !["low", "medium", "high"].includes(v.confidence) ||
    !text(v.shotStyle, 160) ||
    !text(v.summary, 1200) ||
    !text(v.limitations, 1200) ||
    !Number.isFinite(v.durationSeconds) ||
    Math.abs(v.durationSeconds - duration) > 0.6 ||
    !Number.isInteger(v.sampledFrames) ||
    v.sampledFrames < 1 ||
    v.sampledFrames > 100 ||
    !Array.isArray(v.categories) ||
    v.categories.length !== 3
  )
    return false;
  if (
    !TECHNIQUE_CATEGORIES.every(
      (id) => v.categories.filter((c) => c?.id === id).length === 1,
    )
  )
    return false;
  if (
    !v.categories.every(
      (c) =>
        score(c.score) &&
        text(c.reason, 1000) &&
        (c.timestampSeconds === null || stamp(c.timestampSeconds)) &&
        (c.score === null || c.timestampSeconds !== null),
    )
  )
    return false;
  if (
    v.improvement !== null &&
    (!v.improvement ||
      !text(v.improvement.text, 1000) ||
      !stamp(v.improvement.timestampSeconds))
  )
    return false;
  if (v.score === null)
    return (
      v.confidence === "low" &&
      v.improvement === null &&
      v.categories.every((c) => c.score === null)
    );
  if (v.confidence === "low" || v.categories.some((c) => c.score === null)) return false;
  return (
    v.score ===
    Math.round(v.categories.reduce((total, c) => total + (c.score ?? 0), 0) / 3)
  );
}
