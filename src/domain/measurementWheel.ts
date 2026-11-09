export type MeasurementKind = "height" | "weight";
export const measurementRowHeight = 32;
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
export function wheelIndexAtOffset(
  offset: number,
  count: number,
  rowHeight = measurementRowHeight,
): number {
  return Math.max(0, Math.min(count - 1, Math.round(offset / rowHeight)));
}
/** Scroll positioning is separate from explicit user selection, including unit changes. */
export function createWheelSelection(
  values: readonly number[],
  commit: (value: number) => void,
  rowHeight = measurementRowHeight,
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
    return bounded * rowHeight;
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
      return index * rowHeight;
    },
    begin() {
      interacting = true;
    },
    cancel() {
      interacting = false;
    },
    move(offset: number) {
      if (interacting) choose(wheelIndexAtOffset(offset, values.length, rowHeight));
    },
    finish(offset: number) {
      const snapped = interacting
        ? choose(wheelIndexAtOffset(offset, values.length, rowHeight))
        : wheelIndexAtOffset(offset, values.length, rowHeight) * rowHeight;
      interacting = false;
      return snapped;
    },
    tap(value: number) {
      interacting = false;
      return choose(values.indexOf(value), true);
    },
  };
}

export type ImperialHeightDraft = { feet?: number; inches?: number };
export const imperialFeet = [2, 3, 4, 5, 6, 7] as const;
const allInches = Array.from({ length: 12 }, (_, i) => i);
const lowInches = [8, 9, 10, 11];
const highInches = Array.from({ length: 11 }, (_, i) => i);
export function inchesForFeet(feet?: number): readonly number[] {
  return feet === 2 ? lowInches : feet === 7 ? highInches : allInches;
}
export function imperialHeightFromCm(cm?: number): ImperialHeightDraft {
  if (cm === undefined) return {};
  const total = displayMeasurement("height", cm, true)!;
  return { feet: Math.floor(total / 12), inches: total % 12 };
}
export function imperialHeightCm(parts: ImperialHeightDraft): number | undefined {
  if (
    parts.feet === undefined ||
    parts.inches === undefined ||
    !(imperialFeet as readonly number[]).includes(parts.feet) ||
    !inchesForFeet(parts.feet).includes(parts.inches)
  )
    return undefined;
  return canonicalMeasurement("height", parts.feet * 12 + parts.inches, true);
}
export function chooseImperialHeightPart(
  previous: ImperialHeightDraft,
  part: keyof ImperialHeightDraft,
  value: number,
): { parts: ImperialHeightDraft; centimeters?: number } {
  const parts = { ...previous, [part]: value };
  if (
    parts.feet !== undefined &&
    parts.inches !== undefined &&
    !inchesForFeet(parts.feet).includes(parts.inches)
  )
    delete parts.inches;
  return { parts, centimeters: imperialHeightCm(parts) };
}
export function formatImperialHeight(parts: ImperialHeightDraft): string {
  if (parts.feet === undefined && parts.inches === undefined) return "–";
  return `${parts.feet ?? "–"}' ${parts.inches ?? "–"}"`;
}
