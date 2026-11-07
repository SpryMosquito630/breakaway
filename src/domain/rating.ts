import type { Benchmark } from "./model";

export type RatingPoint = Benchmark & { index: number | null };

/** A personal touch-test index, not a player ability score or population norm. */
export function personalRating(results: readonly Benchmark[]) {
  const ordered = results
    .filter(
      (r) =>
        typeof r.id === "string" &&
        Number.isFinite(Date.parse(r.date)) &&
        Number.isInteger(r.count) &&
        r.count >= 0 &&
        r.count <= 999,
    )
    .slice()
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  // Zero is a valid test result, but cannot be a ratio denominator.
  const baselinePosition = ordered.findIndex((r) => r.count > 0);
  const baseline = baselinePosition < 0 ? null : ordered[baselinePosition];
  const history: RatingPoint[] = ordered.map((r, i) => ({
    ...r,
    index:
      baseline && i >= baselinePosition
        ? Math.round((r.count / baseline.count) * 100)
        : null,
  }));
  const latest = history.at(-1) ?? null;
  const index = latest?.index ?? null;
  return {
    baseline,
    latest,
    history,
    index,
    delta: index === null ? null : index - 100,
    ratedCount: history.filter((r) => r.index !== null).length,
  };
}
