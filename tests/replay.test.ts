import { test } from "node:test";
import assert from "node:assert/strict";
import {
  frameAt,
  normalizedMotion,
  trailAt,
  validAnalysis,
  ReplayAnalysis,
} from "../src/domain/replay";
const a: ReplayAnalysis = {
  width: 100,
  height: 200,
  duration: 2,
  frames: [
    { time: 0, x: 0.1, y: 0.2, trackId: 1, confidence: 0.8 },
    { time: 0.1, x: 0.2, y: 0.2, trackId: 1, confidence: 0.8 },
    { time: 0.25, x: null, y: null, trackId: null, confidence: null },
    { time: 0.6, x: 0.9, y: 0.2, trackId: 2, confidence: 0.8 },
    { time: 1, x: 0.95, y: 0.2, trackId: 2, confidence: 0.8 },
  ],
};
test("timestamp lookup handles sampled variable cadence", () => {
  assert.equal(frameAt(a, 0.5), 2);
  assert.equal(frameAt(a, 1.9), 4);
});
test("motion and trail break across lost frames and new tracks", () => {
  assert.deepEqual(
    normalizedMotion(a).map((v) => (v === null ? null : Math.round(v * 100))),
    [null, 100, null, null, 50],
  );
  assert.equal(trailAt(a, 2).length, 0);
  assert.equal(trailAt(a, 3).length, 1);
  assert.equal(trailAt(a, 4).length, 2);
});
test("responses reject malformed coordinates and non-monotonic timestamps", () => {
  assert.equal(validAnalysis(a), true);
  assert.equal(
    validAnalysis({ ...a, frames: [{ ...a.frames[0], x: 2 }] }),
    false,
  );
  assert.equal(
    validAnalysis({ ...a, frames: [a.frames[1], a.frames[0]] }),
    false,
  );
  assert.equal(validAnalysis({ ...a, frames: [null] }), false);
});
