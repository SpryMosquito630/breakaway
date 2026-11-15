import assert from "node:assert/strict";
import test from "node:test";
import {
  prepareShotReviewConnection,
  reviewThenTrack,
  waitForShotTask,
} from "../src/coachAi/shotReviewPreparation";
import type { CoachPair } from "../src/coachAi/pairing";

const now = 1800000000000;
const service = { base: "https://preview.example/api/replay", shotReviewAvailable: true };
const pair: CoachPair = {
  base: service.base,
  token: "x".repeat(43),
  expiresAt: now + 10000,
};
function dependencies(value: unknown = null) {
  return {
    pairingEnabled: true,
    readPair: async () => value,
    restorePair: (active: typeof service, stored: CoachPair) => ({
      ...active,
      chatPairToken: stored.token,
    }),
    signedIn: async () => false,
    now: () => now,
  };
}

test("capability absence differs from an unconnected phone and never reads authorization", async () => {
  let reads = 0;
  const deps = {
    ...dependencies(),
    readPair: async () => {
      reads++;
      return null;
    },
  };
  const abort = new AbortController();
  assert.deepEqual(
    await prepareShotReviewConnection(
      { ...service, shotReviewAvailable: false },
      deps,
      abort.signal,
    ),
    { status: "service_unavailable" },
  );
  assert.equal(reads, 0);
  assert.deepEqual(await prepareShotReviewConnection(service, deps, abort.signal), {
    status: "connection_required",
  });
});

test("expired and wrong-origin credentials never authorize review", async () => {
  for (const value of [
    null,
    { ...pair, expiresAt: now },
    { ...pair, base: "https://other.example/api/replay" },
  ]) {
    let restores = 0;
    const deps = {
      ...dependencies(value),
      restorePair: () => {
        restores++;
        return service;
      },
    };
    assert.deepEqual(
      await prepareShotReviewConnection(service, deps, new AbortController().signal),
      { status: "connection_required" },
    );
    assert.equal(restores, 0);
  }
});

test("a restored origin-bound pair authorizes review without account restoration", async () => {
  let accountReads = 0;
  const deps = {
    ...dependencies(pair),
    signedIn: async () => {
      accountReads++;
      return false;
    },
  };
  const result = await prepareShotReviewConnection(
    service,
    deps,
    new AbortController().signal,
  );
  assert.equal(result.status, "ready");
  if (result.status === "ready")
    assert.equal(
      (result.service as { chatPairToken?: string }).chatPairToken,
      pair.token,
    );
  assert.equal(accountReads, 0);
});

test("disabled developer pairing ignores stored grants; a signed-in account is independent", async () => {
  const deps = {
    ...dependencies(pair),
    pairingEnabled: false,
    readPair: async () => {
      throw Error("must not read");
    },
  };
  assert.deepEqual(
    await prepareShotReviewConnection(service, deps, new AbortController().signal),
    { status: "connection_required" },
  );
  assert.equal(
    (
      await prepareShotReviewConnection(
        service,
        { ...deps, signedIn: async () => true },
        new AbortController().signal,
      )
    ).status,
    "ready",
  );
});

test("restoration failures retain an actionable distinct outcome", async () => {
  const result = await prepareShotReviewConnection(
    service,
    {
      ...dependencies(),
      signedIn: async () => {
        throw Error("account restore failed");
      },
    },
    new AbortController().signal,
  );
  assert.deepEqual(result, { status: "restore_failed" });
});

test("analysis deadline settles hung storage and prevents late account/provider work", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const abort = new AbortController();
  let release!: (value: unknown) => void;
  let accountReads = 0;
  let providerRequests = 0;
  const pending = prepareShotReviewConnection(
    service,
    {
      ...dependencies(),
      readPair: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
      signedIn: async () => {
        accountReads++;
        return true;
      },
    },
    abort.signal,
  ).then((result) => {
    if (result.status === "ready") providerRequests++;
  });
  const rejected = assert.rejects(pending, { name: "AbortError" });
  await Promise.resolve();
  setTimeout(() => abort.abort(), 100000);
  t.mock.timers.tick(100000);
  await rejected;
  release(pair);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(accountReads, 0);
  assert.equal(providerRequests, 0);
});

test("cancelling hung account restoration settles and never authorizes a late result", async () => {
  const abort = new AbortController();
  let release!: (value: boolean) => void;
  const pending = prepareShotReviewConnection(
    service,
    {
      ...dependencies(),
      pairingEnabled: false,
      signedIn: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    },
    abort.signal,
  );
  const rejected = assert.rejects(pending, { name: "AbortError" });
  await Promise.resolve();
  abort.abort();
  await rejected;
  release(true);
  await Promise.resolve();
});

test("AI failure ends review busy before successful body fallback; explicit retry can succeed", async () => {
  const events: string[] = [];
  const options = {
    signal: new AbortController().signal,
    review: async () => {
      events.push("review");
      throw Error("AI unavailable");
    },
    onReviewError: () => {
      events.push("error");
    },
    onReviewSettled: () => {
      events.push("review settled");
    },
    track: async () => {
      events.push("track");
      return { frames: [1] };
    },
  };
  assert.deepEqual(await reviewThenTrack(options), { frames: [1] });
  assert.deepEqual(events, ["review", "error", "review settled", "track"]);
  events.length = 0;
  assert.deepEqual(
    await reviewThenTrack({ ...options, review: async () => ({ frames: [2] }) }),
    { frames: [2] },
  );
  assert.deepEqual(events, ["review settled"]);
});

test("unconnected phones still get ordinary body tracking without AI work", async () => {
  const pose = await reviewThenTrack({
    signal: new AbortController().signal,
    review: null,
    track: async () => 1,
    onReviewError: () => assert.fail(),
    onReviewSettled: () => assert.fail(),
  });
  assert.equal(pose, 1);
});

test("aborting a hung review settles busy once and never starts body fallback", async () => {
  const abort = new AbortController();
  let settled = 0;
  let tracked = 0;
  const pending = reviewThenTrack({
    signal: abort.signal,
    review: () => new Promise<null>(() => {}),
    track: async () => {
      tracked++;
      return 1;
    },
    onReviewError: () => assert.fail(),
    onReviewSettled: () => {
      settled++;
    },
  });
  const rejected = assert.rejects(pending, { name: "AbortError" });
  abort.abort();
  await rejected;
  assert.equal(settled, 1);
  assert.equal(tracked, 0);
});

test("a pre-aborted operation never starts its task", async () => {
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(
    waitForShotTask(abort.signal, async () => assert.fail()),
    { name: "AbortError" },
  );
});
