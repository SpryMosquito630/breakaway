import type { AppData, Drill, History } from '../domain/model';
import { sanitizeAssessments } from '../domain/assessments';

export const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const midnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const shift = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export type PracticeEvent = { id: string; date: Date; day: string; drill: string; skill: string; difficulty: number; seconds: number };
export function practiceEvents(history: readonly History[], catalog: readonly Drill[], now = new Date()): PracticeEvent[] {
  const sessions = new Set<string>();
  const events: PracticeEvent[] = [];
  for (const h of [...history].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))) {
    const date = new Date(h.date);
    if (!h.id || sessions.has(h.id) || !Number.isFinite(date.getTime()) || date > now || !Number.isFinite(h.seconds) || h.seconds <= 0) continue;
    sessions.add(h.id);
    const seen = new Set<string>();
    let remaining = Math.floor(h.seconds);
    for (const d of h.drills ?? []) {
      const signature = `${d.id}:${d.version}:${d.difficulty}`;
      if (d.status !== 'done' || !d.id || seen.has(signature) || !Number.isFinite(d.seconds) || d.seconds < 30 || !Number.isInteger(d.version) || d.version < 1 || ![1, 2, 3].includes(d.difficulty)) continue;
      seen.add(signature);
      const seconds = Math.min(Math.floor(d.seconds), remaining);
      if (seconds < 30) continue;
      remaining -= seconds;
      events.push({ id: `${h.id}:${signature}`, date, day: dayKey(date), drill: d.id, skill: catalog.find((row) => row.id === d.id)?.skill ?? 'Archived drill', difficulty: d.difficulty, seconds });
    }
  }
  return events;
}
/** Rest days preserve a streak but never add to it. Today is not missed until it ends. */
export function scheduleStreak(activeDays: readonly string[], schedule: readonly string[], now = new Date()) {
  const active = new Set(activeDays);
  const selected = new Set(schedule.filter((day) => weekdays.includes(day)));
  if (!active.size) return { current: 0, longest: 0 };
  const start = new Date([...active].sort()[0] + 'T12:00:00');
  let run = 0, longest = 0;
  for (let date = midnight(start); date <= midnight(now); date = shift(date, 1)) {
    if (active.has(dayKey(date))) { run += 1; longest = Math.max(longest, run); }
    else if (selected.has(weekdays[date.getDay()]) && dayKey(date) !== dayKey(now)) run = 0;
  }
  return { current: run, longest };
}
export function deriveProgression(data: AppData, catalog: readonly Drill[], now = new Date()) {
  const events = practiceEvents(data.history, catalog, now);
  const today = dayKey(now);
  const weekStart = shift(midnight(now), -(now.getDay() + 6) % 7);
  const weekKey = dayKey(weekStart);
  const seasonKey = today.slice(0, 7);
  const days = [...new Set(events.map((e) => e.day))].sort();
  const dailyXP = new Map<string, number>();
  for (const e of events) dailyXP.set(e.day, Math.min(200, (dailyXP.get(e.day) ?? 0) + 10 + Math.floor(e.seconds / 60) * 2));
  const testKeys = new Set<string>();
  const testIds = new Set<string>();
  for (const test of sanitizeAssessments(data.assessments)) {
    const date = new Date(test.date);
    if (!test.id || date > now || testIds.has(test.id)) continue;
    testIds.add(test.id); testKeys.add(`${dayKey(date)}:${test.skill}`);
  }
  const benchmarkIds = new Set<string>();
  for (const test of data.benchmarks) {
    const date = new Date(test.date);
    if (!test.id || benchmarkIds.has(test.id) || !Number.isFinite(date.getTime()) || date > now || !Number.isInteger(test.count) || test.count < 0 || test.count > 999) continue;
    benchmarkIds.add(test.id); testKeys.add(`${dayKey(date)}:touch`);
  }
  const practiceXP = [...dailyXP.values()].reduce((n, v) => n + v, 0);
  const xp = practiceXP + testKeys.size * 5;
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const levelStart = (level - 1) ** 2 * 100;
  const levelEnd = level ** 2 * 100;
  const rank = level >= 15 ? 'Training veteran' : level >= 10 ? 'Committed player' : level >= 5 ? 'Routine builder' : 'Developing routine';
  const week = events.filter((e) => e.day >= weekKey);
  const season = events.filter((e) => e.day.startsWith(seasonKey));
  const todayEvents = events.filter((e) => e.day === today);
  const weekDays = new Set(week.map((e) => e.day)).size;
  const streak = scheduleStreak(days, data.profile.days, now);
  const branches = ['Ball control', 'Dribbling', 'Passing', 'Weaker foot'].map((skill) => {
    const practices = events.filter((e) => e.skill === skill);
    const dates = new Set(practices.map((e) => e.day)).size;
    const variety = new Set(practices.map((e) => e.drill)).size;
    return { skill, count: practices.length, days: dates, variety, nodes: [
      { title: 'Begin', detail: 'Complete 1 drill', value: practices.length, target: 1 },
      { title: 'Return', detail: 'Practice on 3 different days', value: dates, target: 3 },
      { title: 'Explore', detail: 'Complete 3 different drills, after Return', value: dates >= 3 ? variety : 0, target: 3 },
      { title: 'Build', detail: 'Complete 15 drills across 6 days, after Explore', value: dates >= 6 && variety >= 3 ? practices.length : 0, target: 15 },
    ] };
  });
  const badges = [
    { id: 'first', title: 'First whistle', detail: 'Complete your first timed drill', earned: events.length >= 1 },
    { id: 'return', title: 'Back for more', detail: 'Practice on 3 different days', earned: days.length >= 3 },
    { id: 'variety', title: 'All-round practice', detail: 'Complete a drill in each of the 4 training families', earned: branches.every((b) => b.count > 0) },
    { id: 'steady', title: 'Steady rhythm', detail: 'Reach a 6-practice-day schedule streak', earned: streak.longest >= 6 },
    { id: 'tested', title: 'Know your baseline', detail: 'Record all 6 fixed-protocol assessments', earned: new Set(sanitizeAssessments(data.assessments).filter((t) => new Date(t.date) <= now).map((t) => t.skill)).size === 6 },
  ];
  const challenges = [
    { id: `${today}:practice`, title: 'Daily practice', detail: 'Complete 2 timed drills today', value: todayEvents.length, target: 2 },
    { id: `${weekKey}:days`, title: 'Weekly rhythm', detail: `Practice on ${Math.min(3, Math.max(1, data.profile.days.length))} different days this week`, value: weekDays, target: Math.min(3, Math.max(1, data.profile.days.length)) },
    { id: `${weekKey}:variety`, title: 'Weekly variety', detail: 'Complete 3 different drills this week', value: new Set(week.map((e) => e.drill)).size, target: 3 },
    { id: `${weekKey}:test`, title: 'Check your benchmark', detail: 'Save 1 fixed-protocol assessment or touch test this week', value: [...testKeys].some((key) => key.slice(0, 10) >= weekKey) ? 1 : 0, target: 1 },
  ];
  const bestDaySeconds = Math.max(0, ...days.map((day) => events.filter((e) => e.day === day).reduce((sum, e) => sum + e.seconds, 0)));
  return { events, days, xp, practiceXP, testXP: testKeys.size * 5, level, levelStart, levelEnd, rank, streak, week, weekDays, weekKey, season, seasonKey, branches, badges, challenges, bestDaySeconds, seasonDays: new Set(season.map((e) => e.day)).size };
}

