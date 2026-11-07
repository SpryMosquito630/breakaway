export type Point = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  segment: number;
};
export type Run = {
  id: string;
  date: string;
  seconds: number;
  meters: number;
  points: Point[];
};
export type Match = {
  id: string;
  date: string;
  opponent: string;
  minutes: number;
  goals: number;
  assists: number;
  saves: number;
  result: string;
};
export type Meal = {
  id: string;
  date: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  photo?: string;
  source?: string;
  estimateNotes?: string[];
};
export type Recovery = {
  id: string;
  date: string;
  water: number;
  sleep: number;
};
export type PersonalBest = {
  id: string;
  date: string;
  exercise: string;
  value: number;
  unit: string;
};
export type AthleteData = {
  runs: Run[];
  matches: Match[];
  meals: Meal[];
  recovery: Recovery[];
  bests: PersonalBest[];
  routines: {
    id: string;
    date: string;
    name: string;
  }[];
  weightGoal?: {
    note: string;
  };
};
export const emptyAthlete = (): AthleteData => ({
  runs: [],
  matches: [],
  meals: [],
  recovery: [],
  bests: [],
  routines: [],
});
export const id = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
export function today(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00`);
  return !isNaN(+d) && today(d) === v;
}
export function number(value: string, max: number, optional = false) {
  if (!value.trim()) return optional ? undefined : NaN;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : NaN;
}
export function distance(a: Point, b: Point) {
  const r = Math.PI / 180;
  const dlat = (b.latitude - a.latitude) * r;
  const dlng = (b.longitude - a.longitude) * r;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a.latitude * r) *
      Math.cos(b.latitude * r) *
      Math.sin(dlng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function validPoint(p: unknown): p is Point {
  const q = p as Point;
  return (
    !!q &&
    [q.latitude, q.longitude, q.timestamp, q.accuracy, q.segment].every(
      Number.isFinite,
    ) &&
    Math.abs(q.latitude) <= 90 &&
    Math.abs(q.longitude) <= 180 &&
    q.timestamp > 0 &&
    q.accuracy >= 0 &&
    q.accuracy <= 35 &&
    Number.isInteger(q.segment) &&
    q.segment >= 0
  );
}
export function appendPoint(points: Point[], next: Point): Point[] {
  if (!validPoint(next) || points.length >= 5000) return points;
  const last = points.at(-1);
  if (
    last &&
    (next.timestamp <= last.timestamp ||
      (last.segment === next.segment &&
        (distance(last, next) >
          ((next.timestamp - last.timestamp) / 1000) * 12 ||
          distance(last, next) < 2)))
  )
    return points;
  return [...points, next];
}
export function routeDistance(points: Point[]) {
  return points.reduce(
    (sum, p, i) =>
      sum +
      (i > 0 && p.segment === points[i - 1].segment
        ? distance(points[i - 1], p)
        : 0),
    0,
  );
}
export function elapsed(started: number, now: number) {
  return Math.max(0, Math.floor((now - started) / 1000));
}
export function clock(seconds: number) {
  const n = Math.max(0, Math.floor(seconds));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
export function pace(meters: number, seconds: number) {
  return meters >= 50 && seconds > 0
    ? `${clock(seconds / (meters / 1000))} /km`
    : "—";
}
export function seasonStats(matches: Match[], year: string) {
  return matches
    .filter((m) => m.date.startsWith(year))
    .reduce(
      (a, m) => ({
        games: a.games + 1,
        minutes: a.minutes + m.minutes,
        goals: a.goals + m.goals,
        assists: a.assists + m.assists,
        saves: a.saves + m.saves,
      }),
      { games: 0, minutes: 0, goals: 0, assists: 0, saves: 0 },
    );
}
const text = (v: unknown, n = 120): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= n;
const bounded = (v: unknown, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
export function restoreAthlete(raw: unknown): AthleteData {
  const out = emptyAthlete();
  if (!raw || typeof raw !== "object") return out;
  const d = raw as Record<string, unknown>;
  const rows = (key: string, check: (x: any) => boolean) => {
    const seen = new Set<string>();
    return (Array.isArray(d[key]) ? d[key] : [])
      .filter(
        (x) =>
          x &&
          text(x.id) &&
          validDate(x.date) &&
          check(x) &&
          !seen.has(x.id) &&
          !!seen.add(x.id),
      )
      .slice(-1000);
  };
  out.runs = rows(
    "runs",
    (r) =>
      bounded(r.seconds, 172800) &&
      bounded(r.meters, 1000000) &&
      Array.isArray(r.points) &&
      r.points.length <= 5000 &&
      r.points.every(validPoint),
  ).map((r) => ({ ...r, meters: routeDistance(r.points) }));
  out.matches = rows(
    "matches",
    (m) =>
      text(m.opponent) &&
      bounded(m.minutes, 240) &&
      [m.goals, m.assists, m.saves].every(
        (v) => bounded(v, 100) && Number.isInteger(v),
      ) &&
      ["Win", "Draw", "Loss"].includes(m.result),
  );
  out.meals = rows(
    "meals",
    (m) =>
      text(m.name) &&
      ["calories", "protein", "carbs", "fat"].every(
        (k) => m[k] === undefined || bounded(m[k], 10000),
      ) &&
      (m.photo === undefined || /^[a-zA-Z0-9-]+$/.test(m.photo)) &&
      (m.estimateNotes === undefined ||
        (Array.isArray(m.estimateNotes) &&
          m.estimateNotes.length <= 8 &&
          m.estimateNotes.every(
            (n: unknown) => typeof n === "string" && n.length <= 500,
          ))) &&
      (m.source === undefined ||
        ["Open Food Facts", "AI photo estimate"].includes(m.source)),
  );
  out.recovery = rows(
    "recovery",
    (r) => bounded(r.water, 10000) && bounded(r.sleep, 24),
  );
  out.bests = rows(
    "bests",
    (b) => text(b.exercise) && text(b.unit, 20) && bounded(b.value, 100000),
  );
  out.routines = rows("routines", (r) => text(r.name));
  if (
    d.weightGoal &&
    typeof d.weightGoal === "object" &&
    text((d.weightGoal as any).note, 300)
  )
    out.weightGoal = { note: (d.weightGoal as any).note };
  return out;
}
export const routines = [
  {
    name: "Bodyweight foundations",
    steps: [
      {
        name: "March and arm circles",
        cue: "Move gently in a clear space. Keep breathing.",
        seconds: 60,
      },
      {
        name: "Controlled squats",
        cue: "Feet comfortable, sit back and stand smoothly. Choose your own pace.",
        seconds: 30,
      },
      { name: "Rest", cue: "Walk slowly and take a breath.", seconds: 30 },
      {
        name: "Wall push-ups",
        cue: "Hands on a stable wall, bend elbows and press away.",
        seconds: 30,
      },
      { name: "Rest", cue: "Shake out your arms.", seconds: 30 },
      {
        name: "Calf raises",
        cue: "Hold a stable support. Rise and lower with control.",
        seconds: 30,
      },
    ],
  },
  {
    name: "Mobility reset",
    steps: [
      {
        name: "Easy walk",
        cue: "Move gently and check how you feel.",
        seconds: 60,
      },
      {
        name: "Ankle circles",
        cue: "Hold a support. Make gentle circles, switching feet halfway.",
        seconds: 40,
      },
      { name: "Rest", cue: "Release the position.", seconds: 20 },
      {
        name: "Standing hip circles",
        cue: "Small comfortable circles. Change direction halfway.",
        seconds: 40,
      },
      { name: "Rest", cue: "Relax your shoulders.", seconds: 20 },
      {
        name: "Shoulder rolls",
        cue: "Slow circles without forcing the range.",
        seconds: 40,
      },
    ],
  },
];
