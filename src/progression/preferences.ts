export type SeasonPreferences = { goals: Record<string, number> };
export function restoreSeasonPreferences(value: unknown): SeasonPreferences {
  const goals: Record<string, number> = {};
  if (
    value &&
    typeof value === "object" &&
    "goals" in value &&
    value.goals &&
    typeof value.goals === "object"
  ) {
    for (const [key, target] of Object.entries(value.goals))
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(key) && [4, 8, 12, 16].includes(target))
        goals[key] = target;
  }
  return { goals };
}
