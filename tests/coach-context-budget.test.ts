import test from "node:test";
import assert from "node:assert/strict";
import fixture from "./fixtures/coach-context-unicode.json";
import {
  COACH_CONTEXT_CHARACTERS,
  pythonContextCharacters,
} from "../src/coachAi/contextBudget";
import { coachContextWithCoverage } from "../src/coachAi/recommendations";
import { buildCoachRequest, utf8Bytes } from "../src/coachAi/memory";
import { initialData, allowed, recommendedForPosition } from "../src/domain/model";
import { sanitizeCustomDrills } from "../src/domain/training";
import { drills } from "../src/data/drills";

test("context accounting matches Python default JSON for CJK, emoji and escaped ASCII", () => {
  for (const example of fixture.cases)
    assert.equal(
      pythonContextCharacters(example.context),
      example.pythonJsonCharacters,
      example.name,
    );
});

for (const script of ["cjk", "emoji"] as const) {
  test(`valid ${script} custom drills retain whole facts and matching IDs within the actual server budget`, () => {
    const data = initialData();
    const custom = sanitizeCustomDrills(
      Array.from({ length: 40 }, (_, index) => ({
        id: `custom-${index}`,
        name: script === "cjk" ? "界".repeat(80) : "⚽".repeat(80),
        cue: script === "cjk" ? "球".repeat(180) : "🚀".repeat(90),
        tip: "Synthetic",
        steps: ["Synthetic control instructions"],
        skill: "Ball control",
        space: "Small space",
        level: "New to training",
        gear: [],
      })),
    );
    assert.equal(custom.length, 40);
    const catalog = [...drills, ...custom];
    const before = JSON.stringify(catalog);
    const sharing = coachContextWithCoverage(data, catalog);
    const eligible = catalog.filter(
      (drill) =>
        allowed(drill, data.profile) && recommendedForPosition(drill, data.profile),
    );
    assert.equal(sharing.eligibleDrillCount, eligible.length);
    assert.ok(sharing.sharedDrillCount > 0 && sharing.sharedDrillCount < eligible.length);
    assert.equal(sharing.sharedDrillCount, sharing.context.plan.length);
    assert.ok(pythonContextCharacters(sharing.context) <= COACH_CONTEXT_CHARACTERS);
    assert.deepEqual(
      sharing.context.allowedDrillIds,
      sharing.context.plan.map((drill) => drill.id),
    );
    for (const shared of sharing.context.plan) {
      const original = eligible.find((drill) => drill.id === shared.id)!;
      assert.deepEqual(shared, {
        id: original.id,
        name: original.name,
        cue: original.cue,
      });
    }
    assert.equal(
      JSON.stringify(catalog),
      before,
      "the full local catalog must remain untouched",
    );
    const scope = "synthetic-identity";
    const request = buildCoachRequest({
      turns: Array.from({ length: 10 }, (_, id) => ({
        id,
        status: "complete" as const,
        question: "球".repeat(500),
        memoryScope: scope,
        answer: {
          source: "gemini" as const,
          reply: "球".repeat(1000),
          drillIds: ["sole"],
        },
      })),
      scope,
      provider: "gemini",
      currentId: 99,
      message: script === "cjk" ? "球".repeat(1500) : "🚀".repeat(750),
      context: sharing.context,
      memoryAvailable: true,
    });
    assert.ok(utf8Bytes(JSON.stringify(request)) <= 24000);
    assert.deepEqual(request.context, sharing.context);
  });
}

test("ordinary compatible catalogs share all records without a subset notice", () => {
  const data = initialData();
  const sharing = coachContextWithCoverage(data, drills);
  assert.equal(sharing.sharedDrillCount, sharing.eligibleDrillCount);
  assert.ok(sharing.sharedDrillCount > 0);
});
