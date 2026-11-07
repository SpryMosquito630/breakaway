import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultReminders,
  desiredReminders,
  normalizeReminders,
  reconcileReminders,
  REMINDER_PREFIX,
  Reminder,
  ReminderScheduler,
  ScheduledReminder,
} from "../src/notifications/schedule";
function fake(initial: ScheduledReminder[] = []) {
  const items = new Map(initial.map((n) => [n.identifier, n]));
  const canceled: string[] = [];
  const added: Reminder[] = [];
  const api: ReminderScheduler = {
    list: async () => [...items.values()],
    cancel: async (id) => {
      canceled.push(id);
      items.delete(id);
    },
    schedule: async (reminder) => {
      added.push(reminder);
      items.set(reminder.identifier, {
        identifier: reminder.identifier,
        content: { data: { reminderSignature: reminder.signature } },
      });
    },
  };
  return { api, items, canceled, added };
}
const now = new Date(2026, 10, 2, 8, 0); // Monday, local time
const desired = (days: string[], preferences = enabled) =>
  desiredReminders(days, preferences, [], now);
const enabled = { enabled: true, hour: 18, minute: 35 };
test("reminders default off and normalize older or malformed saved settings", () => {
  assert.deepEqual(normalizeReminders(undefined), defaultReminders());
  assert.deepEqual(normalizeReminders({ enabled: true, hour: 99, minute: -1 }), {
    enabled: true,
    hour: 18,
    minute: 0,
  });
  assert.deepEqual(normalizeReminders({ enabled: "true", hour: 0, minute: 59 }), {
    enabled: false,
    hour: 0,
    minute: 59,
  });
});
test("finite local dates ignore duplicate and unknown training days", () => {
  const result = desired(["Mon", "Sun", "Mon", "Nope", "Sat"], enabled);
  assert.deepEqual(
    result.map((n) => [n.date.getDay(), n.date.getHours(), n.date.getMinutes()]),
    [
      [1, 18, 35],
      [6, 18, 35],
      [0, 18, 35],
    ],
  );
  assert.equal(new Set(result.map((n) => n.identifier)).size, 3);
  assert.deepEqual(desired(["Mon"], defaultReminders()), []);
});
test("repeated scheduling and relaunch reconcile do not duplicate existing reminders", async () => {
  const f = fake();
  const wanted = desired(["Mon", "Wed", "Fri"], enabled);
  await reconcileReminders(f.api, wanted);
  await reconcileReminders(f.api, wanted);
  const reloaded = fake([...f.items.values()]);
  await reconcileReminders(reloaded.api, wanted);
  assert.equal(f.added.length, 3);
  assert.equal(f.items.size, 3);
  assert.equal(reloaded.added.length, 0);
  assert.equal(reloaded.canceled.length, 0);
});
test("schedule and time edits replace stale owned reminders and preserve unrelated notifications", async () => {
  const unrelated = { identifier: "session-timer", content: {} };
  const f = fake([unrelated]);
  await reconcileReminders(f.api, desired(["Mon", "Wed"], enabled));
  await reconcileReminders(
    f.api,
    desired(["Wed", "Sun"], { ...enabled, hour: 9, minute: 0 }),
  );
  assert.deepEqual(
    [...f.items.keys()].sort(),
    [
      "session-timer",
      `${REMINDER_PREFIX}2026-11-08`,
      `${REMINDER_PREFIX}2026-11-04`,
    ].sort(),
  );
  assert.ok(!f.canceled.includes("session-timer"));
  assert.equal(
    f.items.get(`${REMINDER_PREFIX}2026-11-04`)?.content.data?.reminderSignature,
    desired(["Wed"], { ...enabled, hour: 9, minute: 0 })[0].signature,
  );
  await reconcileReminders(f.api, []);
  assert.deepEqual([...f.items.values()], [unrelated]);
});
test("failed scheduling rolls back newly added reminders; a retry recovers", async () => {
  const f = fake();
  const wanted = desired(["Mon", "Wed", "Fri"], enabled);
  const original = f.api.schedule;
  let calls = 0;
  f.api.schedule = async (n) => {
    if (++calls === 2) throw Error("device failed");
    await original(n);
  };
  await assert.rejects(reconcileReminders(f.api, wanted));
  assert.equal(f.items.size, 0);
  f.api.schedule = original;
  await reconcileReminders(f.api, wanted);
  assert.equal(f.items.size, 3);
});

test("practice on a local date removes that day, including partial saved sessions", async () => {
  const f = fake();
  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  await reconcileReminders(f.api, desired(allDays));
  const wanted = desiredReminders(
    allDays,
    enabled,
    [
      { date: new Date(2026, 10, 2, 7).toISOString(), seconds: 30 },
      { date: new Date(2026, 10, 3, 7).toISOString(), seconds: 0 },
    ],
    now,
  );
  await reconcileReminders(f.api, wanted);
  assert.equal(wanted.length, 6);
  assert.ok(!f.items.has(`${REMINDER_PREFIX}2026-11-02`));
  assert.ok(f.items.has(`${REMINDER_PREFIX}2026-11-03`));
});
test("week rollover removes old schedules and extends the finite horizon", async () => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const f = fake();
  await reconcileReminders(f.api, desired(days));
  const later = new Date(2026, 10, 3, 8);
  const wanted = desiredReminders(days, enabled, [], later);
  await reconcileReminders(f.api, wanted);
  assert.equal(f.items.size, 7);
  assert.ok(!f.items.has(`${REMINDER_PREFIX}2026-11-02`));
  assert.ok(f.items.has(`${REMINDER_PREFIX}2026-11-09`));
  assert.ok(wanted.every((r) => r.date > later && r.date < new Date(2026, 10, 10)));
});
test("past reminder time is excluded today and local wall-clock time survives a DST week", () => {
  const later = new Date(2026, 10, 2, 19);
  assert.equal(desiredReminders(["Mon"], enabled, [], later).length, 0);
  const dstWeek = desiredReminders(
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    enabled,
    [],
    new Date(2026, 9, 30, 8),
  );
  assert.equal(dstWeek.length, 7);
  assert.ok(dstWeek.every((r) => r.date.getHours() === 18 && r.date.getMinutes() === 35));
});
test("legacy recurring reminders are canceled during finite schedule migration", async () => {
  const f = fake([
    {
      identifier: `${REMINDER_PREFIX}2`,
      content: { data: { reminderSignature: "2:18:35" } },
    },
  ]);
  await reconcileReminders(f.api, desired(["Mon"]));
  assert.ok(f.canceled.includes(`${REMINDER_PREFIX}2`));
  assert.equal(f.items.size, 1);
});
