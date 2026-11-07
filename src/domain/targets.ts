import { time } from "./model";

/** Display uses the frozen session duration and target, never the current profile duration.
 * Catalog targets are pacing suggestions, not measured skill or completion thresholds.
 * Legacy per-block snapshots have no pacing basis; don't invent one or rewrite the record.
 */
export function drillTarget(target: string | undefined, durationSeconds: number): string | undefined {
  if (!target) return undefined;
  if (/per block\b/i.test(target))
    return `Controlled repetitions throughout this ${time(durationSeconds)} block. Reset whenever needed.`;
  const paced = target.match(/^(\d+)\s+(.+?)\s+per minute\.(.*)$/i);
  if (!paced || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return target;
  const count = Math.max(1, Math.round(Number(paced[1]) * durationSeconds / 60));
  return `About ${count} ${paced[2]} over ${time(durationSeconds)} (${paced[1]} per minute).${paced[3]}`;
}
