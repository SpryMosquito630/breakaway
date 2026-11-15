import test from "node:test";
import assert from "node:assert/strict";
import {
  pitchMarkerSelected,
  sanitizeOnboardingAnswers,
} from "../src/domain/onboardingFlow";

test("only the tapped CB marker is selected and its side survives a save", () => {
  for (const side of ["CB-L", "CB-R"] as const) {
    const restored = sanitizeOnboardingAnswers({
      positionDetail: "CB",
      positionMarker: side,
    })!;
    assert.equal(pitchMarkerSelected(restored, "CB", 38), side === "CB-L");
    assert.equal(pitchMarkerSelected(restored, "CB", 64), side === "CB-R");
    assert.equal(pitchMarkerSelected(restored, "CM", 50), false);
  }
});
test("legacy CB selects one marker and invalid side metadata is discarded", () => {
  assert.equal(pitchMarkerSelected({ positionDetail: "CB" }, "CB", 38), true);
  assert.equal(pitchMarkerSelected({ positionDetail: "CB" }, "CB", 64), false);
  assert.equal(
    sanitizeOnboardingAnswers({ positionDetail: "CM", positionMarker: "CB-R" })
      ?.positionMarker,
    undefined,
  );
  assert.equal(
    sanitizeOnboardingAnswers({ positionDetail: "CB", positionMarker: "bad" })
      ?.positionMarker,
    undefined,
  );
});
