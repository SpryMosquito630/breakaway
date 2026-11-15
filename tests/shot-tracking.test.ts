import assert from "node:assert/strict";
import test from "node:test";
import { bodyTrackingDefaults, canAnalyzeBody } from "../src/domain/shotTracking";

test("body tracking starts enabled without granting per-clip upload consent", () => {
  assert.equal(bodyTrackingDefaults.enabled, true);
  assert.equal(bodyTrackingDefaults.consent, false);
  assert.equal(
    canAnalyzeBody({ ...bodyTrackingDefaults, usable: true, busy: false }),
    false,
  );
});

test("tracking requires consent, playable video and no active request", () => {
  for (const consent of [false, true])
    for (const usable of [false, true])
      for (const busy of [false, true])
        assert.equal(
          canAnalyzeBody({ consent, usable, busy }),
          consent && usable && !busy,
        );
});
