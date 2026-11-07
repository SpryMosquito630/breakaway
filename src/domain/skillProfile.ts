import { skillAssessmentHistory, type SkillAssessment } from "./assessments";
export const profileSkills = [
  { id: "pace", name: "Pace", short: "PAC", sample: 78, detail: "Sprint speed and acceleration need a validated assessment." },
  { id: "shooting", name: "Shooting", short: "SHO", sample: 71, detail: "Shot accuracy and technique need a validated assessment." },
  { id: "passing", name: "Passing", short: "PAS", sample: 75, detail: "Passing accuracy and weight need a validated assessment." },
  { id: "dribbling", name: "Dribbling", short: "DRI", sample: 82, detail: "Moving control and changes of direction need a validated assessment." },
  { id: "defending", name: "Defending", short: "DEF", sample: 63, detail: "Positioning and defensive actions need a validated assessment." },
  { id: "physical", name: "Physical", short: "PHY", sample: 69, detail: "Strength and endurance need a validated assessment." },
] as const;
export type ProfileSkill = typeof profileSkills[number];

/** Only matching, versioned assessment protocols contribute to actual test ratings. */
export function skillProfile(sample = false, assessments: readonly SkillAssessment[] = []) {
  const skills = profileSkills.map((skill) => {
    const history = skillAssessmentHistory(assessments, skill.id);
    const latest = history.at(-1);
    const previous = history.at(-2);
    return { ...skill, rating: sample ? skill.sample : latest?.score ?? null, history, latest, delta: latest && previous ? latest.score - previous.score : null };
  });
  const coverage = skills.filter((skill) => skill.rating !== null).length;
  return { skills, overall: coverage === 6 ? Math.round(skills.reduce((n, skill) => n + skill.rating!, 0) / skills.length) : null, sample, coverage };
}

export function radarPoint(index: number, value: number, radius = 85) {
  const angle = -Math.PI / 2 + index * Math.PI / 3;
  return { x: 150 + Math.cos(angle) * radius * value / 100, y: 150 + Math.sin(angle) * radius * value / 100 };
}
