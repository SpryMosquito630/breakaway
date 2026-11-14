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
  source: "offline" | "openai" | "gemini";
};
export function remoteCoachAllowed(age: AppData["profile"]["ageBand"], enabled: boolean) {
  return enabled && (age === "adult" || age === "13to17");
}
function requestedGoal(message: string): Goal | undefined {
  const query = message.toLowerCase();
  return /\b(weak\w*|other foot|non[- ]dominant)\b/.test(query)
    ? "Weaker foot"
    : /\b(pass\w*|first touch)\b/.test(query)
      ? "Passing"
      : /\b(dribbl\w*|turn\w*)\b/.test(query)
        ? "Dribbling"
        : /\b(control\w*|touch\w*)\b/.test(query)
          ? "Ball control"
          : undefined;
}
export function coachDrills(message: string, data: AppData, catalog: Drill[]) {
  const focus = requestedGoal(message);
  const goal = focus ?? data.profile.goal;
  const profile = { ...data.profile, goal };
  return matchPlan(focus ? catalog.filter((d) => d.skill === focus) : catalog, profile)
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
  if (/\bplan\b/i.test(message) && !requestedGoal(message))
    return { source: "offline", reply: localGuide(message, data, catalog), drillIds: [] };
  const focus = requestedGoal(message);
  if (
    !focus &&
    (!/\b(practi\w*|train\w*|drill\w*|start|focus)\b/i.test(message) ||
      /\b(shoot\w*|finish\w*|defend\w*|tackl\w*|heading|goalkeep\w*|fitness|sprint\w*)\b/i.test(
        message,
      ))
  )
    return {
      source: "offline",
      reply:
        "This offline guide matches catalog drills, rather than answering general questions. Try Passing, Weaker foot, Dribbling or Ball control. You can also ask about your saved plan, sessions or tests.",
      drillIds: [],
    };
  const matches = coachDrills(message, data, catalog);
  if (!matches.length)
    return {
      source: "offline",
      reply: `No${focus ? ` ${focus.toLowerCase()}` : ""} catalog drills match your setup. Update your equipment or space in Training preferences, or browse Drills.`,
      drillIds: [],
    };
  return {
    source: "offline",
    reply: `${focus ? `Here are ${focus.toLowerCase()} drills` : "Here are drills for today’s practice"}, matched to your saved equipment and space. Start with ${matches[0].name}: ${matches[0].cue} Open a drill for its steps and practice timer.`,
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
export function validateCoachReply(
  value: unknown,
  allowedIds: string[],
  expectedSource: "openai" | "gemini" = "openai",
): CoachReply {
  const v = value as Partial<CoachReply> | null;
  if (
    !v ||
    v.source !== expectedSource ||
    typeof v.reply !== "string" ||
    !v.reply.trim() ||
    v.reply.length > 3000 ||
    !Array.isArray(v.drillIds) ||
    v.drillIds.length > 4 ||
    v.drillIds.some((id) => typeof id !== "string" || !allowedIds.includes(id))
  )
    throw Error("AI returned an invalid reply. Try again or use the offline guide.");
  return {
    reply: v.reply.trim(),
    drillIds: [...new Set(v.drillIds)],
    source: expectedSource,
  };
}
