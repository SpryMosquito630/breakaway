import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCoachRequestIdentity,
  coachRequestFailure,
  coachConsentKey,
  readServiceResponse,
  ServiceError,
} from "../src/coachAi/serviceResponse";
import { CoachSendFlow } from "../src/coachAi/sendFlow";

const pair = {
  base: "https://synthetic.invalid/api/replay",
  token: "x".repeat(43),
  expiresAt: 1800000100000,
};
const actual = {
  userId: "user-a",
  pairRevision: 2,
  pair,
  base: pair.base,
  pairToken: pair.token,
  now: 1800000000000,
};

test("HTML, malformed and non-string provider errors become bounded actionable errors", async () => {
  await assert.rejects(
    readServiceResponse({
      ok: false,
      json: async () => {
        throw new SyntaxError("synthetic HTML gateway document");
      },
    }),
    (error) =>
      error instanceof ServiceError &&
      error.code === "invalid_response" &&
      !error.message.includes("HTML"),
  );
  for (const value of [
    null,
    { error: { message: { unexpected: "object" } } },
    { error: { message: "x".repeat(501) } },
    { error: { message: "  " } },
  ]) {
    await assert.rejects(
      readServiceResponse({ ok: false, json: async () => value }),
      (error) =>
        error instanceof ServiceError &&
        typeof error.message === "string" &&
        error.message.length < 100,
    );
  }
  await assert.rejects(
    readServiceResponse({
      ok: false,
      json: async () => ({
        error: { code: "pair_required", message: "Pair this phone again." },
      }),
    }),
    (error) =>
      error instanceof ServiceError &&
      error.code === "pair_required" &&
      error.message === "Pair this phone again.",
  );
  const aborted = new Error("Synthetic cancelled body read");
  aborted.name = "AbortError";
  await assert.rejects(
    readServiceResponse({
      ok: true,
      json: async () => {
        throw aborted;
      },
    }),
    (error) => error === aborted,
  );
  const payload = { source: "gemini", reply: "Synthetic tested response", drillIds: [] };
  assert.deepEqual(
    await readServiceResponse({ ok: true, json: async () => payload }),
    payload,
  );
});

test("account and paired-identity changes refuse before a mocked provider fetch", () => {
  let requests = 0;
  const send = (value: typeof actual) => {
    assertCoachRequestIdentity({ userId: "user-a", pairRevision: 2 }, value);
    requests++;
  };
  for (const value of [
    { ...actual, userId: "user-b" },
    { ...actual, userId: null },
    { ...actual, pairRevision: 3 },
    { ...actual, pair: { ...pair, token: "y".repeat(43) } },
    { ...actual, base: "https://other.invalid/api/replay" },
    { ...actual, now: pair.expiresAt },
  ])
    assert.throws(() => send(value as typeof actual), ServiceError);
  assert.equal(requests, 0);
  send(actual);
  assert.equal(requests, 1);
  assertCoachRequestIdentity({ userId: null }, { ...actual, userId: null, pair: null });
});

test("pair replacement requires new consent even when the signed-in account is unchanged", () => {
  const service = {
    base: pair.base,
    chatProvider: "gemini",
    chatMemoryAvailable: true,
    coachIdentity: "user-a",
    chatPairToken: pair.token,
  };
  const approved = coachConsentKey(service);
  const flow = new CoachSendFlow();
  flow.approve(approved);
  const changed = [
    { ...service, base: "https://other.invalid/api/replay" },
    { ...service, chatProvider: "openai" },
    { ...service, coachIdentity: "user-b" },
    { ...service, chatPairToken: "y".repeat(43) },
    { ...service, chatMemoryAvailable: false },
  ];
  for (const next of changed) {
    flow.queue("Synthetic test question");
    assert.equal(
      flow.next({ enabled: true, connected: true, consentKey: coachConsentKey(next) }),
      "consent",
    );
    assert.equal(flow.take(coachConsentKey(next)), null);
  }
});

test("a late old pairing rejection leaves the newest connection for an explicit retry", () => {
  const rejected = new ServiceError("Synthetic old pairing rejection", "pair_required");
  const changed = coachRequestFailure(rejected, 2, 3);
  assert.ok(changed instanceof ServiceError);
  assert.equal(changed.code, "pair_changed");
  assert.match(changed.message, /Retry/);
  assert.equal(coachRequestFailure(rejected, 2, 2), rejected);
  assert.equal(coachRequestFailure(rejected, undefined, 3), rejected);
});
