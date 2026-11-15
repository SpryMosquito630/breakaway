import test from "node:test";
import assert from "node:assert/strict";
import { localGuide, trainingContext } from "../src/coachAi/guide";
import { initialData } from "../src/domain/model";
import { drills } from "../src/data/drills";
test("local guide uses actual plan and reports missing tests without measurements", () => {
  const data = { ...initialData(), plan: ["sole"], assessments: [], history: [] };
  assert.match(localGuide("plan", data, drills), /Sole rolls/);
  assert.match(localGuide("tests", data, drills), /no saved skill assessments/);
  assert.match(localGuide("sessions", data, drills), /0 completed saved sessions/);
  assert.equal(trainingContext(data, drills).plan[0].id, "sole");
});
test("training context sends bounded self-reported history rather than full app state", () => {
  const context = trainingContext(initialData(), drills);
  assert.equal("active" in context, false);
  assert.ok(context.sessionHistory.length <= 8);
  assert.ok(context.allowedDrillIds.length <= 100);
});
