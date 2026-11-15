import test from "node:test";
import assert from "node:assert/strict";
import {
  queueChatTurn,
  updateChatTurn,
  type ChatTurn,
} from "../src/coachAi/conversation";

test("An explicit send immediately adds a queued user message without inventing an answer", () => {
  const original: ChatTurn[] = [];
  const queued = queueChatTurn(original, 1, "How can I practice passing?");
  assert.equal(original.length, 0);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].question, "How can I practice passing?");
  assert.equal(queued[0].status, "queued");
  assert.equal(queued[0].answer, undefined);
  const sending = updateChatTurn(queued, 1, { status: "sending" });
  assert.equal(sending[0].answer, undefined);
});

test("A validated reply completes the same user turn and preserves its true provider", () => {
  const queued = queueChatTurn([], 1, "Passing?");
  const completed = updateChatTurn(queued, 1, {
    status: "complete",
    answer: { source: "gemini", reply: "Practice a soft first touch.", drillIds: [] },
  });
  assert.equal(completed.length, 1);
  assert.equal(completed[0].question, "Passing?");
  assert.equal(completed[0].answer?.source, "gemini");
  assert.equal(queued[0].answer, undefined);
});

test("Retry reuses the failed bubble, clears stale output and does not duplicate the question", () => {
  const queued = queueChatTurn([], 1, "Passing?");
  const failed = updateChatTurn(queued, 1, {
    status: "failed",
    note: "Service unavailable",
  });
  const retry = queueChatTurn(failed, 1, "Passing?");
  assert.equal(retry.length, 1);
  assert.equal(retry[0].id, 1);
  assert.equal(retry[0].status, "queued");
  assert.equal(retry[0].answer, undefined);
  assert.notEqual(retry[0].note, failed[0].note);
  assert.equal(failed[0].status, "failed");
});

test("Choosing the offline guide completes the queued question with an honest offline source", () => {
  const queued = queueChatTurn([], 1, "Weaker foot");
  const completed = updateChatTurn(queued, 1, {
    status: "complete",
    answer: {
      source: "offline",
      reply: "Try a compatible catalog drill.",
      drillIds: ["sole"],
    },
  });
  assert.equal(completed.length, 1);
  assert.equal(completed[0].question, "Weaker foot");
  assert.equal(completed[0].answer?.source, "offline");
});

test("Conversation bounds and stale completion preserve newer messages", () => {
  let turns: ChatTurn[] = [];
  for (let id = 1; id <= 25; id++) turns = queueChatTurn(turns, id, `Question ${id}`);
  assert.equal(turns.length, 20);
  assert.equal(turns[0].id, 6);
  assert.deepEqual(updateChatTurn(turns, 1, { status: "complete" }), turns);
  assert.equal(turns.at(-1)?.question, "Question 25");
});
