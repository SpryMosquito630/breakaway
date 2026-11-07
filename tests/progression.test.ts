import test from "node:test";
import assert from "node:assert/strict";
import { initialData, type History } from "../src/domain/model";
import { drills } from "../src/data/drills";
import {
  deriveProgression,
  practiceEvents,
  scheduleStreak,
  dayKey,
} from "../src/progression/engine";
const now = new Date(2026, 10, 6, 12);
const date = (day: number) => new Date(2026, 10, day, 10).toISOString();
const session = (id = "session", day = 6): History => ({
  id,
  date: date(day),
  seconds: 60,
  done: 1,
  skipped: 0,
  total: 1,
  completed: true,
  drills: [{ id: drills[0].id, version: 1, difficulty: 1, status: "done", seconds: 60 }],
});
test("XP is derived idempotently from unique completed work, not session counters", () => {
  const data = initialData();
  data.history = [
    session(),
    session(),
    { ...session("legacy"), drills: undefined, done: 100 },
    { ...session("skipped"), drills: [{ ...session().drills![0], status: "skipped" }] },
    { ...session("partial"), drills: [{ ...session().drills![0], status: "partial" }] },
  ];
  const first = deriveProgression(data, drills, now);
  assert.equal(first.events.length, 1);
  assert.equal(first.xp, 12);
  assert.deepEqual(deriveProgression(data, drills, now), first);
});
test("elapsed session budget and duplicate drill records prevent inflated XP", () => {
  const h = session();
  h.drills!.push({ ...h.drills![0] }, { ...h.drills![0], id: "second" });
  assert.equal(practiceEvents([h], drills, now).length, 1);
  assert.equal(practiceEvents([{ ...h, seconds: 20 }], drills, now).length, 0);
  assert.equal(practiceEvents([{ ...h, date: date(7) }], drills, now).length, 0);
});
test("practice daily cap, level thresholds, tests once per protocol/day", () => {
  const data = initialData();
  data.history = Array.from({ length: 30 }, (_, i) => session(String(i)));
  data.benchmarks = [
    { id: "t1", date: date(6), count: 5 },
    { id: "t2", date: date(6), count: 10 },
    { id: "t3", date: date(7), count: 99 },
  ];
  data.assessments = [
    { id: "a1", date: date(6), skill: "passing", protocolVersion: 1, value: 10 },
    { id: "a2", date: date(6), skill: "passing", protocolVersion: 1, value: 20 },
  ];
  const p = deriveProgression(data, drills, now);
  assert.equal(p.practiceXP, 200);
  assert.equal(p.testXP, 10);
  assert.equal(p.level, 2);
  assert.equal(p.levelStart, 100);
  assert.equal(p.levelEnd, 400);
});
test("schedule streak preserves rest, allows unfinished today, breaks after missed training day", () => {
  const schedule = ["Mon", "Wed", "Fri"];
  assert.deepEqual(scheduleStreak(["2026-11-02", "2026-11-04"], schedule, now), {
    current: 2,
    longest: 2,
  });
  assert.deepEqual(
    scheduleStreak(["2026-11-02", "2026-11-04"], schedule, new Date(2026, 10, 7)),
    { current: 0, longest: 2 },
  );
  assert.deepEqual(scheduleStreak(["2026-11-02", "2026-11-06"], schedule, now), {
    current: 1,
    longest: 1,
  });
});
test("weekly and monthly challenges use local calendar periods and real done drills", () => {
  const data = initialData();
  data.history = [session("old", 1), session("mon", 2), session("fri", 6)];
  const p = deriveProgression(data, drills, now);
  assert.equal(p.weekKey, "2026-11-02");
  assert.equal(p.weekDays, 2);
  assert.equal(p.seasonDays, 3);
  assert.equal(p.challenges[0].value, 1);
  assert.equal(p.challenges[1].value, 2);
  assert.equal(dayKey(new Date(2026, 10, 1, 23, 59)), "2026-11-01");
});
test("skill tree unlocks only practice criteria; no invented ability from level", () => {
  const data = initialData();
  data.history = [session("1", 2), session("2", 4), session("3", 6)];
  const p = deriveProgression(data, drills, now);
  const branch = p.branches.find((b) => b.skill === drills[0].skill)!;
  assert.equal(branch.nodes[1].value, 3);
  assert.equal(branch.nodes[2].value, 1);
  assert.equal(branch.nodes[3].value, 0);
  assert.equal(p.badges.find((b) => b.id === "tested")!.earned, false);
});

import { restoreSeasonPreferences } from "../src/progression/preferences";
import { latestPersonalBest } from "../src/progression/engine";
test("season preferences restore only supported targets and valid period keys", () => {
  assert.deepEqual(restoreSeasonPreferences(null), { goals: {} });
  assert.deepEqual(
    restoreSeasonPreferences({
      goals: {
        "2026-11": 8,
        "2026-12": 12,
        "2026-13": 8,
        "2026-10": 999,
        bad: 4,
        "2026-09": "8",
      },
    }),
    { goals: { "2026-11": 8, "2026-12": 12 } },
  );
});
test("personal best requires a strict comparable improvement, including beyond capped ratings", () => {
  const data = initialData();
  data.assessments = [
    { id: "a", date: date(2), skill: "pace", protocolVersion: 1, value: 2.5 },
    { id: "b", date: date(6), skill: "pace", protocolVersion: 1, value: 2.4 },
  ];
  assert.equal(latestPersonalBest(data, now)?.title, "Pace personal best");
  data.assessments[1].value = 2.5;
  assert.equal(latestPersonalBest(data, now), null);
  data.benchmarks = [
    { id: "1", date: date(2), count: 10 },
    { id: "2", date: date(6), count: 11 },
  ];
  assert.equal(latestPersonalBest(data, now)?.title, "Touch-test personal best");
});
