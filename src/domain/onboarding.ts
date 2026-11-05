import { days, goals, Profile } from "./model";
export type OnboardingDraft = Partial<Profile>;
const validGoal = (d: OnboardingDraft) =>
  d.goal !== undefined && goals.includes(d.goal);
const validExperience = (d: OnboardingDraft) =>
  d.experience === "New to training" || d.experience === "Some experience";
const validSchedule = (d: OnboardingDraft) =>
  Array.isArray(d.days) &&
  d.days.length > 0 &&
  d.days.every((day) => days.includes(day)) &&
  [15, 20, 30].includes(d.minutes ?? 0);
const validSetup = (d: OnboardingDraft) =>
  (d.space === "Small space" || d.space === "Open space") &&
  Array.isArray(d.gear) &&
  d.gear.every((g) => ["markers", "wall", "partner"].includes(g));
export function isOnboardingStepReady(
  d: OnboardingDraft,
  step: number,
): boolean {
  switch (step) {
    case 0:
      return true;
    case 1:
      return validGoal(d);
    case 2:
      return validExperience(d);
    case 3:
      return validSchedule(d);
    case 4:
      return validSetup(d);
    case 5:
      return profileFromDraft(d) !== null;
    default:
      return false;
  }
}
export function profileFromDraft(d: OnboardingDraft): Profile | null {
  if (
    !validGoal(d) ||
    !validExperience(d) ||
    !validSchedule(d) ||
    !validSetup(d) ||
    d.goal === undefined ||
    d.experience === undefined ||
    d.days === undefined ||
    d.minutes === undefined ||
    d.space === undefined ||
    d.gear === undefined
  )
    return null;
  return {
    goal: d.goal,
    experience: d.experience,
    days: [...d.days],
    minutes: d.minutes,
    space: d.space,
    gear: [...d.gear],
  };
}
