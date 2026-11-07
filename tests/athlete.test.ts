import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appendPoint,
  clock,
  distance,
  elapsed,
  emptyAthlete,
  number,
  pace,
  Point,
  restoreAthlete,
  routeDistance,
  seasonStats,
  today,
  validDate,
} from "../src/athlete/domain";
import { parseFood } from "../src/athlete/food";
const point = (latitude = 0, timestamp = 1000, segment = 1): Point => ({
  latitude,
  longitude: 0,
  timestamp,
  accuracy: 5,
  segment,
});
test("GPS uses earth distance, rejects drift/jumps/bad accuracy and never joins paused segments", () => {
  assert.ok(Math.abs(distance(point(), point(0.001)) - 111.195) < 0.1);
  const a = [point()];
  assert.equal(appendPoint(a, point(0.01, 2000)), a);
  assert.equal(appendPoint(a, { ...point(0.00003, 2000), accuracy: 99 }), a);
  assert.equal(appendPoint(a, point(0, 2000)), a);
  assert.equal(appendPoint(a, point(0.00003, 500)), a);
  const b = appendPoint(a, point(0.00003, 2000));
  assert.equal(b.length, 2);
  assert.ok(routeDistance(b) > 3);
  const c = appendPoint(b, point(0.01, 4000, 2));
  assert.equal(routeDistance(c), routeDistance(b));
  assert.equal(
    appendPoint(
      Array.from({ length: 5000 }, (_, i) =>
        point(i * 0.00001, 1000 + i * 1000),
      ),
      point(0.05, 5001000),
    ).length,
    5000,
  );
});
test("local dates reject impossible calendar days and elapsed time never becomes negative", () => {
  assert.equal(today(new Date(2026, 10, 6, 23, 59)), "2026-11-06");
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2026-13-01"), false);
  assert.equal(validDate("2026-2-01"), false);
  assert.equal(elapsed(1000, 500), 0);
  assert.equal(elapsed(1000, 4500), 3);
  assert.equal(clock(65), "1:05");
  assert.equal(pace(1000, 300), "5:00 /km");
  assert.equal(pace(0, 300), "—");
});
test("restore discards malformed rows, deduplicates ids, recomputes GPS distance and bounds lists", () => {
  const run = {
    id: "r",
    date: "2026-11-06",
    seconds: 20,
    meters: 99999,
    points: [point(), point(0.00003, 2000)],
  };
  const match = {
    id: "m",
    date: "2026-11-06",
    opponent: "United",
    minutes: 90,
    goals: 1,
    assists: 2,
    saves: 0,
    result: "Win",
  };
  const state = restoreAthlete({
    runs: [run, { ...run, id: "bad", points: [{ ...point(), latitude: 100 }] }],
    matches: [match, match, { ...match, id: "x", goals: -1 }],
    recovery: [{ id: "z", date: "2026-02-30", water: 200, sleep: 8 }],
    meals: [
      { id: "food", date: "2026-11-06", name: "Lunch", photo: "../secret" },
    ],
  });
  assert.equal(state.runs.length, 1);
  assert.ok(state.runs[0].meters < 4);
  assert.equal(state.matches.length, 1);
  assert.equal(state.recovery.length, 0);
  assert.equal(state.meals.length, 0);
  assert.deepEqual(restoreAthlete(null), emptyAthlete());
  const bounded = restoreAthlete({
    routines: Array.from({ length: 1100 }, (_, i) => ({
      id: String(i),
      date: "2026-11-06",
      name: "Routine",
    })),
  });
  assert.equal(bounded.routines.length, 1000);
  assert.deepEqual(
    seasonStats([match, { ...match, id: "old", date: "2025-01-01" }], "2026"),
    { games: 1, minutes: 90, goals: 1, assists: 2, saves: 0 },
  );
});
test("optional label values stay unknown when missing; invalid numeric entries never save", () => {
  assert.equal(number("", 100, true), undefined);
  assert.ok(Number.isNaN(number("Infinity", 100)));
  assert.ok(Number.isNaN(number("-1", 100)));
  assert.equal(number("2.5", 100), 2.5);
  assert.equal(parseFood({ status: 0 }), null);
  assert.deepEqual(
    parseFood({
      status: 1,
      product: {
        product_name: "Oats",
        nutriments: {
          "energy-kcal_100g": 370,
          proteins_100g: NaN,
          fat_100g: -2,
        },
      },
    }),
    {
      name: "Oats",
      calories: 370,
      protein: undefined,
      carbs: undefined,
      fat: undefined,
    },
  );
});

test("barcode input validates scanned or typed product digits without accepting URLs or whitespace", async () => {
  const { validBarcode } = await import("../src/athlete/food");
  assert.equal(validBarcode("12345678"), true);
  assert.equal(validBarcode("01234567890123"), true);
  for (const code of [
    "1234567",
    "123456789012345",
    "https://example.com",
    "1234 5678",
    "12345678\n",
    "",
    null,
  ])
    assert.equal(validBarcode(code), false);
});
test("AI photo responses remain editable estimates with unknowns, bounds and no target modes", async () => {
  const { parseFoodEstimate } = await import("../src/athlete/aiFood");
  const raw = {
    name: "Rice bowl",
    calories: 430.5,
    protein: 12.2,
    carbs: null,
    fat: null,
    notes: ["Portion uncertain. Check ingredients."],
    source: "openai",
    approximate: true,
    editable: true,
  };
  assert.deepEqual(parseFoodEstimate(raw), {
    name: "Rice bowl",
    calories: 431,
    protein: 12,
    carbs: undefined,
    fat: undefined,
    notes: raw.notes,
    source: "AI photo estimate",
  });
  for (const bad of [
    { ...raw, calories: Infinity },
    { ...raw, protein: -1 },
    { ...raw, fat: 10001 },
    { ...raw, calories: "500" },
    { ...raw, source: "sample" },
    { ...raw, approximate: false },
    { ...raw, editable: false },
    { ...raw, mode: "weight-loss" },
    { ...raw, targetCalories: 1500 },
    { ...raw, notes: ["x".repeat(501)] },
    null,
  ])
    assert.throws(() => parseFoodEstimate(bad));
  const saved = restoreAthlete({
    meals: [
      {
        id: "ai",
        date: "2026-11-06",
        name: "Rice bowl",
        source: "AI photo estimate",
        estimateNotes: raw.notes,
        calories: 431,
      },
    ],
  });
  assert.equal(saved.meals[0].source, "AI photo estimate");
  assert.deepEqual(saved.meals[0].estimateNotes, raw.notes);
});
