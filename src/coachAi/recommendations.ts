import {
  allowed,
  matchPlan,
  recommendedForPosition,
  type AppData,
  type Drill,
  type Goal,
} from "../domain/model";
import { localGuide } from "./guide";

export type CoachReply = {
  reply: string;
  drillIds: string[];
  source: "offline" | "openai";
};
export function remoteCoachAllowed(age: AppData["profile"]["ageBand"], enabled: boolean) {
  return enabled && (age === "adult" || age === "13to17");
}
export function coachDrills(message: string, data: AppData, catalog: Drill[]) {
  const query = message.toLowerCase();
  const goal: Goal = /weak|other foot/.test(query)
    ? "Weaker foot"
    : /pass|first touch/.test(query)
      ? "Passing"
      : /dribbl|turn/.test(query)
        ? "Dribbling"
        : /control|touch/.test(query)
          ? "Ball control"
          : data.profile.goal;
  const profile = { ...data.profile, goal };
  return matchPlan(catalog, profile)
    .map((id) => catalog.find((d) => d.id === id)!)
    .filter(Boolean);
}
export function offlineCoach(
  message: string,
  data: AppData,
  catalog: Drill[],
): CoachReply {
  if (
    /\b(injur\w*|pain|hurt|diet|calori\w*|weight|nutrition|supplement\w*)\b/i.test(
      message,
    )
  )
    return {
      source: "offline",
      reply:
        "This offline guide only matches football drills. For health, injury or food questions, ask a qualified professional or a trusted adult.",
      drillIds: [],
    };
  if (
    /\b(test\w*|score\w*|assess\w*|progress|history|session\w*|complete\w*|week)\b/i.test(
      message,
    ) &&
    !/practice|drill|today/i.test(message)
  )
    return { source: "offline", reply: localGuide(message, data, catalog), drillIds: [] };
  const matches = coachDrills(message, data, catalog);
  if (!matches.length)
    return {
      source: "offline",
      reply:
        "No catalog drills match your setup. Update your equipment or space in Training preferences, or browse Drills.",
      drillIds: [],
    };
  const focused = matches.filter((d) => d.skill === data.profile.goal);
  return {
    source: "offline",
    reply: `${focused.length ? "Here are drills for your focus" : "Here are drills from the catalog"}, matched to your saved equipment and space. Start with ${matches[0].name}: ${matches[0].cue} Open a drill for its steps and practice timer.`,
    drillIds: matches.map((d) => d.id),
  };
}
/** Only explicitly disclosed training preferences and eligible catalog facts; no private profile or clips. */
export function coachContext(data: AppData, catalog: Drill[]) {
  const eligible = catalog
    .filter((d) => allowed(d, data.profile) && recommendedForPosition(d, data.profile))
    .slice(0, 100);
  return {
    position: data.profile.position ?? "Still exploring",
    goal: data.profile.goal,
    plan: eligible.map((d) => ({ id: d.id, name: d.name, cue: d.cue })),
    allowedDrillIds: eligible.map((d) => d.id),
  };
}
export function validateCoachReply(value: unknown, allowedIds: string[]): CoachReply {
  const v = value as Partial<CoachReply> | null;
  if (
    !v ||
    v.source !== "openai" ||
    typeof v.reply !== "string" ||
    !v.reply.trim() ||
    v.reply.length > 3000 ||
    !Array.isArray(v.drillIds) ||
    v.drillIds.length > 4 ||
    v.drillIds.some((id) => typeof id !== "string" || !allowedIds.includes(id))
  )
    throw Error("AI returned an invalid reply. Try again or use the offline guide.");
  return { reply: v.reply.trim(), drillIds: [...new Set(v.drillIds)], source: "openai" };
}
