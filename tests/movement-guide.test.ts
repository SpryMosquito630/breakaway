import test from "node:test";
import assert from "node:assert/strict";
import { drillMovements } from "../src/data/drill-movements";
import { createMovementGuide, sampleMovementPath } from "../src/domain/movement-guide";

test("every authored guide produces ordered, finite native-driver keyframes", () => {
  for (const [id, movement] of Object.entries(drillMovements)) {
    const guide = createMovementGuide(movement, id);
    for (const track of [guide.ball, guide.foot].filter(Boolean)) {
      assert.ok(track!.length >= 2, id);
      assert.equal(track![0].time, 0, id);
      assert.equal(track!.at(-1)!.time, 1, id);
      track!.forEach((point, i) => {
        assert.ok(
          [point.x, point.y, point.time, point.opacity].every(Number.isFinite),
          id,
        );
        if (i) assert.ok(point.time > track![i - 1].time, id);
      });
    }
  }
});

test("separate SVG strokes reset invisibly, without invented connectors", () => {
  const guide = createMovementGuide(drillMovements.sole, "sole");
  const hidden = guide.ball.filter((frame) => frame.opacity === 0);
  assert.deepEqual(
    hidden.map(({ x, y }) => [x, y]),
    [
      [225, 90],
      [225, 105],
    ],
  );
  assert.equal(sampleMovementPath(drillMovements.sole.path).length, 2);
});

test("toe taps move foot markers while keeping the ball stationary", () => {
  const guide = createMovementGuide(drillMovements["toe-taps"], "toe-taps");
  assert.ok(guide.ball.every(({ x, y }) => x === 160 && y === 95));
  assert.ok(guide.foot!.some((point) => point.x < 150));
  assert.ok(guide.foot!.some((point) => point.x > 170));
});

test("step-over circles the foot before the ball travels away", () => {
  const guide = createMovementGuide(drillMovements["step-over"], "step-over");
  assert.ok(
    guide.ball
      .filter((point) => point.time <= 0.55)
      .every(({ x, y }) => x === 160 && y === 100),
  );
  assert.equal(guide.foot!.find((point) => point.time === 0.55)!.opacity, 1);
  assert.equal(guide.foot!.at(-1)!.opacity, 0);
  assert.equal(guide.ball.at(-1)!.x, 230);
});

test("curves retain their authored endpoints and unsupported paths fail closed", () => {
  const curve = sampleMovementPath("M1 2 Q10 20 30 40 C50 60 70 80 90 100")[0];
  assert.deepEqual(curve[0], { x: 1, y: 2 });
  assert.deepEqual(curve.at(-1), { x: 90, y: 100 });
  assert.throws(() => sampleMovementPath("M1 2 A3 4 5 6"));
});
