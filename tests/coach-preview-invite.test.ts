import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCoachInviteURL,
  createCoachInviteCapture,
} from "../src/coachAi/previewInvite";
import {
  validCoachPair,
  PREVIEW_INVITE_MILLISECONDS,
  type CoachPair,
} from "../src/coachAi/pairing";

const now = 1800000000000;
const id = "ownerpreviewdevice00001";
const token = "x".repeat(43);
const link = (
  origin = "exp://current.on.expo.app",
  secret = token,
  expiry = now + PREVIEW_INVITE_MILLISECONDS,
) => `${origin}/--/coach-connect#coachInvite=${id}.${secret}.${expiry}`;

test("private native and web launch fragments create bounded credentials for only their explicit host", () => {
  const pair = parseCoachInviteURL(link(), now)!;
  assert.equal(pair.kind, "invite");
  assert.equal(pair.base, "https://current.on.expo.app/api/replay");
  assert.equal(pair.token, token);
  assert.equal(pair.inviteId, id);
  assert.ok(validCoachPair(pair, pair.base, now));
  assert.equal(
    validCoachPair(pair, "https://rotated.on.expo.app/api/replay", now),
    false,
  );
  const rebound = parseCoachInviteURL(link("exp://rotated.on.expo.app"), now)!;
  assert.equal(rebound.base, "https://rotated.on.expo.app/api/replay");
  assert.equal(rebound.token, pair.token);
  assert.equal(
    parseCoachInviteURL(link("exp://10.0.0.247:8086"), now)!.base,
    "http://10.0.0.247:8086/api/replay",
  );
  assert.equal(
    parseCoachInviteURL(
      `http://localhost:8086/#coachInvite=${id}.${token}.${now + 10000}`,
      now,
    )!.base,
    "http://localhost:8086/api/replay",
  );
});

test("ordinary Expo links, public health IDs, wrong paths and malformed or expired fragments grant no access", () => {
  for (const url of [
    null,
    {},
    "",
    "exp://current.on.expo.app",
    "https://current.on.expo.app/#serverId=" + id,
    link().replace("#", "?"),
    link().replace("/--/coach-connect", "/unrelated"),
    link("javascript://bad"),
    link("https://user:password@current.on.expo.app"),
    link(undefined, "short"),
    link(undefined, token, now),
    link(undefined, token, now + PREVIEW_INVITE_MILLISECONDS + 300001),
    link() + `&coachInvite=${id}.${token}.${now + 10000}`,
    link().replace(id, "bad"),
    link().replace(String(now + PREVIEW_INVITE_MILLISECONDS), "Infinity"),
    link() + "x".repeat(2048),
  ])
    assert.equal(parseCoachInviteURL(url, now), null);
});

test("cold start, warm delivery and stale initial-URL races import only the newest valid private handoff", () => {
  const accepted: CoachPair[] = [];
  const capture = createCoachInviteCapture(
    (pair) => accepted.push(pair),
    () => now,
  );
  assert.equal(capture.cold(link()), true);
  assert.equal(capture.warm(link("exp://new.on.expo.app", "y".repeat(43))), true);
  assert.equal(
    capture.cold(link()),
    false,
    "late cold URL must not replace a warm invite",
  );
  assert.equal(capture.warm("https://unrelated.example/"), false);
  assert.equal(accepted.length, 2);
  assert.equal(accepted[1].base, "https://new.on.expo.app/api/replay");
  capture.dispose();
  assert.equal(capture.warm(link()), false);
  assert.equal(accepted.length, 2);
  const other = createCoachInviteCapture(
    (pair) => accepted.push(pair),
    () => now,
  );
  assert.equal(other.warm("malformed"), false);
  assert.equal(
    other.cold(link()),
    true,
    "irrelevant warm URLs must not discard a legitimate cold invite",
  );
});
