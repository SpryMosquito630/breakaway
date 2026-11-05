/** Expo weekday numbers: Sunday = 1. Unknown days never schedule a reminder. */
const weekdays: Record<string, number> = {
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
  Sat: 7,
};
export type ReminderPreferences = {
  enabled: boolean;
  hour: number;
  minute: number;
};
export const defaultReminders = (): ReminderPreferences => ({
  enabled: false,
  hour: 18,
  minute: 0,
});
export function normalizeReminders(value: unknown): ReminderPreferences {
  const p = value as Partial<ReminderPreferences> | null;
  return {
    enabled: p?.enabled === true,
    hour:
      Number.isInteger(p?.hour) && p!.hour! >= 0 && p!.hour! <= 23
        ? p!.hour!
        : 18,
    minute:
      Number.isInteger(p?.minute) && p!.minute! >= 0 && p!.minute! <= 59
        ? p!.minute!
        : 0,
  };
}
export const REMINDER_PREFIX = "breakaway-training-v1-";
export type Reminder = {
  identifier: string;
  weekday: number;
  hour: number;
  minute: number;
  signature: string;
};
export type ScheduledReminder = {
  identifier: string;
  content: { data?: Record<string, unknown> };
  trigger?: unknown;
};
export interface ReminderScheduler {
  list(): Promise<ScheduledReminder[]>;
  cancel(identifier: string): Promise<void>;
  schedule(reminder: Reminder): Promise<void>;
}
export function desiredReminders(
  days: string[],
  preferences: ReminderPreferences,
): Reminder[] {
  const p = normalizeReminders(preferences);
  if (!p.enabled) return [];
  return [...new Set(days.map((day) => weekdays[day]).filter(Boolean))]
    .sort()
    .map((weekday) => ({
      identifier: `${REMINDER_PREFIX}${weekday}`,
      weekday,
      hour: p.hour,
      minute: p.minute,
      signature: `${weekday}:${p.hour}:${p.minute}`,
    }));
}
/** Reconcile against the OS, so retries and interrupted/relaunched apps stay idempotent. */
export async function reconcileReminders(
  api: ReminderScheduler,
  desired: Reminder[],
) {
  const scheduled = await api.list();
  const retained = new Set<string>();
  for (const item of scheduled) {
    if (!item.identifier.startsWith(REMINDER_PREFIX)) continue;
    const target = desired.find((d) => d.identifier === item.identifier);
    if (
      target &&
      item.content.data?.reminderSignature === target.signature &&
      !retained.has(item.identifier)
    )
      retained.add(item.identifier);
    else await api.cancel(item.identifier);
  }
  const added: string[] = [];
  try {
    for (const reminder of desired) {
      if (retained.has(reminder.identifier)) continue;
      await api.schedule(reminder);
      added.push(reminder.identifier);
    }
  } catch (error) {
    // Roll back partial new schedules. A later reconcile can retry from OS state.
    await Promise.all(added.map((identifier) => api.cancel(identifier)));
    throw error;
  }
}
