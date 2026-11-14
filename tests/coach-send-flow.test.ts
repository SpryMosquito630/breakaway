import test from "node:test";
import assert from "node:assert/strict";
import { CoachSendFlow } from "../src/coachAi/sendFlow";

const ready = {
  enabled: true,
  age: "adult" as const,
  connected: true,
  pairRequired: false,
  consentKey: "server|gemini|user-a",
};

test("Opening Coach cannot initiate a send, even with an existing consent grant", () => {
  const flow = new CoachSendFlow();
  assert.equal(flow.next(ready), "idle");
  flow.approve(ready.consentKey);
  assert.equal(flow.next(ready), "idle");
  assert.equal(flow.take(ready.consentKey), null);
});

test("One explicit question survives age, connection, pairing and consent, then sends once", () => {
  const flow = new CoachSendFlow();
  flow.queue("  How can I practice passing?  ");
  assert.equal(flow.next({ enabled: true }), "age");
  assert.equal(flow.next({ enabled: true, age: "adult" }), "connect");
  const dev = { ...ready, pairRequired: true, paired: false };
  assert.equal(flow.next(dev), "pair");
  assert.equal(flow.question, "How can I practice passing?");
  assert.equal(flow.next({ ...dev, paired: true }), "consent");
  assert.equal(flow.take(ready.consentKey), null);
  flow.approve(ready.consentKey);
  assert.equal(flow.next({ ...dev, paired: true }), "send");
  assert.equal(flow.take(ready.consentKey), "How can I practice passing?");
  assert.equal(flow.take(ready.consentKey), null);
  assert.equal(flow.next({ ...dev, paired: true }), "idle");
});

test("Under-13 and disabled builds use the offline route even with prior consent", () => {
  const flow = new CoachSendFlow();
  flow.queue("First touch?");
  flow.approve(ready.consentKey);
  assert.equal(flow.next({ ...ready, age: "under13" }), "offline");
  assert.equal(flow.next({ ...ready, enabled: false }), "offline");
  flow.reset();
  assert.equal(flow.next(ready), "idle");
  flow.queue("A new eligible question");
  assert.equal(flow.next(ready), "consent");
});

test("A failed or canceled request never replays automatically", () => {
  const flow = new CoachSendFlow();
  flow.queue("Passing?");
  flow.approve(ready.consentKey);
  assert.equal(flow.take(ready.consentKey), "Passing?");
  flow.cancel();
  assert.equal(flow.next(ready), "idle");
  assert.equal(flow.take(ready.consentKey), null);
  flow.queue("Passing?"); // Only a new explicit send restores a canceled question.
  assert.equal(flow.next(ready), "send");
});

test("A changed provider, server or account requires fresh consent without automatic sending", () => {
  const flow = new CoachSendFlow();
  flow.approve(ready.consentKey);
  for (const key of [
    "server|openai|user-a",
    "other|gemini|user-a",
    "server|gemini|user-b",
  ]) {
    flow.queue("Passing?");
    assert.equal(flow.next({ ...ready, consentKey: key }), "consent");
    assert.equal(flow.take(key), null);
  }
});

test("Development pairing cannot be skipped by a consent grant", () => {
  const flow = new CoachSendFlow();
  flow.queue("Passing?");
  flow.approve(ready.consentKey);
  assert.equal(flow.next({ ...ready, pairRequired: true, paired: false }), "pair");
  assert.equal(flow.next({ ...ready, pairRequired: true, paired: true }), "send");
});
