import type { Food } from "./food";
export type EditableFoodEstimate = Food & {
  notes: string[];
  source: "AI photo estimate";
};
/** Accept a meal estimate only. Targets, advice and unknown response modes are never applied. */
export function parseFoodEstimate(raw: unknown): EditableFoodEstimate {
  const r = raw as Record<string, unknown>;
  if (
    !r ||
    r.source !== "openai" ||
    r.approximate !== true ||
    r.editable !== true ||
    typeof r.name !== "string" ||
    !r.name.trim() ||
    r.name.length > 120 ||
    !Array.isArray(r.notes) ||
    r.notes.length > 8 ||
    r.notes.some((n) => typeof n !== "string" || n.length > 500) ||
    ["targetCalories", "targetWeight", "weightLoss", "dietPlan", "mode"].some(
      (k) => k in r,
    )
  )
    throw new Error(
      "The service did not return an editable meal estimate. Enter the meal manually.",
    );
  const read = (key: string) => {
    const n = r[key];
    if (n === null) return undefined;
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 10000)
      throw new Error(
        "The estimate contained an invalid nutrition value. Check the package and enter it manually.",
      );
    return Math.round(n);
  };
  return {
    name: r.name.trim(),
    calories: read("calories"),
    protein: read("protein"),
    carbs: read("carbs"),
    fat: read("fat"),
    notes: r.notes as string[],
    source: "AI photo estimate",
  };
}
