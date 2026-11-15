import test from "node:test";
import assert from "node:assert/strict";
import { localServicePreviewAllowed } from "../src/config/features";

test("laptop-backed destinations require both a debug build and preview opt-in", () => {
  assert.equal(localServicePreviewAllowed(false, true), false);
  assert.equal(localServicePreviewAllowed(false, false), false);
  assert.equal(localServicePreviewAllowed(true, false), false);
  assert.equal(localServicePreviewAllowed(true, true), true);
});
