import { type AppData, type Drill, completeOnboarding, matchPlan } from "./model";
import { type OnboardingDraft, profileFromDraft } from "./onboarding";

/** Optional on-device reflections, never a source of measured skill ratings. */
export type OnboardingAnswers = {
  frequency?: string;
  club?: string;
  clubName?: string;
  level?: string;
  commitment?: string;
  ambition?: string;
  tracking?: string;
  blocker?: string;
  motivation?: string;
  playstyle?: string;
  positionDetail?: string;
  bodyGoal?: string;
  consistency?: string;
  name?: string;
  heightCm?: number;
  weightKg?: number;
  aspirations?: string[];
  diet?: string;
  foodSource?: string;
  years?: string;
  allergies?: string[];
  snapshotStyle?: string;
  week?: Partial<Record<string, { activity: string; time?: string }>>;
};
export type FlowDraft = OnboardingDraft & { answers?: OnboardingAnswers };
export const playerStyles = [
  {
    name: "Kevin De Bruyne",
    position: "CM · AM",
    role: "ELITE CREATOR",
    description: "Passing, assists, crossing, tempo control.",
    tags: ["Passing", "Crossing", "Tempo"],
  },
  {
    name: "Pedri",
    position: "CM",
    role: "PRESS-RESISTANT MAESTRO",
    description: "First touch, awareness, tight-space passing.",
    tags: ["First touch", "Vision", "Passing"],
  },
  {
    name: "Sergio Busquets",
    position: "DM",
    role: "DEEP CONTROLLER",
    description: "Positioning, tempo, interceptions.",
    tags: ["Positioning", "Tempo", "Passing"],
  },
  {
    name: "Declan Rice",
    position: "DM · CM",
    role: "BALL-WINNING ANCHOR",
    description: "Interceptions, stamina, progressive carries.",
    tags: ["Tackling", "Stamina", "Carrying"],
  },
] as const;
export const answerOptions = {
  frequency: [
    "Daily",
    "A few times a week",
    "Once a week or less",
    "I’m just getting started",
  ],
  club: [
    "Yes, a professional / pro academy",
    "Yes, a grassroots or amateur club",
    "Yes, a school or college team",
    "No, I play casually / with friends",
  ],
  level: ["Academy", "College", "Semi-pro", "Professional", "Amateur"],
  commitment: ["Steady", "Serious", "All in"],
  ambition: [
    "Make the starting lineup",
    "Improve my technique",
    "Get stronger & faster",
    "Impress scouts / coaches",
  ],
  tracking: ["Yes, consistently", "Occasionally", "I’ve tried, but stopped", "Never"],
  blocker: [
    "It takes too long",
    "I forget after the session",
    "I lose motivation",
    "I don’t see the point",
  ],
  motivation: [
    "Improve my technical skills",
    "Get faster and fitter",
    "Reach a higher level / get scouted",
    "Stay consistent and enjoy the game",
  ],
  playstyle: playerStyles.map((player) => player.name),
  bodyGoal: ["Build strength", "Practice steadily", "Prioritize recovery"],
  consistency: [
    "I train hard every week",
    "Depends on the week",
    "Struggling to stay consistent",
    "Just getting started",
  ],
  diet: ["I eat everything", "Halal", "Kosher", "Vegetarian", "Vegan", "Pescatarian"],
  foodSource: [
    "I cook at home",
    "Limited — microwave or kettle",
    "Mostly eating out or takeaway",
    "Mostly at the club or ground",
  ],
  years: ["Less than 1 year", "1–2 years", "2–5 years", "5+ years"],
} as const;
export const allergyOptions = [
  "Milk / dairy",
  "Eggs",
  "Peanuts",
  "Tree nuts",
  "Gluten / wheat",
  "Fish",
  "Shellfish",
  "None of these",
];
export const weekActivities = ["Rest", "Team training", "Match", "Other training"];
export const snapshotStyles = ["Forest", "Volt", "Slate", "Plum", "Blue"];
export const aspirations = [
  "Become faster on the pitch",
  "Build strength & win duels",
  "Master ball control & technique",
  "Improve game IQ & decision making",
  "Increase stamina & fitness",
  "Build confidence on the ball",
  "Play at a higher level",
];
export const flowSteps = [
  "welcome",
  "intro",
  "frequency",
  "club",
  "clubName",
  "level",
  "commitment",
  "ambition",
  "tracking",
  "blocker",
  "motivation",
  "focus",
  "equipment",
  "position",
  "positionConfirm",
  "playstyle",
  "experience",
  "measurements",
  "bodyGoal",
  "planComparison",
  "consistency",
  "notifications",
  "comparison",
  "brief",
  "identity",
  "days",
  "schedule",
  "duration",
  "space",
  "aspirations",
  "diet",
  "allergies",
  "foodSource",
  "assessment",
  "strengths",
  "growth",
  "snapshot",
  "fuel",
  "plan",
] as const;
export type FlowStep = (typeof flowSteps)[number];
/** Recorded numbered single-choice questions/pitch advance on an explicit choice. */
export const autoAdvanceSteps: readonly FlowStep[] = [
  "frequency",
  "club",
  "ambition",
  "tracking",
  "blocker",
  "motivation",
  "focus",
  "position",
  "experience",
  "bodyGoal",
  "consistency",
  "foodSource",
];

