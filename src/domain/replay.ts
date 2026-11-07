/** Image-space measurements only. A tracking gap never produces an inferred point. */
export type BallFrame = {
  time: number;
  x: number | null;
  y: number | null;
  trackId: number | null;
  confidence: number | null;
  radius?: number | null;
};
export type ReplayAnalysis = {
  version?: number;
  width: number;
  height: number;
  fps?: number;
  sampleFps?: number;
  duration: number;
  frames: BallFrame[];
  detector?: string;
  model?: string;
  acceptedFrames?: number;
  totalFrames?: number;
};
export function frameAt(analysis: ReplayAnalysis, time: number): number {
  // Use timestamps, rather than an assumed output frame rate (uploads may be sampled).
  let low = 0,
    high = analysis.frames.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (analysis.frames[mid].time <= time) low = mid;
    else high = mid - 1;
  }
  return low;
}
export function trailAt(analysis: ReplayAnalysis, index: number): BallFrame[] {
  const current = analysis.frames[index];
  if (!current || current.x === null || current.y === null) return [];
  const result: BallFrame[] = [];
  for (let i = index; i >= 0 && index - i < 12; i--) {
    const frame = analysis.frames[i];
    if (frame.x === null || frame.y === null || frame.trackId !== current.trackId) break;
    result.unshift(frame);
  }
  return result;
}
export function normalizedMotion(analysis: ReplayAnalysis): (number | null)[] {
  const values = analysis.frames.map((frame, i) => {
    const previous = analysis.frames[i - 1];
    if (
      !previous ||
      frame.x === null ||
      frame.y === null ||
      previous.x === null ||
      previous.y === null ||
      frame.trackId !== previous.trackId
    )
      return null;
    return Math.hypot(frame.x - previous.x, frame.y - previous.y);
  });
  const maximum = Math.max(
    0,
    ...values.filter((value): value is number => value !== null),
  );
  return values.map((value) =>
    value === null ? null : maximum > 0 ? value / maximum : 0,
  );
}
export function validAnalysis(input: unknown): input is ReplayAnalysis {
  if (!input || typeof input !== "object") return false;
  const a = input as ReplayAnalysis;
  return (
    Number.isFinite(a.width) &&
    a.width > 0 &&
    Number.isFinite(a.height) &&
    a.height > 0 &&
    Number.isFinite(a.duration) &&
    a.duration > 0 &&
    a.duration <= 31 &&
    Array.isArray(a.frames) &&
    a.frames.length > 0 &&
    a.frames.length <= 1000 &&
    a.frames.every(
      (f, i) =>
        f &&
        Number.isFinite(f.time) &&
        f.time >= 0 &&
        f.time <= a.duration &&
        (i === 0 || f.time >= a.frames[i - 1].time) &&
        (f.trackId === null || (Number.isInteger(f.trackId) && f.trackId >= 0)) &&
        (f.confidence === null ||
          (Number.isFinite(f.confidence) && f.confidence >= 0 && f.confidence <= 1)) &&
        (f.radius === undefined ||
          f.radius === null ||
          (Number.isFinite(f.radius) && f.radius >= 0 && f.radius <= 1)) &&
        ((f.x === null && f.y === null) ||
          (Number.isFinite(f.x) &&
            Number.isFinite(f.y) &&
            f.x! >= 0 &&
            f.x! <= 1 &&
            f.y! >= 0 &&
            f.y! <= 1)),
    )
  );
}
