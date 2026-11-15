import { time } from "./model";

/** Display uses the frozen session duration and target, never the current profile duration.
 * Catalog targets are pacing suggestions, not measured skill or completion thresholds.
 * Legacy per-block snapshots have no pacing basis; don't invent one or rewrite the record.
 */
export function drillTarget(
  target: string | undefined,
  durationSeconds: number,
): string | undefined {
  if (!target) return undefined;
  if (/per block\b/i.test(target))
    return `Controlled repetitions throughout this ${time(durationSeconds)} block. Reset whenever needed.`;
  const round = target.match(
    /^(\d+) (.+?) per (\d+)-second work round\. Rest (\d+) seconds after each round\.(.*)$/,
  );
  if (round && Number.isFinite(durationSeconds) && durationSeconds > 0) {
    const [, repetitions, unit, workText, restText, guidance] = round;
    const work = Number(workText);
    const rest = Number(restText);
    if (work <= 0 || rest <= 0) return target;
    const full = Math.floor(durationSeconds / (work + rest));
    const partialWork = Math.min(work, durationSeconds % (work + rest));
    const count =
      full * Number(repetitions) + Math.floor((Number(repetitions) * partialWork) / work);
    return `${work}s practice / ${rest}s rest. Aim for ${repetitions} ${unit} each work round${count > 0 ? `; up to ${count} over ${time(durationSeconds)}` : ""}.${guidance}`;
  }
  const paced = target.match(/^(\d+)\s+(.+?)\s+per minute\.(.*)$/i);
  if (!paced || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return target;
  const count = Math.max(1, Math.round((Number(paced[1]) * durationSeconds) / 60));
  return `About ${count} ${paced[2]} over ${time(durationSeconds)} (${paced[1]} per minute).${paced[3]}`;
}
