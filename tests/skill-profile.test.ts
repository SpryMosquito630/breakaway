import test from "node:test";
import assert from "node:assert/strict";
import { radarPoint, skillProfile } from "../src/domain/skillProfile";

test("actual profile stays unrated for all six distinct skills", () => {
  const actual = skillProfile();
  assert.equal(actual.overall, null);
  assert.equal(actual.sample, false);
  assert.equal(new Set(actual.skills.map((skill) => skill.id)).size, 6);
  assert.ok(actual.skills.every((skill) => skill.rating === null));
});
test("preview values are bounded, explicitly sample and cannot mutate the actual profile", () => {
  const preview = skillProfile(true);
  assert.equal(preview.sample, true);
  assert.equal(preview.overall, 73);
  assert.ok(preview.skills.every((skill) => skill.rating! >= 0 && skill.rating! <= 100));
  preview.skills[0].rating = 0;
  assert.equal(skillProfile(true).skills[0].rating, 78);
  assert.ok(skillProfile().skills.every((skill) => skill.rating === null));
});
test("radar has six separate axes, scales inward and collapses zero at the center", () => {
  const full = Array.from({ length: 6 }, (_, i) => radarPoint(i, 100));
  assert.equal(new Set(full.map((point) => `${point.x},${point.y}`)).size, 6);
  assert.deepEqual(full[0], { x: 150, y: 65 });
  for (let i = 0; i < 6; i++) {
    const half = radarPoint(i, 50);
    assert.ok(Math.abs(Math.hypot(half.x - 150, half.y - 150) - 42.5) < 1e-10);
    assert.deepEqual(radarPoint(i, 0), { x: 150, y: 150 });
  }
});
