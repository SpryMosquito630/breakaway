import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyShotSpeed,
  estimateShotSpeed,
  shotSpeedReducer,
} from "../src/domain/shotSpeed";

const measured = { distance: "10", start: 1, end: 1.5 };

test("shot speed converts entered metres and elapsed video seconds to average km/h", () => {
  assert.equal(estimateShotSpeed(measured, 3).kmh, 72);
  assert.ok(
    Math.abs(estimateShotSpeed({ ...measured, distance: " 10,5 " }, 3).kmh! - 75.6) <
      1e-9,
  );
  assert.equal(estimateShotSpeed({ ...measured, start: 0, end: 0.5 }, 3).kmh, 72);
});

test("missing, nonpositive, nonfinite and malformed distance never produce speed", () => {
  for (const distance of [
    "",
    " ",
    "0",
    "-1",
    "NaN",
    "Infinity",
    "1e309",
    "0x10",
    "1.2.3",
  ])
    assert.equal(estimateShotSpeed({ ...measured, distance }, 3).kmh, null, distance);
  assert.equal(estimateShotSpeed(emptyShotSpeed(), 3).kmh, null);
});

test("both timing marks must be finite, ordered and inside a usable video", () => {
  for (const patch of [
    { start: null },
    { end: null },
    { start: NaN },
    { end: Infinity },
    { start: -0.1 },
    { end: 4 },
    { start: 4 },
    { start: 1.5 },
    { end: 0.5 },
  ])
    assert.equal(estimateShotSpeed({ ...measured, ...patch }, 3).kmh, null);
  for (const duration of [0, -1, NaN, Infinity, 1.49])
    assert.equal(estimateShotSpeed(measured, duration).kmh, null);
  assert.equal(estimateShotSpeed(measured, 1.5).kmh, 72);
});

test("short intervals are withheld and the 0.20 second boundary tolerates rounding", () => {
  assert.equal(estimateShotSpeed({ ...measured, end: 1.19 }, 3).kmh, null);
  assert.ok(Math.abs(estimateShotSpeed({ ...measured, end: 1.2 }, 3).kmh! - 180) < 1e-9);
});

test("re-marking changes the result and reset clears all values without retaining old clip input", () => {
  let state = emptyShotSpeed();
  state = shotSpeedReducer(state, { type: "distance", value: "10" });
  state = shotSpeedReducer(state, { type: "start", time: 1 });
  state = shotSpeedReducer(state, { type: "end", time: 1.5 });
  assert.equal(estimateShotSpeed(state, 3).kmh, 72);
  state = shotSpeedReducer(state, { type: "end", time: 2 });
  assert.equal(estimateShotSpeed(state, 3).kmh, 36);
  state = shotSpeedReducer(state, { type: "reset" });
  assert.deepEqual(state, { distance: "", start: null, end: null });
  assert.equal(estimateShotSpeed(state, 3).kmh, null);
  assert.deepEqual(emptyShotSpeed(), state);
  assert.deepEqual(measured, { distance: "10", start: 1, end: 1.5 });
});
