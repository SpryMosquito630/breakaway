/** Timing guardrail for the current 0.04-second seek controls, not an accuracy claim. */
export const MIN_SHOT_INTERVAL_SECONDS = 0.2;

export type ShotSpeedMeasurement = {
  distance: string;
  start: number | null;
  end: number | null;
};

export type ShotSpeedAction =
  | { type: "distance"; value: string }
  | { type: "start" | "end"; time: number }
  | { type: "reset" };

export function emptyShotSpeed(): ShotSpeedMeasurement {
  return { distance: "", start: null, end: null };
}

export function shotSpeedReducer(
  state: ShotSpeedMeasurement,
  action: ShotSpeedAction,
): ShotSpeedMeasurement {
  if (action.type === "reset") return emptyShotSpeed();
  if (action.type === "distance") return { ...state, distance: action.value };
  return { ...state, [action.type]: action.time };
}

export function estimateShotSpeed(state: ShotSpeedMeasurement, duration: number) {
  // Decimal input only: Number alone would also accept hex and scientific notation.
  const text = state.distance.trim().replace(",", ".");
  const distance = /^\d*(?:\.\d*)?$/.test(text) ? Number(text) : NaN;
  if (!text || !Number.isFinite(distance) || distance <= 0)
    return { kmh: null, message: "Enter the measured distance in metres." };
  if (state.start === null || state.end === null)
    return { kmh: null, message: "Pause at each point and mark Start and End." };
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isFinite(state.start) ||
    !Number.isFinite(state.end) ||
    state.start < 0 ||
    state.end < 0 ||
    state.start > duration ||
    state.end > duration
  )
    return { kmh: null, message: "Mark both points within the loaded video." };
  const elapsed = state.end - state.start;
  if (elapsed <= 0) return { kmh: null, message: "End must come after Start." };
  // Tolerate subtraction roundoff at the 0.20-second boundary.
  if (elapsed + 1e-9 < MIN_SHOT_INTERVAL_SECONDS)
    return { kmh: null, message: "Use points at least 0.20 seconds apart." };
  const kmh = (3.6 * distance) / elapsed;
  if (!Number.isFinite(kmh))
    return { kmh: null, message: "Enter a smaller measured distance." };
  return { kmh, message: `${elapsed.toFixed(2)} s between marks` };
}
