import { test } from "node:test";
import assert from "node:assert/strict";
import { drills } from "../src/data/drills";
import { combinedCatalog } from "../src/domain/training";
const catalog = combinedCatalog(drills, {});
import { drillInstructions } from "../src/data/drill-instruction";

test("every starter drill has its own observation and actionable common mistake", () => {
  assert.deepEqual(
    Object.keys(drillInstructions).sort(),
    catalog.map((d) => d.id).sort(),
  );
  const observations = new Set<string>();
  const mistakes = new Set<string>();
  for (const drill of catalog) {
    const instruction = drillInstructions[drill.id];
    assert.ok(instruction.watch.trim(), drill.id);
    assert.ok(instruction.mistake.trim(), drill.id);
    observations.add(instruction.watch);
    mistakes.add(instruction.mistake);
  }
  assert.equal(observations.size, catalog.length);
  assert.equal(mistakes.size, catalog.length);
});

test("custom drills do not inherit starter instructions", () => {
  assert.equal(drillInstructions["custom-sole"], undefined);
});
