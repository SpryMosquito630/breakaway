import test from "node:test";
import assert from "node:assert/strict";
import { personalRating } from "../src/domain/rating";
import { initialData, type Benchmark } from "../src/domain/model";
import { restoreAppData } from "../src/domain/storage";
import { drills } from "../src/data/drills";
const result = (count: number, day: number): Benchmark => ({
  id: String(day),
  date: new Date(Date.UTC(2026, 0, day)).toISOString(),
  count,
});

test("personal OVR needs a positive baseline and never divides by zero", () => {
  assert.equal(personalRating([]).index, null);
  assert.equal(personalRating([result(0, 1), result(0, 2)]).index, null);
  const rated = personalRating([result(0, 1), result(20, 2)]);
  assert.equal(rated.index, 100);
  assert.equal(rated.baseline?.id, "2");
  assert.deepEqual(
    rated.history.map((r) => r.index),
    [null, 100],
  );
});
test("rating reflects growth, drops, equal results and zero without a cap", () => {
  for (const [count, expected] of [
    [25, 125],
    [10, 50],
    [20, 100],
    [0, 0],
    [999, 4995],
  ]) {
    const rating = personalRating([result(20, 1), result(count, 2)]);
    assert.equal(rating.index, expected);
    assert.equal(rating.delta, expected - 100);
  }
});
test("chronological results establish the baseline without mutating storage order", () => {
  const saved = [result(25, 3), result(20, 1), result(10, 2)];
  const rating = personalRating(saved);
  assert.equal(rating.index, 125);
  assert.deepEqual(
    rating.history.map((r) => r.index),
    [100, 50, 125],
  );
  assert.deepEqual(
    saved.map((r) => r.id),
    ["3", "1", "2"],
  );
});
test("invalid counts or timestamps cannot contribute to a rating", () => {
  const invalid = [-1, 1000, 1.5, NaN, Infinity].map((n) => result(n, 1));
  const rating = personalRating([
    ...invalid,
    { ...result(99, 1), date: "bad" },
    result(20, 2),
  ]);
  assert.equal(rating.index, 100);
  assert.equal(rating.history.length, 1);
});
test("OVR reconstructs from existing persisted benchmarks with no duplicate rating state", () => {
  const saved = { ...initialData(), benchmarks: [result(20, 1), result(25, 2)] };
  const restored = restoreAppData(JSON.stringify(saved), drills);
  assert.equal(personalRating(restored.benchmarks).index, 125);
  assert.equal(personalRating(initialData().benchmarks).index, null);
});
