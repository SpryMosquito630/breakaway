import test from "node:test";
import assert from "node:assert/strict";
import { makeSession, recap, type Active } from "../src/domain/model";
import { advancePractice, samePracticeBlock } from "../src/domain/practiceActions";

const complete = (ids: string[]) => ({
  ...makeSession(ids, 15, 1000),
  warmed: true,
  phase: "timer" as const,
  remaining: 0,
  elapsed: 260,
  blockElapsed: 260,
});

test("a repeated old Next/Skip event cannot advance the next block", () => {
  for (const skip of [false, true]) {
    const rendered = complete(["sole", "inside", "weak"]);
    const first = advancePractice(rendered, rendered, skip, 1000)!;
    assert.equal(first.kind, "advance");
    assert.equal(first.active.index, 1);
    assert.equal(first.active.results?.length, 1);
    assert.equal(advancePractice(first.active, rendered, skip, 1000), null);
  }
});

test("a repeated Finish cannot resurrect a cleared session or save a second recap", () => {
  const rendered = complete(["sole"]);
  const command = advancePractice(rendered, rendered, false, 1000)!;
  assert.equal(command.kind, "finish");
  const history = [recap(command.active, 1000)];
  let live: Active | null = null;
  const repeated = advancePractice(live, rendered, false, 1000);
  if (repeated) history.push(recap(repeated.active, 1000));
  assert.equal(history.length, 1);
  assert.equal(history[0].done, 1);
  assert.equal(samePracticeBlock(live, rendered), false);
});

test("an old confirmation cannot act on a replacement session", () => {
  const old = complete(["sole"]);
  const replacement = { ...old, id: "new-session" };
  assert.equal(advancePractice(replacement, old, true, 1000), null);
  assert.equal(samePracticeBlock(replacement, old), false);
});
