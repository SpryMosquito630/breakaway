import { trainingPlanToday } from "./training";
import { makeSession, type AppData, type Drill, type TodaySession } from "./model";
import { localDateKey, planForDate } from "./planning";

export const todayMinuteChoices = [10, 15, 20, 30] as const;

/** An optional malformed override must never invalidate the rest of a saved app. */
export function sanitizeTodaySession(value: unknown): TodaySession | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const { date, minutes } = value as Record<string, unknown>;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const parsed = new Date(`${date}T12:00:00`);
  if (!Number.isFinite(parsed.getTime()) || localDateKey(parsed) !== date) return;
  if (!todayMinuteChoices.includes(minutes as TodaySession["minutes"])) return;
  return { date, minutes: minutes as TodaySession["minutes"] };
}

export function todayOverride(data: AppData, now = new Date()) {
  const value = sanitizeTodaySession(data.todaySession);
  return value?.date === localDateKey(now) ? value : undefined;
}

export function sessionMinutesToday(data: AppData, now = new Date()) {
  const requested = todayOverride(data, now)?.minutes ?? data.profile.minutes;
  const match = data.trainingPreferences?.matchDays.includes(
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()],
  );
  const low =
    data.dailyReadiness?.date === localDateKey(now) &&
    data.dailyReadiness.energy === "Low";
  return match || low ? Math.min(10, requested) : requested;
}

export function setTodayMinutes(
  data: AppData,
  minutes: TodaySession["minutes"] | undefined,
  now = new Date(),
): AppData {
  // An active session always retains the timing it was created with.
  if (data.active) return data;
  if (minutes === undefined) {
    const { todaySession: _, ...rest } = data;
    return rest;
  }
  return { ...data, todaySession: { date: localDateKey(now), minutes } };
}

export function sessionForToday(data: AppData, catalog: Drill[], now = new Date()) {
  return (
    data.active ??
    makeSession(
      trainingPlanToday(data, catalog, now),
      sessionMinutesToday(data, now),
      now.getTime(),
      catalog,
    )
  );
}

/** Calendar arithmetic handles 23- and 25-hour local days at DST boundaries. */
export function millisecondsUntilTomorrow(now = new Date()) {
  return (
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
    now.getTime()
  );
}
