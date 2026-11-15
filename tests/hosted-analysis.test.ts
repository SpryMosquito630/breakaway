import test from "node:test";
import assert from "node:assert/strict";
import { readHostedAnalysisConfig } from "../src/config/hostedAnalysis";
import { createHostedIdentityProvider } from "../src/coachAi/hostedIdentityCore";
import { requestHostedAnalysis } from "../src/coachAi/hostedTransport";
import { createHostedOperationIds } from "../src/coachAi/hostedOperations";

test("clip retries retain operation IDs while pose fallback and replacement clips have separate IDs", () => {
  let id = 0;
  const operation = createHostedOperationIds(() => `request-${++id}`);
  assert.equal(operation("clip-one", "shot-review"), "request-1");
  assert.equal(operation("clip-one", "shot-review"), "request-1");
  assert.equal(operation("clip-one", "pose"), "request-2");
  assert.equal(operation("clip-two", "shot-review"), "request-3");
});

test("hosted opt-in requires a public HTTPS endpoint without embedded credentials", () => {
  assert.equal(readHostedAnalysisConfig("false", "https://analysis.example.com"), null);
  for (const url of [
    "http://analysis.example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://phone.local",
    "https://user:secret@analysis.example.com",
    "https://analysis.example.com?token=secret",
    "https://analysis.example.com/#secret",
  ])
    assert.equal(readHostedAnalysisConfig("true", url), null, url);
  assert.deepEqual(
    readHostedAnalysisConfig("true", "https://analysis.example.com/api/"),
    { base: "https://analysis.example.com/api" },
  );
});

test("native guest bootstrap restores persistent identity and shares concurrent sign-in", async () => {
  let current: { uid: string } | null = null;
  let signIns = 0;
  const provider = createHostedIdentityProvider({
    ready: async () => {},
    currentUser: () => current,
    signIn: async () => {
      signIns++;
      current = { uid: "guest" };
      return current;
    },
    idToken: async () => "firebase-token",
    appCheckToken: async () => "attestation",
  });
  const identities = await Promise.all([provider(), provider()]);
  assert.equal(signIns, 1);
  assert.equal(identities[0].userId, "guest");
  current = { uid: "changed" };
  await assert.rejects(provider(), /connection changed/);
});

test("attestation failure fails closed before issuing an auth token or video request", async () => {
  let issued = false;
  const provider = createHostedIdentityProvider({
    ready: async () => {},
    currentUser: () => ({ uid: "existing" }),
    signIn: async () => {
      throw Error("must restore");
    },
    idToken: async () => {
      issued = true;
      return "token";
    },
    appCheckToken: async () => {
      throw Error("attestation failed");
    },
  });
  await assert.rejects(provider(), /attestation failed/);
  assert.equal(issued, false);
});

test("hosted multipart sends only Firebase credentials and idempotency, preserves server quota errors", async () => {
  const form = new FormData();
  form.append("video", new Blob(["synthetic"]), "shot.mp4");
  let calls = 0;
  const send = (async (url: string, init: RequestInit) => {
    calls++;
    assert.equal(url, "https://analysis.example.com/shot-review");
    assert.equal(init.body, form);
    assert.equal(init.redirect, "error");
    assert.deepEqual(init.headers, {
      Authorization: "Bearer firebase-token",
      "X-Firebase-AppCheck": "attestation",
      "X-Request-ID": "request-id",
      "X-Include-Pose": "1",
    });
    return {
      ok: false,
      json: async () => ({
        error: { code: "quota_exceeded", message: "Daily review limit reached." },
      }),
    };
  }) as typeof fetch;
  const options = {
    base: "https://analysis.example.com",
    path: "shot-review",
    body: form,
    signal: new AbortController().signal,
    requestId: "request-id",
    send,
    identity: async () => ({
      userId: "guest",
      idToken: "firebase-token",
      appCheckToken: "attestation",
    }),
  };
  await assert.rejects(requestHostedAnalysis(options), { code: "quota_exceeded" });
  assert.equal(calls, 1);
  await assert.rejects(requestHostedAnalysis({ ...options, path: "chat" }), {
    code: "service_unavailable",
  });
  assert.equal(calls, 1);
});

test("cancelled identity restoration never starts a hosted upload", async () => {
  const abort = new AbortController();
  await assert.rejects(
    requestHostedAnalysis({
      base: "https://analysis.example.com",
      path: "pose",
      body: new FormData(),
      signal: abort.signal,
      requestId: "request-id",
      identity: async () => {
        abort.abort();
        return { userId: "guest", idToken: "token", appCheckToken: "check" };
      },
      send: (async () => {
        throw Error("must not upload");
      }) as typeof fetch,
    }),
    { name: "AbortError" },
  );
});
