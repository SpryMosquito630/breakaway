export type MeasurementKind = "height" | "weight";
export const measurementRowHeight = 52;
const poundsPerKg = 2.2046226218;
const ranges = {
  height: {
    metric: Array.from({ length: 161 }, (_, i) => 80 + i),
    imperial: Array.from({ length: 63 }, (_, i) => 32 + i),
  },
  weight: {
    metric: Array.from({ length: 186 }, (_, i) => 15 + i),
    imperial: Array.from({ length: 409 }, (_, i) => 33 + i),
  },
};
export function measurementValues(
  kind: MeasurementKind,
  imperial: boolean,
): readonly number[] {
  return ranges[kind][imperial ? "imperial" : "metric"];
}
export function displayMeasurement(
  kind: MeasurementKind,
  canonical: number | undefined,
  imperial: boolean,
): number | undefined {
  if (canonical === undefined) return undefined;
  const rounded = Math.round(
    imperial
      ? kind === "height"
        ? canonical / 2.54
        : canonical * poundsPerKg
      : canonical,
  );
  const values = measurementValues(kind, imperial);
  return Math.max(values[0], Math.min(values[values.length - 1], rounded));
}
export function canonicalMeasurement(
  kind: MeasurementKind,
  displayed: number,
  imperial: boolean,
): number {
  return (
    Math.round(
      (imperial
        ? kind === "height"
          ? displayed * 2.54
          : displayed / poundsPerKg
        : displayed) * 10,
    ) / 10
  );
}
export function wheelIndexAtOffset(offset: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.round(offset / measurementRowHeight)));
}
/** Scroll positioning is separate from explicit user selection, including unit changes. */
export function createWheelSelection(
  values: readonly number[],
  commit: (value: number) => void,
) {
  let interacting = false;
  let last: number | undefined;
  const choose = (index: number, force = false) => {
    const bounded = Math.max(0, Math.min(values.length - 1, index));
    const value = values[bounded];
    if (force || last !== value) {
      last = value;
      commit(value);
    }
    return bounded * measurementRowHeight;
  };
  return {
    get active() {
      return interacting;
    },
    position(value?: number) {
      interacting = false;
      last = value;
      const index =
        value === undefined
          ? Math.floor((values.length - 1) / 2)
          : values.reduce(
              (best, candidate, i) =>
                Math.abs(candidate - value) < Math.abs(values[best] - value) ? i : best,
              0,
            );
      return index * measurementRowHeight;
    },
    begin() {
      interacting = true;
    },
    move(offset: number) {
      if (interacting) choose(wheelIndexAtOffset(offset, values.length));
    },
    finish(offset: number) {
      const snapped = interacting
        ? choose(wheelIndexAtOffset(offset, values.length))
        : wheelIndexAtOffset(offset, values.length) * measurementRowHeight;
      interacting = false;
      return snapped;
    },
    tap(value: number) {
      interacting = false;
      return choose(values.indexOf(value), true);
    },
  };
}
