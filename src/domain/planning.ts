import {
  allowed,
  days,
  matchPlan,
  positionPriority,
  recommendedForPosition,
  type Drill,
  type History,
  type Profile,
} from "./model";

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}
export function nextTrainingDate(profile: Profile, now = new Date()) {
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      12,
    );
    if (profile.days.includes(days[dayIndex(date)])) return date;
  }
  return now;
}

/** A stored manual plan remains authoritative. Rotation is only for generated plans. */
export function planForDate(
  catalog: Drill[],
  profile: Profile,
  basePlan: string[],
  now = new Date(),
  customized?: boolean,
) {
  if (customized !== false && basePlan.length) return [...new Set(basePlan)];
  const date = nextTrainingDate(profile, now);
  const eligible = catalog.filter((d) => allowed(d, profile) && recommendedForPosition(d, profile));
  const ranked = matchPlan(eligible, profile);
  const ordered = [...eligible].sort(
    (a, b) =>
      Number(b.level === profile.experience) -
      Number(a.level === profile.experience),
  );
  const focus = ordered.filter((d) => d.skill === profile.goal);
  const scheduled = days.filter((d) => profile.days.includes(d));
  const slot = Math.max(0, scheduled.indexOf(days[dayIndex(date)]));
  // UTC calendar arithmetic keeps local weeks stable across daylight-saving changes.
  const monday = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - dayIndex(date),
  );
  const week = Math.floor(monday / (7 * 86400000));
  const rotate = (list: Drill[], offset: number) =>
    list.map(
      (_, i) => list[(i + (offset % list.length) + list.length) % list.length],
    );
  const primary = rotate(focus, week + slot)
    .slice(0, 2)
    .map((d) => d.id);
  const supportCandidates = ordered.filter((d) => d.skill !== profile.goal);
  const preferred = supportCandidates.filter((d) => positionPriority(d, profile) > 0);
  const support = rotate(
    preferred.length ? preferred : supportCandidates,
    week + slot * 2,
  ).map((d) => d.id);
  return [...new Set([...primary, ...support, ...ranked])].slice(0, 3);
}

/** Two Easy completions of the same revision and stage unlock one next stage. */
export function adaptDrill(drill: Drill, history: History[]): Drill {
  let difficulty: 1 | 2 | 3 = 1;
  let easy = 0;
  const ordered = [...history].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  );
  for (const session of ordered) {
    if (!session.completed || session.seconds <= 0) continue;
    const result = session.drills?.find(
      (r) =>
        r.id === drill.id &&
        r.version === (drill.version ?? 1) &&
        r.difficulty === difficulty &&
        r.status === "done" &&
        r.seconds > 0,
    );
    if (!result) continue;
    easy = session.effort === "Easy" ? easy + 1 : 0;
    if (easy >= 2 && difficulty < 3) {
      difficulty = (difficulty + 1) as 2 | 3;
      easy = 0;
    }
  }
  const variant = drill.variants?.find((v) => v.difficulty === difficulty);
  return variant ? { ...drill, ...variant, difficulty } : drill;
}

export function weeklyProgress(
  history: History[],
  profile: Profile,
  now = new Date(),
) {
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - dayIndex(now),
  );
  const end = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 7,
  );
  const completedDates = new Set(
    history
      .filter(
        (h) =>
          h.completed &&
          h.seconds > 0 &&
          new Date(h.date) >= monday &&
          new Date(h.date) < end &&
          new Date(h.date) <= now,
      )
      .map((h) => localDateKey(new Date(h.date))),
  );
  const completedDays = days.filter((_, i) =>
    completedDates.has(
      localDateKey(
        new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
      ),
    ),
  );
  return {
    completedDays,
    count: Math.min(completedDays.length, profile.days.length),
    target: profile.days.length,
    doneToday: completedDates.has(localDateKey(now)),
  };
}