export function sanitizeOnboardingAnswers(raw: unknown): OnboardingAnswers | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const value = raw as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, options] of Object.entries(answerOptions))
    if (
      typeof value[key] === "string" &&
      (options as readonly string[]).includes(value[key] as string)
    )
      result[key] = value[key];
  for (const key of ["name", "clubName"] as const)
    if (typeof value[key] === "string") {
      const text = value[key]
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .trim()
        .slice(0, key === "name" ? 40 : 80);
      if (text) result[key] = text;
    }
  if (
    typeof value.positionDetail === "string" &&
    [
      "GK",
      "LB",
      "CB",
      "RB",
      "DM",
      "LM",
      "CM",
      "RM",
      "AM",
      "LW",
      "ST",
      "RW",
      "Exploring",
    ].includes(value.positionDetail)
  )
    result.positionDetail = value.positionDetail;
  for (const [key, min, max] of [
    ["heightCm", 80, 240],
    ["weightKg", 15, 200],
  ] as const)
    if (
      typeof value[key] === "number" &&
      Number.isFinite(value[key]) &&
      value[key] >= min &&
      value[key] <= max
    )
      result[key] = Math.round(value[key] * 10) / 10;
  const chosenAspirations = value.aspirations;
  if (Array.isArray(chosenAspirations))
    result.aspirations = aspirations.filter((a) => chosenAspirations.includes(a));
  if (Array.isArray(value.allergies))
    result.allergies = allergyOptions.filter((a) =>
      (value.allergies as unknown[]).includes(a),
    );
  if (
    typeof value.snapshotStyle === "string" &&
    snapshotStyles.includes(value.snapshotStyle)
  )
    result.snapshotStyle = value.snapshotStyle;
  if (value.week && typeof value.week === "object" && !Array.isArray(value.week)) {
    const week: NonNullable<OnboardingAnswers["week"]> = {};
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      const entry = (value.week as Record<string, unknown>)[day];
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const row = entry as Record<string, unknown>;
      if (typeof row.activity !== "string" || !weekActivities.includes(row.activity))
        continue;
      week[day] = { activity: row.activity };
      if (typeof row.time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.time))
        week[day]!.time = row.time;
    }
    if (Object.keys(week).length) result.week = week;
  }
  return Object.keys(result).length ? (result as OnboardingAnswers) : undefined;
}
export function isFlowStepReady(d: FlowDraft, step: FlowStep): boolean {
  switch (step) {
    case "identity":
      return ["under13", "13to17", "adult"].includes(d.ageBand ?? "");
    case "position":
      return !!d.position;
    case "focus":
      return !!d.goal;
    case "experience":
      return ["New to training", "Some experience"].includes(d.experience ?? "");
    case "days":
      return !!d.days?.length;
    case "duration":
      return [15, 20, 30].includes(d.minutes ?? 0);
    case "space":
      return ["Small space", "Open space"].includes(d.space ?? "");
    case "equipment":
      return Array.isArray(d.gear);
    case "plan":
      return profileFromDraft(d) !== null;
    default:
      return true;
  }
}
export function finishOnboardingDraft(
  data: AppData,
  draft: FlowDraft,
  catalog: Drill[],
  replay = false,
): AppData | null {
  const profile = profileFromDraft(draft);
  if (!profile) return null;
  return {
    ...completeOnboarding(data, profile, matchPlan(catalog, profile), replay),
    onboardingAnswers: sanitizeOnboardingAnswers(draft.answers),
  };
}
