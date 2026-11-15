import test from "node:test";
import assert from "node:assert/strict";
import {
  initialData,
  makeSession,
  tick,
  advance,
  replaceActiveDrill,
} from "../src/domain/model";
import { practiceDeadline, practiceLifecycle } from "../src/domain/practiceClock";
import { restoreAppData } from "../src/domain/storage";
import { drills } from "../src/data/drills";
import { createPracticeNotifier } from "../src/notifications/practiceSchedule";
import { createAppStoreCore, APP_STORAGE_KEY } from "../src/state/appStoreCore";

const start = 100_000;
const active = (backgroundClock = false) => ({
  ...makeSession(["sole", "inside"], 15, start, drills),
  warmed: true,
  phase: "timer" as const,
  running: true,
  backgroundClock,
});

test("foreground remains the default: background transition pauses at departure and return adds no time", () => {
  const a = active();
  const stopped = practiceLifecycle(a, false, start + 5000);
  assert.equal(stopped.running, false);
  assert.equal(stopped.elapsed, 5);
  assert.equal(practiceLifecycle(stopped, true, start + 200_000).elapsed, 5);
  assert.equal(practiceDeadline(a), null);
});
test("opt-in reconciles locked time, caps at the block, and waits for explicit next", () => {
  const a = active(true);
  const deadline = practiceDeadline(a);
  const background = practiceLifecycle(a, false, start + 5000);
  assert.equal(background.running, true);
  assert.equal(practiceDeadline(background), deadline);
  const returned = practiceLifecycle(background, true, start + 2_000_000);
  assert.equal(returned.remaining, 0);
  assert.equal(returned.elapsed, a.duration);
  assert.equal(returned.blockElapsed, a.duration);
  assert.equal(returned.running, false);
  assert.equal(returned.index, 0);
  assert.equal(returned.done, 0);
  assert.equal(returned.finishSent, true);
});
test("clock rollback never subtracts elapsed practice", () => {
  const a = active(true);
  assert.equal(practiceLifecycle(a, true, start - 1000).elapsed, 0);
});
test("relaunch keeps opted-in clock running, completes expired blocks, and leaves foreground clocks paused", () => {
  for (const enabled of [true, false]) {
    const saved = {
      ...initialData(),
      backgroundPractice: enabled,
      active: active(enabled),
    };
    const restored = restoreAppData(JSON.stringify(saved), drills, start + 10_000);
    assert.equal(restored.active!.running, enabled);
    assert.equal(restored.active!.elapsed, enabled ? 10 : 0);
    const completed = restoreAppData(JSON.stringify(saved), drills, start + 2_000_000);
    assert.equal(completed.active!.remaining, enabled ? 0 : saved.active.duration);
    if (enabled) {
      const again = restoreAppData(JSON.stringify(completed), drills, start + 3_000_000);
      assert.equal(again.active!.remaining, 0);
      assert.equal(again.active!.elapsed, saved.active.duration);
      assert.equal(again.active!.index, 0);
    }
  }
});
test("a persisted session choice survives later preference changes; malformed opt-in values cannot enable it", () => {
  const saved = { ...initialData(), backgroundPractice: false, active: active(true) };
  assert.equal(
    restoreAppData(JSON.stringify(saved), drills, start + 1000).active!.running,
    true,
  );
  const malformed = {
    ...saved,
    backgroundPractice: "true",
    active: { ...active(), backgroundClock: "true" },
  };
  const restored = restoreAppData(JSON.stringify(malformed), drills, start + 1000);
  assert.equal(restored.backgroundPractice, false);
  assert.equal(restored.active!.running, false);
});
test("notification deadline remains stable across ticks and disappears on pause, advance, replacement, finish or reset", async () => {
  const calls: string[] = [];
  const notifier = createPracticeNotifier(
    {
      cancel: async () => {
        calls.push("cancel");
      },
      schedule: async (d) => {
        calls.push(`schedule:${d}`);
      },
    },
    () => start,
  );
  const a = active(true);
  await notifier.sync(a);
  await notifier.sync(tick(a, start + 10_000));
  assert.deepEqual(calls, ["cancel", `schedule:${practiceDeadline(a)}`]);
  for (const stopped of [
    { ...a, running: false },
    advance(a, true, start + 5000),
    replaceActiveDrill(
      a,
      0,
      "gates",
      drills.find((d) => d.id === "gates"),
      start + 5000,
    ),
    tick(a, start + 2_000_000),
    null,
  ]) {
    await notifier.sync(a);
    await notifier.sync(stopped);
    assert.equal(calls.at(-1), "cancel");
  }
});
test("pause/reset invalidates an in-flight native schedule and cancels it before the newest schedule", async () => {
  const calls: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let schedules = 0;
  const notifier = createPracticeNotifier(
    {
      cancel: async () => {
        calls.push("cancel");
      },
      schedule: async (d) => {
        calls.push(`schedule:${d}`);
        if (++schedules === 1) await gate;
      },
    },
    () => start,
  );
  const a = active(true);
  void notifier.sync(a);
  await new Promise((resolve) => setImmediate(resolve));
  void notifier.sync(null);
  const resumed = { ...a, last: start + 1000 };
  void notifier.sync(resumed);
  release();
  await notifier.settled();
  assert.deepEqual(calls, [
    "cancel",
    `schedule:${practiceDeadline(a)}`,
    "cancel",
    "cancel",
    "cancel",
    `schedule:${practiceDeadline(resumed)}`,
  ]);
  await notifier.sync(null);
  assert.equal(calls.at(-1), "cancel");
});
test("obsolete queued intent is never scheduled and scheduling failure permits a retry", async () => {
  const calls: string[] = [];
  let fail = true;
  const notifier = createPracticeNotifier(
    {
      cancel: async () => {
        calls.push("cancel");
      },
      schedule: async () => {
        calls.push("schedule");
        if (fail) throw Error("Native unavailable");
      },
    },
    () => start,
  );
  void notifier.sync(active(true));
  void notifier.sync(null);
  await notifier.settled();
  assert.deepEqual(calls, ["cancel", "cancel"]);
  await notifier.sync(active(true));
  fail = false;
  await notifier.sync(active(true));
  assert.equal(calls.filter((c) => c === "schedule").length, 2);
});
test("native schedule/cancel failures surface and foreground fallback does not create a retry loop", async () => {
  let failures = 0;
  let calls = 0;
  let enabled = true;
  let notifier: ReturnType<typeof createPracticeNotifier>;
  notifier = createPracticeNotifier(
    {
      cancel: async () => {
        if (++calls > 1) throw Error("Cancellation unavailable");
      },
      schedule: async () => {
        throw Error("Scheduling unavailable");
      },
    },
    () => start,
    () => {
      failures++;
      if (enabled) {
        enabled = false;
        void notifier.sync(null);
      }
    },
  );
  await notifier.sync(active(true));
  await notifier.settled();
  assert.equal(enabled, false);
  assert.equal(failures, 2);
  assert.equal(calls, 2);
});
test("lifecycle uses latest timer checkpoints and reset serializes after the last save", async () => {
  const values = new Map<string, string>();
  const store = createAppStoreCore({
    getItem: async (k) => values.get(k) ?? null,
    removeItem: async (k) => {
      values.delete(k);
    },
    setItem: async (k, v) => {
      values.set(k, v);
    },
  });
  await store.load();
  store.update((s) => ({ ...s, active: active(true) }));
  store.checkpointActive(tick(active(true), start + 5000));
  store.update((s) => ({
    ...s,
    active: practiceLifecycle(s.active!, false, start + 7000),
  }));
  assert.equal(store.getData().active!.elapsed, 7);
  store.update(() => initialData());
  await store.settled();
  assert.equal(JSON.parse(values.get(APP_STORAGE_KEY)!).active, null);
  assert.equal(JSON.parse(values.get(APP_STORAGE_KEY)!).backgroundPractice, undefined);
});
