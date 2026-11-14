import test from "node:test";
import assert from "node:assert/strict";
import { makeCoachPair, validCoachPair } from "../src/coachAi/pairing";

test("Pair credentials are bound to one origin and a bounded expiry", () => {
  const now = 1000;
  const pair = makeCoachPair(
    "https://test.example/api/replay",
    { pairToken: "x".repeat(43), expiresInSeconds: 7200 },
    now,
  );
  assert.ok(validCoachPair(pair, pair.base, now));
  assert.equal(validCoachPair(pair, "https://other.example/api/replay", now), false);
  assert.equal(validCoachPair(pair, pair.base, pair.expiresAt), false);
  assert.equal(validCoachPair({ ...pair, expiresAt: Infinity }, pair.base, now), false);
});

test("Malformed credentials and excessive lifetimes are rejected", () => {
  for (const value of [
    null,
    {},
    { pairToken: "short", expiresInSeconds: 7200 },
    { pairToken: "x".repeat(43), expiresInSeconds: 7201 },
    { pairToken: "x".repeat(43), expiresInSeconds: -1 },
  ])
    assert.throws(() => makeCoachPair("https://test.example", value));
});
