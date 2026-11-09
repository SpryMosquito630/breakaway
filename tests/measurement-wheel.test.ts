import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalMeasurement,
  createWheelSelection,
  displayMeasurement,
  measurementRowHeight,
  measurementValues,
  wheelIndexAtOffset,
} from "../src/domain/measurementWheel";

test("unit presentation never creates answers and every integer row converts within persisted bounds", () => {
  for (const kind of ["height", "weight"] as const) {
    for (const imperial of [false, true]) {
      assert.equal(displayMeasurement(kind, undefined, imperial), undefined);
      const values = measurementValues(kind, imperial);
      for (const row of values) {
        const canonical = canonicalMeasurement(kind, row, imperial);
        assert.ok(canonical >= (kind === "height" ? 80 : 15));
        assert.ok(canonical <= (kind === "height" ? 240 : 200));
        assert.equal(displayMeasurement(kind, canonical, imperial), row);
      }
    }
  }
  assert.equal(canonicalMeasurement("height", 67, true), 170.2);
  assert.equal(canonicalMeasurement("weight", 154, true), 69.9);
  assert.equal(displayMeasurement("weight", 69.9, false), 70);
  assert.ok(
    measurementValues("weight", false).includes(
      displayMeasurement("weight", 69.9, false)!,
    ),
  );
});

test("initial positioning and unit synchronization never commit a default; only an explicit gesture selects", () => {
  const selected: number[] = [];
  const wheel = createWheelSelection(measurementValues("height", false), (value) =>
    selected.push(value),
  );
  const initial = wheel.position();
  wheel.move(initial);
  wheel.finish(initial);
  assert.deepEqual(selected, []);
  assert.equal(wheel.active, false);
  wheel.begin();
  wheel.move(initial + measurementRowHeight);
  wheel.move(initial + measurementRowHeight * 2);
  wheel.move(initial + measurementRowHeight * 3);
  assert.equal(
    selected.length,
    3,
    "Selection survives consecutive controlled readout updates",
  );
  const snapped = wheel.finish(initial + measurementRowHeight * 3 + 11);
  assert.equal(snapped % measurementRowHeight, 0);
  assert.equal(
    selected.length,
    3,
    "Settling the same centered row does not commit twice",
  );
  assert.equal(wheel.active, false);
  wheel.move(initial);
  assert.equal(selected.length, 3, "Programmatic snap scrolls remain inert");
});

test("tap commits and centers a row, while unit flips preserve the canonical measurement without scroll commits", () => {
  let canonical = 69.9;
  const metric = measurementValues("weight", false);
  const selected: number[] = [];
  const wheel = createWheelSelection(metric, (value) => {
    selected.push(value);
    canonical = canonicalMeasurement("weight", value, false);
  });
  const display = displayMeasurement("weight", canonical, false)!;
  assert.equal(wheel.position(display), metric.indexOf(70) * measurementRowHeight);
  assert.equal(canonical, 69.9);
  assert.equal(wheel.tap(70), metric.indexOf(70) * measurementRowHeight);
  assert.equal(
    canonical,
    70,
    "Explicitly choosing the rounded display commits that exact unit value",
  );
  assert.deepEqual(selected, [70]);
  const imperial = measurementValues("weight", true);
  const flipped = createWheelSelection(imperial, () =>
    assert.fail("A unit flip is not a selection"),
  );
  const y = flipped.position(displayMeasurement("weight", canonical, true));
  flipped.move(y);
  flipped.finish(y);
  assert.equal(canonical, 70);
});

test("snapping clamps bounce offsets and converted boundary readouts always match an available row", () => {
  assert.equal(wheelIndexAtOffset(-300, 10), 0);
  assert.equal(wheelIndexAtOffset(99999, 10), 9);
  assert.equal(wheelIndexAtOffset(27, 10), 1);
  for (const [kind, low, high] of [
    ["height", 80, 240],
    ["weight", 15, 200],
  ] as const) {
    for (const canonical of [low, high])
      for (const imperial of [false, true])
        assert.ok(
          measurementValues(kind, imperial).includes(
            displayMeasurement(kind, canonical, imperial)!,
          ),
        );
  }
});
