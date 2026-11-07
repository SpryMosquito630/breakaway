import test from "node:test";
import assert from "node:assert/strict";
import { drills } from "../src/data/drills";
import { allowed, initialData, type History } from "../src/domain/model";
import { adaptDrill, planForDate, weeklyProgress } from "../src/domain/planning";
const p = initialData().profile;
const monday = new Date(2026, 10, 2, 12);
const done = (id: string, date: Date, difficulty = 1, overrides: Partial<History> = {}): History => ({ id, date: date.toISOString(), completed: true, seconds: 180, done: 1, skipped: 0, total: 1, effort: "Easy", drills: [{id: "sole", version: drills[0].version ?? 1, difficulty: difficulty as 1|2|3, status: "done", seconds: 180}], ...overrides });
test("catalog keeps original IDs and offers 28 distinct complete drills with three targeted variants", () => {
  assert.equal(drills.length, 28);
  assert.equal(new Set(drills.map((d) => d.id)).size, 28);
  for (const id of ["sole", "inside", "gates", "turn", "wall", "partner", "weak", "push"]) assert.ok(drills.some((d) => d.id === id));
  assert.ok(drills.filter((d) => allowed(d,p) && d.level === "Some experience").length >= 8);
  for (const d of drills) { assert.equal(d.variants?.length, 3); assert.ok(d.variants?.every((v) => /\d+/.test(v.target) && v.steps.length >= 3)); }
});
test("Mon/Wed/Fri rotate deterministically without duplicate or incompatible drills for every goal and setup", () => {
  for (const goal of ["Ball control", "Dribbling", "Passing", "Weaker foot"] as const) {
    for (const experience of ["New to training", "Some experience"]) {
      const profile = {...p,goal,experience};
      const plans = [2,4,6].map((day) => planForDate(drills, profile, [], new Date(2026,10,day,12), false));
      assert.equal(new Set(plans.map((x) => x.join(","))).size, 3);
      for (const ids of plans) { assert.equal(ids.length, 3); assert.equal(new Set(ids).size,3); assert.ok(ids.every((id) => allowed(drills.find((d) => d.id === id)!,profile))); }
      assert.deepEqual(plans[0],planForDate(drills,profile,[],monday,false));
    }
  }
});
test("custom and unclassified legacy plans stay in their saved order", () => {
  const custom = ["weak", "inside", "sole"];
  for (const flag of [true,undefined]) assert.deepEqual(planForDate(drills,p,custom,new Date(2026,10,4),flag),custom);
});
test("only two Easy completed positive-time results at the actual version and stage advance", () => {
  const d=drills[0];
  const one=done("one",monday);
  const two=done("two",new Date(2026,10,4,12));
  assert.equal(adaptDrill(d,[one]).difficulty,1);
  assert.equal(adaptDrill(d,[one,two]).difficulty,2);
  assert.equal(adaptDrill(d,[one,two,done("three",new Date(2026,10,6),1)]).difficulty,2);
  for (const bad of [ {completed:false}, {seconds:0}, {drills:undefined}, {drills:[{id:"sole",version:d.version ?? 1,difficulty:1 as const,status:"done" as const,seconds:0}]}, {drills:[{id:"sole",version:(d.version ?? 1) + 1,difficulty:1 as const,status:"done" as const,seconds:180}]}, {drills:[{id:"sole",version:d.version ?? 1,difficulty:1 as const,status:"skipped" as const,seconds:180}]} ]) assert.equal(adaptDrill(d,[one,{...two,...bad}]).difficulty,1);
  const hard=done("hard",new Date(2026,10,3),1,{effort:"Challenging"});
  assert.equal(adaptDrill(d,[one,hard,two]).difficulty,1);
  assert.equal(adaptDrill(d,[one,two,done("a",new Date(2026,10,6),2),done("b",new Date(2026,10,7),2)]).difficulty,3);
});
test("week counts unique completed local days including extra days; partial sessions and prior weeks do not count", () => {
  const now=new Date(2026,10,4,18);
  const history=[done("a",monday),done("repeat",monday),done("extra",new Date(2026,10,3)),done("partial",now,1,{completed:false}),done("prior",new Date(2026,9,31))];
  assert.deepEqual(weeklyProgress(history,p,now),{completedDays:["Mon","Tue"],count:2,target:3,doneToday:false});
  assert.equal(weeklyProgress([...history,done("today",now)],p,now).doneToday,true);
});

test("rotation follows local calendar days across DST and year boundaries", () => {
  const plan = (date: Date) => planForDate(drills, p, [], date, false);
  // Sunday crosses the autumn clock change; its next session is still Monday.
  assert.deepEqual(plan(new Date(2026, 10, 1, 0, 30)), plan(new Date(2026, 10, 2, 12)));
  assert.deepEqual(plan(new Date(2026, 10, 1, 23, 30)), plan(new Date(2026, 10, 2, 12)));
  // Thursday's next training date and Friday itself share one calendar week.
  assert.deepEqual(plan(new Date(2026, 11, 31, 23, 30)), plan(new Date(2027, 0, 1, 12)));
  assert.deepEqual(plan(new Date(2027, 0, 1, 0, 30)), plan(new Date(2027, 0, 1, 23, 30)));
  const history = [done("dec", new Date(2026, 11, 28, 12)), done("jan", new Date(2027, 0, 1, 12))];
  assert.deepEqual(weeklyProgress(history, p, new Date(2027, 0, 1, 18)).completedDays, ["Mon", "Fri"]);
});

test("legacy original default plans rotate while manual order and saved stage data survive restoration", async () => {
  const { restoreAppData } = await import("../src/domain/storage");
  const { matchPlan } = await import("../src/domain/model");
  const originals = drills.filter((d) => ["sole", "inside", "gates", "turn", "wall", "partner", "weak", "push"].includes(d.id));
  for (const goal of ["Ball control", "Dribbling", "Passing", "Weaker foot"] as const) {
    const profile = { ...p, goal };
    const { planCustomized: _, ...legacy } = { ...initialData(), onboarded: true, profile, plan: matchPlan(originals, profile), history: [done("saved", monday)] };
    const restored = restoreAppData(JSON.stringify(legacy), drills);
    assert.equal(restored.planCustomized, false);
    assert.deepEqual(restored.history, legacy.history);
    const custom = [...legacy.plan].reverse();
    const manual = restoreAppData(JSON.stringify({ ...legacy, plan: custom }), drills);
    assert.equal(manual.planCustomized, true);
    assert.deepEqual(planForDate(drills, profile, manual.plan, monday, manual.planCustomized), custom);
    assert.equal(restoreAppData(JSON.stringify({ ...legacy, planCustomized: true }), drills).planCustomized, true);
  }
});
