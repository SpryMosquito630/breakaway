import assert from "node:assert/strict";
import test from "node:test";
import { keyboardClipSeek } from "../src/domain/clipPlayback";

test("keyboard seeking supports both directions and clip boundaries", () => {
  assert.equal(keyboardClipSeek("ArrowRight", 1.2, 3.8, true), 2.2);
  assert.ok(Math.abs(keyboardClipSeek("ArrowLeft", 1.2, 3.8, true)! - 0.2) < 1e-10);
  assert.equal(keyboardClipSeek("Home", 1.2, 3.8, true), 0);
  assert.equal(keyboardClipSeek("End", 1.2, 3.8, true), 3.8);
  assert.equal(keyboardClipSeek("ArrowLeft", 0, 3.8, true), 0);
  assert.equal(keyboardClipSeek("ArrowRight", 3.5, 3.8, true), 3.8);
});

test("unloaded, invalid and disabled clips cannot seek; other keys are left alone", () => {
  for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
    assert.equal(keyboardClipSeek(key, 1, 3.8, false), null);
    assert.equal(keyboardClipSeek(key, 1, 0, true), null);
    assert.equal(keyboardClipSeek(key, NaN, 3.8, true), null);
    assert.equal(keyboardClipSeek(key, 1, Infinity, true), null);
  }
  assert.equal(keyboardClipSeek("Tab", 1, 3.8, true), null);
});
