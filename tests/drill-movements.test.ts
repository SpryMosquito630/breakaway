import { test } from "node:test";
import assert from "node:assert/strict";
import { drills } from "../src/data/drills";
import { drillMovements } from "../src/data/drill-movements";
test("every catalog drill has an identified movement guide with a meaningful direction", () => {
  assert.deepEqual(Object.keys(drillMovements).sort(), drills.map(d => d.id).sort());
  for (const drill of drills) {
    const movement = drillMovements[drill.id];
    assert.ok(movement.path.startsWith("M"), drill.id);
    assert.ok(movement.caption.length > 30, drill.id);
  }
});
test("stationary toe taps keep the ball still and distinguish foot travel", () => {
  assert.equal(drillMovements["toe-taps"].path, "M160 95 L160 95");
  assert.ok(drillMovements["toe-taps"].footPath);
  assert.ok(drillMovements["step-over"].footPath);
});
