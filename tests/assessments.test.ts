import test from "node:test";
import assert from "node:assert/strict";
import {
  assessmentScore,
  sanitizeAssessments,
  skillAssessmentHistory,
  startAssessment,
  tickAssessment,
  finishAssessment,
  type AssessmentSkill,
  type SkillAssessment,
} from "../src/domain/assessments";
import { skillProfile } from "../src/domain/skillProfile";
import { initialData } from "../src/domain/model";
import { restoreAppData } from "../src/domain/storage";
import { drills } from "../src/data/drills";
const attempt = (skill: AssessmentSkill, value: number, day = 1): SkillAssessment => ({
  id: `${skill}-${day}`,
  skill,
  value,
  protocolVersion: 1,
  date: new Date(Date.UTC(2026, 0, day)).toISOString(),
});

test("fixed scoring targets reward accurate counts and lower times, capped while retaining raw values", () => {
  assert.equal(assessmentScore("pace", 2.5), 100);
  assert.equal(assessmentScore("pace", 5), 50);
  assert.equal(assessmentScore("dribbling", 24), 50);
  assert.equal(assessmentScore("shooting", 7), 70);
  assert.equal(assessmentScore("passing", 15), 75);
  assert.equal(assessmentScore("defending", 8), 50);
  assert.equal(assessmentScore("physical", 45), 50);
  assert.equal(assessmentScore("physical", 120), 100);
  assert.equal(assessmentScore("passing", 0), 0);
  const history = skillAssessmentHistory([attempt("physical", 120)], "physical");
  assert.equal(history[0].value, 120);
});
test("invalid inputs and incompatible protocol versions cannot produce scores or survive storage", () => {
  for (const value of [-1, 0, 0.1, 121, NaN, Infinity])
    assert.equal(assessmentScore("pace", value), null);
  for (const value of [-1, 10.5, 11, NaN, Infinity])
    assert.equal(assessmentScore("shooting", value), null);
  assert.deepEqual(
    sanitizeAssessments([
      null,
      {},
      { ...attempt("pace", 3), protocolVersion: 2 },
      { ...attempt("pace", 3), skill: "anything" },
      { ...attempt("pace", 3), date: "bad" },
      attempt("pace", 0),
    ]),
    [],
  );
});
test("actual OVR requires all six skills and uses latest chronological results, including drops", () => {
  const full = [
    attempt("pace", 5),
    attempt("shooting", 5),
    attempt("passing", 10),
    attempt("dribbling", 24),
    attempt("defending", 8),
    attempt("physical", 45),
  ];
  assert.equal(skillProfile(false, full.slice(0, 5)).overall, null);
  assert.equal(skillProfile(false, full.slice(0, 5)).coverage, 5);
  assert.equal(skillProfile(false, full).overall, 50);
  const newer = attempt("shooting", 0, 2);
  const changed = skillProfile(false, [newer, ...full]);
  assert.equal(changed.overall, 42);
  assert.equal(changed.skills[1].rating, 0);
  assert.equal(changed.skills[1].delta, -50);
  assert.equal(skillProfile(true, full).overall, 73);
});
test("storage accepts legacy data and rebuilds versioned assessment scores without trusting saved scores", () => {
  const old = restoreAppData(JSON.stringify(initialData()), drills);
  assert.deepEqual(old.assessments, []);
  const saved = {
    ...initialData(),
    assessments: [{ ...attempt("passing", 12), score: 99 }, null],
  };
  const restored = restoreAppData(JSON.stringify(saved), drills);
  assert.equal(restored.assessments?.length, 1);
  assert.equal(skillProfile(false, restored.assessments).skills[2].rating, 60);
  assert.equal(Object.hasOwn(restored.assessments![0], "score"), false);
});
test("countdown uses fixed deadlines, automatic duration ends once, and cancellation cannot save an elapsed run", () => {
  const start = startAssessment(1000);
  assert.equal(finishAssessment(start, 2000), start);
  assert.equal(tickAssessment(start, 30, 3999).run.phase, "countdown");
  const running = tickAssessment(start, 30, 4000);
  assert.equal(running.run.remaining, 30);
  assert.deepEqual(running.signals, ["start"]);
  const finished = tickAssessment(running.run, 30, 34000);
  assert.equal(finished.run.phase, "entry");
  assert.equal(finished.run.elapsed, 30);
  assert.deepEqual(finished.signals, ["finish"]);
  assert.deepEqual(tickAssessment(finished.run, 30, 35000).signals, []);
  const cancelled = { ...running.run, phase: "cancelled" as const };
  assert.equal(finishAssessment(cancelled, 99999), cancelled);
  assert.equal(tickAssessment(cancelled, 30, 99999).run.phase, "cancelled");
});
test("helper finish captures stopwatch duration from Go without including countdown", () => {
  const running = tickAssessment(startAssessment(1000), null, 4000).run;
  const finished = finishAssessment(running, 7750);
  assert.equal(finished.phase, "entry");
  assert.equal(finished.elapsed, 3.75);
  assert.equal(finishAssessment(finished, 10000), finished);
});
