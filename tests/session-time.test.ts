import test from "node:test";
import assert from "node:assert/strict";
import { drills } from "../src/data/drills";
import { getDrillDuration, initialData, type AppData } from "../src/domain/model";
import { localDateKey, planForDate } from "../src/domain/planning";
import { restoreAppData } from "../src/domain/storage";
import {
  millisecondsUntilTomorrow,
  sanitizeTodaySession,
  sessionForToday,
  sessionMinutesToday,
  setTodayMinutes,
  todayOverride,
} from "../src/domain/sessionTime";

const day = new Date(2026, 10, 6, 12);
const base = (): AppData => ({
  ...initialData(),
  onboarded: true,
  plan: ["weak", "sole", "inside"],
  planCustomized: true,
});

test("today's 10-minute choice changes blocks without changing the profile, drill count, manual order or history", () => {
  const data = base();
  const adjusted = setTodayMinutes(data, 10, day);
  assert.equal(adjusted.profile, data.profile);
  assert.equal(adjusted.plan, data.plan);
  assert.equal(adjusted.history, data.history);
  assert.equal(adjusted.benchmarks, data.benchmarks);
  assert.deepEqual(adjusted.todaySession, { date: localDateKey(day), minutes: 10 });
  const active = sessionForToday(adjusted, drills, day);
  assert.deepEqual(active.ids, data.plan);
  assert.equal(active.duration, 160);
  assert.equal(active.remaining, 160);
  assert.equal(active.ids.length * active.duration + 120, 600);
  assert.equal(active.warmed, false);
  assert.equal(getDrillDuration(adjusted.profile.minutes, active.ids.length), 260);
  assert.deepEqual(
    planForDate(drills, adjusted.profile, adjusted.plan, day, true),
    data.plan,
  );
  assert.equal(sessionMinutesToday(setTodayMinutes(adjusted, undefined, day), day), 15);
  assert.equal(setTodayMinutes(adjusted, undefined, day).todaySession, undefined);
});

test("all allowed times persist and survive reopening; legacy saves and malformed optional overrides retain other data", () => {
  for (const minutes of [10, 15, 20, 30] as const) {
    const data = setTodayMinutes(base(), minutes, day);
    const restored = restoreAppData(JSON.stringify(data), drills);
    assert.equal(sessionMinutesToday(restored, day), minutes);
    assert.deepEqual(restored.profile, data.profile);
    assert.deepEqual(restored.plan, data.plan);
  }
  assert.equal(restoreAppData(JSON.stringify(base()), drills).todaySession, undefined);
  for (const value of [
    null,
    [],
    "10",
    10,
    {},
    { date: "2026-11-06", minutes: "10" },
    { date: "2026-11-06", minutes: 0 },
    { date: "2026-11-06", minutes: 25 },
    { date: "2026-02-29", minutes: 10 },
    { date: "2026-11-31", minutes: 10 },
    { date: "2026-11-06T00:00:00Z", minutes: 10 },
  ]) {
    const data = base();
    const restored = restoreAppData(
      JSON.stringify({ ...data, todaySession: value }),
      drills,
    );
    assert.equal(restored.todaySession, undefined);
    assert.deepEqual(restored.profile, data.profile);
    assert.deepEqual(restored.plan, data.plan);
  }
  assert.deepEqual(
    sanitizeTodaySession({ date: "2028-02-29", minutes: 10, extra: "discard" }),
    { date: "2028-02-29", minutes: 10 },
  );
});

test("an active session freezes timing across later overrides, reset attempts, restores and midnight", () => {
  const adjusted = setTodayMinutes(base(), 10, day);
  const active = sessionForToday(adjusted, drills, day);
  const data = { ...adjusted, active };
  assert.equal(setTodayMinutes(data, 30, day), data);
  assert.equal(setTodayMinutes(data, undefined, day), data);
  const tomorrow = new Date(2026, 10, 7, 12);
  assert.equal(sessionForToday(data, drills, tomorrow), active);
  const restored = restoreAppData(JSON.stringify(data), drills);
  assert.deepEqual(
    JSON.parse(JSON.stringify(restored.active)),
    JSON.parse(JSON.stringify(active)),
  );
  assert.equal(sessionForToday(restored, drills, tomorrow), restored.active);
  // Finishing and training again uses today's setting, then reverts tomorrow.
  assert.equal(sessionForToday({ ...data, active: null }, drills, day).duration, 160);
  assert.equal(
    sessionForToday({ ...data, active: null }, drills, tomorrow).duration,
    260,
  );
});

test("overrides expire at local midnight, even on rest days, in different zones and across DST", () => {
  const original = process.env.TZ;
  try {
    for (const zone of ["America/Los_Angeles", "Pacific/Auckland", "Asia/Tokyo", "UTC"]) {
      process.env.TZ = zone;
      const end = new Date(2026, 10, 7, 23, 59, 59, 999);
      const next = new Date(2026, 10, 8);
      const data = setTodayMinutes(base(), 10, end);
      assert.equal(sessionMinutesToday(data, end), 10, zone);
      assert.equal(sessionMinutesToday(data, next), 15, zone);
      assert.equal(todayOverride(data, new Date(2026, 10, 6, 23)), undefined, zone);
      assert.equal(millisecondsUntilTomorrow(end), 1, zone);
      assert.deepEqual(data.profile.days, ["Mon", "Wed", "Fri"]);
    }
    process.env.TZ = "America/Los_Angeles";
    assert.equal(millisecondsUntilTomorrow(new Date(2026, 2, 8)), 23 * 60 * 60 * 1000);
    assert.equal(millisecondsUntilTomorrow(new Date(2026, 10, 1)), 25 * 60 * 60 * 1000);
    const data = setTodayMinutes(base(), 10, new Date(2026, 10, 1, 0, 30));
    assert.equal(sessionMinutesToday(data, new Date(2026, 10, 1, 23, 30)), 10);
    assert.equal(sessionMinutesToday(data, new Date(2026, 10, 2)), 15);
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
