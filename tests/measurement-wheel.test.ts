import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalMeasurement,
  createWheelSelection,
  displayMeasurement,
  measurementRowHeight,
  measurementDefaultsForEntry,
  measurementValues,
  wheelIndexAtOffset,
} from "../src/domain/measurementWheel";

test("measurement entry uses the recorded metric starting values and preserves edited values", () => {
  assert.deepEqual(measurementDefaultsForEntry({}), { heightCm: 175, weightKg: 70 });
  assert.deepEqual(measurementDefaultsForEntry({ heightCm: 182.9, weightKg: 81.6 }), {
    heightCm: 182.9,
    weightKg: 81.6,
  });
  assert.deepEqual(measurementDefaultsForEntry({ heightCm: 168 }), {
    heightCm: 168,
    weightKg: 70,
  });
  assert.equal(displayMeasurement("height", 175, true), 69);
  assert.equal(displayMeasurement("weight", 70, true), 154);
});

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

test("feet and inches remain partial until both are explicitly chosen", async () => {
  const { chooseImperialHeightPart, imperialHeightFromCm, formatImperialHeight } =
    await import("../src/domain/measurementWheel");
  assert.deepEqual(imperialHeightFromCm(undefined), {});
  assert.equal(formatImperialHeight({}), "–");
  const feet = chooseImperialHeightPart({}, "feet", 5);
  assert.deepEqual(feet.parts, { feet: 5 });
  assert.equal(feet.centimeters, undefined);
  assert.equal(formatImperialHeight(feet.parts), "5' –\"");
  const complete = chooseImperialHeightPart(feet.parts, "inches", 9);
  assert.equal(complete.centimeters, 175.3);
  assert.equal(formatImperialHeight(complete.parts), "5' 9\"");
  const inchesFirst = chooseImperialHeightPart({}, "inches", 11);
  assert.equal(inchesFirst.centimeters, undefined);
  assert.equal(chooseImperialHeightPart(inchesFirst.parts, "feet", 5).centimeters, 180.3);
});

test("imperial height bounds restrict inches and clear an invalid partner without inventing a replacement", async () => {
  const { imperialFeet, inchesForFeet, imperialHeightCm, chooseImperialHeightPart } =
    await import("../src/domain/measurementWheel");
  assert.deepEqual(inchesForFeet(2), [8, 9, 10, 11]);
  assert.deepEqual(
    inchesForFeet(7),
    Array.from({ length: 11 }, (_, i) => i),
  );
  for (const feet of imperialFeet)
    for (const inches of inchesForFeet(feet)) {
      const centimeters = imperialHeightCm({ feet, inches })!;
      assert.ok(centimeters >= 80 && centimeters <= 240);
    }
  assert.equal(imperialHeightCm({ feet: 2, inches: 7 }), undefined);
  assert.equal(imperialHeightCm({ feet: 7, inches: 11 }), undefined);
  const changed = chooseImperialHeightPart({ feet: 5, inches: 11 }, "feet", 7);
  assert.deepEqual(changed.parts, { feet: 7 });
  assert.equal(changed.centimeters, undefined);
  assert.equal(chooseImperialHeightPart(changed.parts, "inches", 10).centimeters, 238.8);
});

test("unit flips derive feet/inches without changing canonical precision or selecting a missing partner", async () => {
  const { imperialHeightFromCm, imperialHeightCm } =
    await import("../src/domain/measurementWheel");
  const canonical = 175;
  for (let i = 0; i < 10; i += 1) {
    const parts = imperialHeightFromCm(canonical);
    assert.deepEqual(parts, { feet: 5, inches: 9 });
    assert.equal(canonical, 175);
    assert.equal(displayMeasurement("height", canonical, false), 175);
    assert.equal(
      imperialHeightCm(parts),
      175.3,
      "This conversion is only committed after a new explicit choice",
    );
  }
  assert.deepEqual(imperialHeightFromCm(undefined), {});
});

test("compact row geometry is shared by snapping and cancelled gestures cannot commit late movement", () => {
  const selected: number[] = [];
  const wheel = createWheelSelection(
    [2, 3, 4, 5, 6, 7],
    (value) => selected.push(value),
    32,
  );
  const initial = wheel.position();
  wheel.begin();
  wheel.cancel();
  wheel.move(initial + 64);
  wheel.finish(initial + 64);
  assert.deepEqual(selected, []);
  wheel.begin();
  wheel.move(96);
  assert.deepEqual(selected, [5]);
  wheel.cancel();
  wheel.move(160);
  wheel.finish(160);
  assert.deepEqual(selected, [5]);
  const alternate = createWheelSelection([1, 2, 3], () => {}, 44);
  assert.equal(alternate.position(2), 44);
  alternate.begin();
  assert.equal(alternate.finish(67), 88);
});
