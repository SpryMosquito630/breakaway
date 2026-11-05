import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultReminders, desiredReminders, normalizeReminders, reconcileReminders, REMINDER_PREFIX, Reminder, ReminderScheduler, ScheduledReminder } from '../src/notifications/schedule';
function fake(initial: ScheduledReminder[] = []) {
  const items = new Map(initial.map(n => [n.identifier, n]));
  const canceled: string[] = []; const added: Reminder[] = [];
  const api: ReminderScheduler = {
    list: async () => [...items.values()],
    cancel: async id => { canceled.push(id); items.delete(id); },
    schedule: async reminder => { added.push(reminder); items.set(reminder.identifier, { identifier: reminder.identifier, content: { data: { reminderSignature: reminder.signature } } }); },
  };
  return { api, items, canceled, added };
}
const enabled = { enabled: true, hour: 18, minute: 35 };
test('reminders default off and normalize older or malformed saved settings', () => {
  assert.deepEqual(normalizeReminders(undefined), defaultReminders());
  assert.deepEqual(normalizeReminders({ enabled: true, hour: 99, minute: -1 }), { enabled: true, hour: 18, minute: 0 });
  assert.deepEqual(normalizeReminders({ enabled: 'true', hour: 0, minute: 59 }), { enabled: false, hour: 0, minute: 59 });
});
test('training weekdays map to Expo Sunday=1 and ignore duplicates/unknown days', () => {
  const result = desiredReminders(['Mon', 'Sun', 'Mon', 'Nope', 'Sat'], enabled);
  assert.deepEqual(result.map(n => [n.weekday, n.hour, n.minute]), [[1,18,35],[2,18,35],[7,18,35]]);
  assert.equal(new Set(result.map(n => n.identifier)).size, 3);
  assert.deepEqual(desiredReminders(['Mon'], defaultReminders()), []);
});
test('repeated scheduling and relaunch reconcile do not duplicate existing reminders', async () => {
  const f = fake(); const wanted = desiredReminders(['Mon','Wed','Fri'], enabled);
  await reconcileReminders(f.api, wanted); await reconcileReminders(f.api, wanted);
  const reloaded = fake([...f.items.values()]);
  await reconcileReminders(reloaded.api, wanted);
  assert.equal(f.added.length, 3); assert.equal(f.items.size, 3);
  assert.equal(reloaded.added.length, 0); assert.equal(reloaded.canceled.length, 0);
});
test('schedule and time edits replace stale owned reminders and preserve unrelated notifications', async () => {
  const unrelated = { identifier: 'session-timer', content: {} };
  const f = fake([unrelated]);
  await reconcileReminders(f.api, desiredReminders(['Mon','Wed'], enabled));
  await reconcileReminders(f.api, desiredReminders(['Wed','Sun'], { ...enabled, hour: 9, minute: 0 }));
  assert.deepEqual([...f.items.keys()].sort(), ['session-timer', `${REMINDER_PREFIX}1`, `${REMINDER_PREFIX}4`].sort());
  assert.ok(!f.canceled.includes('session-timer'));
  assert.equal(f.items.get(`${REMINDER_PREFIX}4`)?.content.data?.reminderSignature, '4:9:0');
  await reconcileReminders(f.api, []);
  assert.deepEqual([...f.items.values()], [unrelated]);
});
test('failed scheduling rolls back newly added reminders; a retry recovers', async () => {
  const f = fake(); const wanted = desiredReminders(['Mon','Wed','Fri'], enabled);
  const original = f.api.schedule; let calls = 0;
  f.api.schedule = async n => { if (++calls === 2) throw Error('device failed'); await original(n); };
  await assert.rejects(reconcileReminders(f.api, wanted));
  assert.equal(f.items.size, 0);
  f.api.schedule = original;
  await reconcileReminders(f.api, wanted);
  assert.equal(f.items.size, 3);
});