/** Compare raw results only within the same fixed protocol; capped scores can hide a best. */
export function latestPersonalBest(data: AppData, now = new Date()): { title: string; detail: string; date: string } | null {
  const candidates: { title: string; detail: string; date: string }[] = [];
  const assessments = sanitizeAssessments(data.assessments).filter((test) => new Date(test.date) <= now);
  for (const skill of ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as const) {
    const tests = assessments.filter((row) => row.skill === skill).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const latest = tests.at(-1);
    const previous = tests.slice(0, -1);
    const lowerIsBetter = skill === 'pace' || skill === 'dribbling';
    if (latest && previous.length && previous.every((row) => lowerIsBetter ? latest.value < row.value : latest.value > row.value)) candidates.push({ title: `${skill[0].toUpperCase()}${skill.slice(1)} personal best`, detail: `${latest.value} ${lowerIsBetter ? 'seconds' : 'count'} · fixed-protocol test`, date: latest.date });
  }
  const touch = data.benchmarks.filter((row) => row.id && Number.isFinite(Date.parse(row.date)) && new Date(row.date) <= now && Number.isInteger(row.count) && row.count >= 0 && row.count <= 999).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const latest = touch.at(-1);
  if (latest && touch.length > 1 && touch.slice(0, -1).every((row) => latest.count > row.count)) candidates.push({ title: 'Touch-test personal best', detail: `${latest.count} controlled touches in 30 seconds`, date: latest.date });
  return candidates.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0] ?? null;
}
