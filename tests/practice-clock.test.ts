import test from "node:test";
import assert from "node:assert/strict";
import {
  getDrillDuration,
  makeSession,
  tickWithSignals,
  pause,
  advance,
  recap,
  replaceActiveDrill,
} from "../src/domain/model";
import { restoreAppData } from "../src/domain/storage";
import { drills } from "../src/data/drills";
import { initialData } from "../src/domain/model";
test("duration display and sessions share the same calculation", () => {
  for (const minutes of [15, 20, 30]) {
    const session = makeSession(["sole", "inside", "turn"], minutes, 0, drills);
    assert.equal(session.duration, getDrillDuration(minutes, 3));
  }
  assert.equal(makeSession(["sole"], 5, 0).duration, 180);
});
test("10-second warning and finish fire once, including pause and restored restart", () => {
  let a = { ...makeSession(["sole"], 5, 0), running: true };
  let step = tickWithSignals(a, 170000);
  assert.deepEqual(step.signals, ["warning"]);
  a = pause(step.active, 170000);
  assert.deepEqual(tickWithSignals(a, 999000).signals, []);
  const data = { ...initialData(), active: a };
  a = restoreAppData(JSON.stringify(data), drills).active!;
  step = tickWithSignals({ ...a, running: true, last: 999000 }, 1000000);
  assert.deepEqual(step.signals, []);
  step = tickWithSignals(step.active, 1010000);
  assert.deepEqual(step.signals, ["finish"]);
  assert.equal(step.active.remaining, 0);
  assert.deepEqual(tickWithSignals(step.active, 2000000).signals, []);
});
test("a replaced block keeps practiced partial result and resets cue flags", () => {
  let a = { ...makeSession(["sole"], 5, 0, drills), running: true };
  a = tickWithSignals(a, 170000).active;
  const replacement = replaceActiveDrill(
    a,
    0,
    "inside",
    drills.find((d) => d.id === "inside"),
    170000,
  );
  assert.equal(replacement.elapsed, 170);
  assert.equal(replacement.results?.[0].status, "partial");
  assert.equal(replacement.results?.[0].seconds, 170);
  assert.equal(replacement.warningSent, false);
  assert.equal(replacement.finishSent, false);
  assert.equal(replacement.blockElapsed, 0);
});
test("new history attributes done/partial/skipped blocks without inventing old attribution", () => {
  let a = {
    ...makeSession(["sole", "inside", "turn"], 5, 0, drills),
    running: true,
  };
  a = advance(a, false, 90000);
  a = { ...a, running: true, last: 90000 };
  a = advance(a, true, 95000);
  a = advance(a, true, 95000);
  const h = recap(a, 95000);
  assert.deepEqual(
    h.drills?.map((d) => d.status),
    ["done", "partial", "skipped"],
  );
  assert.deepEqual(
    h.drills?.map((d) => d.seconds),
    [60, 5, 0],
  );
  const legacy = { ...h };
  delete legacy.drills;
  const restored = restoreAppData(
    JSON.stringify({ ...initialData(), history: [legacy] }),
    drills,
  );
  assert.equal(restored.history[0].drills, undefined);
});
test("snapshot freezes selected-stage instructions and rejects malformed optional storage", () => {
  const d = drills[0];
  const a = makeSession([d.id], 5, 0, [
    { ...d, difficulty: 2, cue: "Saved cue", steps: ["Saved instruction"] },
  ]);
  assert.equal(a.snapshots?.[d.id].cue, "Saved cue");
  assert.deepEqual(a.snapshots?.[d.id].steps, ["Saved instruction"]);
  const data = {
    ...initialData(),
    active: {
      ...a,
      snapshots: { [d.id]: { version: "bad", difficulty: 2 } },
      results: [{ id: d.id, version: 1, difficulty: 1, status: "done", seconds: 0 }],
    },
    history: [
      {
        id: "old",
        date: new Date(0).toISOString(),
        seconds: 10,
        done: 1,
        skipped: 0,
        total: 1,
        completed: true,
        drills: [{ id: d.id, status: "done", seconds: 10 }],
      },
    ],
  };
  const restored = restoreAppData(JSON.stringify(data), drills);
  assert.equal(restored.active?.snapshots?.[d.id], undefined);
  assert.deepEqual(restored.active?.results, []);
  assert.deepEqual(restored.history[0].drills, []);
});

test("malformed optional history cannot create a completion or typed difficulty", () => {
  const base = {
    id: "bad",
    date: new Date(0).toISOString(),
    seconds: 30,
    done: 1,
    skipped: 0,
    total: 1,
    completed: "false",
    effort: "Easy",
    drills: [{ id: "sole", version: 1, difficulty: "2", status: "done", seconds: 30 }],
  };
  const malformed = {
    ...initialData(),
    history: [base, { ...base, id: "bad-effort", completed: true, effort: 99 }],
  };
  const saved = restoreAppData(JSON.stringify(malformed), drills);
  assert.equal(saved.history[0].completed, false);
  assert.deepEqual(saved.history[0].drills, []);
  assert.equal(saved.history[1].effort, undefined);
});

test("ending a fully elapsed current block logs its completion consistently", () => {
  const a = { ...makeSession(["sole"], 5, 0, drills), running: true };
  const result = recap(a, 180000);
  assert.equal(result.done, 1);
  assert.equal(result.completed, true);
  assert.equal(result.drills?.[0].status, "done");
});
