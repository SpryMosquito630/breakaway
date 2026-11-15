import assert from "node:assert/strict";
import test from "node:test";
import {
  bodyTrackingDefaults,
  canStartBodyTracking,
  createShotTrackingStart,
} from "../src/domain/shotTracking";
const ready = { usable: true, busy: false, focused: true, picking: false };

test("tracking overlay defaults on; processing still waits for playable video and no active request", () => {
  assert.equal(bodyTrackingDefaults.enabled, true);
  for (const usable of [false, true])
    for (const busy of [false, true])
      assert.equal(canStartBodyTracking({ usable, busy }), usable && !busy);
});

test("a disclosed newly selected clip automatically starts once only after readiness", () => {
  const start = createShotTrackingStart(true);
  assert.equal(start.automatic({ ...ready, usable: false }), false);
  assert.equal(start.automatic({ ...ready, focused: false }), false);
  assert.equal(start.automatic({ ...ready, picking: true }), false);
  assert.equal(start.automatic({ ...ready, busy: true }), false);
  assert.equal(start.automatic(ready), true);
  assert.equal(start.automatic(ready), false);
  // Loading transitions, failure and cancellation must not create retry loops.
  assert.equal(start.automatic({ ...ready, usable: false }), false);
  assert.equal(start.automatic(ready), false);
});

test("replacement gets its own attempt, but saved replay opens never automatically upload", () => {
  const first = createShotTrackingStart(true);
  assert.equal(first.automatic(ready), true);
  const replacement = createShotTrackingStart(true);
  assert.equal(replacement.automatic(ready), true);
  assert.equal(first.automatic(ready), false);
  const saved = createShotTrackingStart(false);
  assert.equal(saved.automatic(ready), false);
  saved.manual();
  assert.equal(saved.automatic(ready), false);
});

test("an explicit manual attempt consumes pending automatic intent", () => {
  const start = createShotTrackingStart(true);
  start.manual();
  assert.equal(start.automatic(ready), false);
});
