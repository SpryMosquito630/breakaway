import test from "node:test";
import assert from "node:assert/strict";
import { buildCoachRequest, ChatGeneration, utf8Bytes } from "../src/coachAi/memory";
import type { ChatTurn } from "../src/coachAi/conversation";

const scope = "private-identity-scope-never-send";
function turn(id: number, extra: Partial<ChatTurn> = {}): ChatTurn {
  return {
    id,
    question: `Question ${id}`,
    status: "complete",
    memoryScope: scope,
    answer: { source: "gemini", reply: `Reply ${id}`, drillIds: ["sole"] },
    ...extra,
  };
}
const input = {
  scope,
  provider: "gemini" as const,
  currentId: 99,
  message: "What about that drill?",
  context: { allowedDrillIds: ["sole"] },
  memoryAvailable: true,
};
function history(turns: ChatTurn[]) {
  const request = buildCoachRequest({ ...input, turns });
  return "history" in request ? request.history : [];
}

test("Recent completed AI exchanges retain roles, order and attached drill references", () => {
  const rows = history([turn(1), turn(2)]);
  assert.deepEqual(
    rows.map((row) => row.role),
    ["user", "assistant", "user", "assistant"],
  );
  assert.equal(rows[0].text, "Question 1");
  assert.deepEqual(JSON.parse(rows[1].text), { reply: "Reply 1", drillIds: ["sole"] });
  assert.equal(rows[2].text, "Question 2");
  assert.equal(JSON.stringify(rows).includes(scope), false);
});

test("Memory excludes pending, failed, offline, different provider and different identity turns", () => {
  const rows = history([
    turn(1, { status: "queued" }),
    turn(2, { status: "failed" }),
    turn(3, { answer: { source: "offline", reply: "Local", drillIds: [] } }),
    turn(4, { answer: { source: "openai", reply: "Other provider", drillIds: [] } }),
    turn(5, { memoryScope: "another-account-or-paired-phone" }),
    turn(6),
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].text, "Question 6");
});

test("Only six recent complete exchanges are retained", () => {
  const rows = history(Array.from({ length: 10 }, (_, index) => turn(index + 1)));
  assert.equal(rows.length, 12);
  assert.equal(rows[0].text, "Question 5");
  assert.equal(rows[10].text, "Question 10");
});

test("Current and later turns are not duplicated when sending or retrying", () => {
  const request = buildCoachRequest({
    ...input,
    currentId: 3,
    turns: [turn(1), turn(2), turn(3, { status: "queued" }), turn(4)],
  });
  assert.ok("history" in request);
  assert.deepEqual(
    request.history.filter((row) => row.role === "user").map((row) => row.text),
    ["Question 1", "Question 2"],
  );
  assert.equal(request.message, input.message);
});

test("Old backends receive no history field and cannot silently advertise memory", () => {
  const request = buildCoachRequest({
    ...input,
    turns: [turn(1)],
    memoryAvailable: false,
  });
  assert.equal("history" in request, false);
});

test("Unicode memory drops oldest pairs to fit the complete serialized 24KB request", () => {
  const turns = Array.from({ length: 4 }, (_, index) =>
    turn(index + 1, {
      question: `${index + 1}` + "é".repeat(499),
      answer: { source: "gemini", reply: "r".repeat(800), drillIds: ["sole"] },
    }),
  );
  const request = buildCoachRequest({
    ...input,
    turns,
    message: "⚽".repeat(1000),
    context: { plan: "c".repeat(15500), allowedDrillIds: ["sole"] },
  });
  assert.ok("history" in request);
  assert.ok(request.history.length > 0 && request.history.length < 8);
  assert.equal(request.history.length % 2, 0);
  assert.ok(utf8Bytes(JSON.stringify(request)) <= 24000);
  assert.ok(request.history.at(-2)?.text.startsWith("4"));
  assert.equal((request.context as { plan: string }).plan.length, 15500);
});

test("Oversized current context fails before a provider request instead of truncating facts", () => {
  assert.throws(
    () =>
      buildCoachRequest({ ...input, turns: [], context: { plan: "球".repeat(9000) } }),
    /too large/,
  );
});

test("New chat fences late completions so old requests cannot repopulate it", async () => {
  const generation = new ChatGeneration();
  const old = generation.value;
  const messages: string[] = [];
  const response = Promise.resolve("old answer").then((answer) => {
    if (generation.matches(old)) messages.push(answer);
  });
  generation.reset();
  await response;
  assert.deepEqual(messages, []);
  assert.equal(generation.matches(old), false);
  assert.equal(generation.matches(generation.value), true);
  assert.equal(history([]).length, 0);
});
