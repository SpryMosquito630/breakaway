import { type Movement } from "../data/drill-movements";

export type GuidePoint = { x: number; y: number };
export type GuideFrame = GuidePoint & { time: number; opacity: number };
/** Samples only the absolute SVG commands used by our authored diagrams.
 * Each M starts a separate stroke: never invent a connecting travel path. */
export function sampleMovementPath(path: string): GuidePoint[][] {
  const tokens = path.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
  const strokes: GuidePoint[][] = [];
  let i = 0;
  let current: GuidePoint = { x: 0, y: 0 };
  const point = (): GuidePoint => {
    const x = Number(tokens[i++]);
    const y = Number(tokens[i++]);
    if (!Number.isFinite(x) || !Number.isFinite(y))
      throw new Error("Invalid movement path");
    return { x, y };
  };
  while (i < tokens.length) {
    const command = tokens[i++];
    if (command === "M") {
      current = point();
      strokes.push([current]);
      continue;
    }
    if (!strokes.length || !["L", "Q", "C"].includes(command))
      throw new Error("Unsupported movement path");
    const start = current;
    const a = point();
    const b = command === "L" ? a : point();
    const end = command === "C" ? point() : b;
    for (let n = 1; n <= 32; n++) {
      const t = n / 32;
      const u = 1 - t;
      current =
        command === "L"
          ? { x: start.x * u + end.x * t, y: start.y * u + end.y * t }
          : command === "Q"
            ? {
                x: u * u * start.x + 2 * u * t * a.x + t * t * end.x,
                y: u * u * start.y + 2 * u * t * a.y + t * t * end.y,
              }
            : {
                x:
                  u ** 3 * start.x +
                  3 * u * u * t * a.x +
                  3 * u * t * t * b.x +
                  t ** 3 * end.x,
                y:
                  u ** 3 * start.y +
                  3 * u * u * t * a.y +
                  3 * u * t * t * b.y +
                  t ** 3 * end.y,
              };
      strokes[strokes.length - 1].push(current);
    }
  }
  return strokes;
}

export function movementFrames(
  strokes: GuidePoint[][],
  start = 0,
  end = 1,
): GuideFrame[] {
  const frames: GuideFrame[] = [];
  const span = (end - start) / strokes.length;
  strokes.forEach((stroke, index) => {
    const from = start + index * span;
    // Hide before resetting to the next separate stroke. The reset is schematic,
    // not a suggested ball or foot movement between the authored paths.
    const to = from + span * (index < strokes.length - 1 ? 0.86 : 1);
    if (index) {
      frames.push({ ...frames[frames.length - 1], time: from - span * 0.07, opacity: 0 });
      frames.push({ ...stroke[0], time: from - span * 0.001, opacity: 0 });
    }
    stroke.forEach((p, j) =>
      frames.push({
        ...p,
        time: from + ((to - from) * j) / Math.max(1, stroke.length - 1),
        opacity: 1,
      }),
    );
  });
  return frames;
}

export function createMovementGuide(movement: Movement, drillId: string) {
  const ballStart = drillId === "step-over" ? 0.55 : 0;
  const ball = movementFrames(sampleMovementPath(movement.path), ballStart, 1);
  if (ballStart) ball.unshift({ ...ball[0], time: 0 });
  const foot = movement.footPath
    ? movementFrames(
        sampleMovementPath(movement.footPath),
        0,
        drillId === "step-over" ? 0.55 : 1,
      )
    : null;
  if (foot && drillId === "step-over") {
    foot.push({ ...foot[foot.length - 1], time: 0.56, opacity: 0 });
    foot.push({ ...foot[foot.length - 1], time: 1, opacity: 0 });
  }
  return { ball, foot };
}
