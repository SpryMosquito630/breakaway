const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const middleware = require("./metro_proxy.cjs");

test("shot pose proxy permits only health and authenticated pose transport", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "breakaway-pose-proxy-"));
  const requests = [];
  const upstream = http.createServer((req, res) => {
    requests.push({
      path: req.url,
      authorization: req.headers.authorization,
      ...(req.headers["x-coach-pair"] ? { pair: req.headers["x-coach-pair"] } : {}),
      ...(req.url === "/shot-review" ? { includePose: req.headers["x-include-pose"], user: req.headers["x-user-token"] } : {}),
    });
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ available: true }));
    });
  });
  const listen = (server) =>
    new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const close = (server) => new Promise((resolve) => server.close(resolve));
  let proxy;
  try {
    await listen(upstream);
    fs.mkdirSync(path.join(root, "work/replay-service"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "work/replay-service/runtime.json"),
      JSON.stringify({ port: upstream.address().port }),
    );
    const fallback = (req, res) => {
      res.writeHead(404);
      res.end();
    };
    proxy = http.createServer(middleware(fallback, root, { poseOnly: true }));
    await listen(proxy);
    const base = `http://127.0.0.1:${proxy.address().port}/api/replay`;
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal(
      (
        await fetch(`${base}/pose`, {
          method: "POST",
          body: "test",
          headers: { Authorization: "Bearer test-session" },
        })
      ).status,
      200,
    );
    assert.deepEqual(requests, [
      { path: "/health", authorization: "" },
      { path: "/pose", authorization: "Bearer test-session" },
    ]);
    for (const route of ["analyze", "chat", "coach", "food", "pair", "shot-review"]) {
      assert.equal(
        (await fetch(`${base}/${route}`, { method: "POST", body: "test" })).status,
        404,
      );
    }
    assert.equal((await fetch(`${base}/pose`)).status, 405);
    assert.equal(requests.length, 2);
    await close(proxy);
    proxy = http.createServer(
      middleware(fallback, root, { poseOnly: true, coachChat: true }),
    );
    await listen(proxy);
    const coachBase = `http://127.0.0.1:${proxy.address().port}/api/replay`;
    assert.equal(
      (
        await fetch(`${coachBase}/chat`, {
          method: "POST",
          body: "test",
          headers: { Authorization: "Bearer test-session" },
        })
      ).status,
      200,
    );
    assert.deepEqual(requests.at(-1), {
      path: "/chat",
      authorization: "Bearer test-session",
    });
    for (const route of ["analyze", "coach", "food"])
      assert.equal(
        (await fetch(`${coachBase}/${route}`, { method: "POST", body: "test" })).status,
        404,
      );
    assert.equal(
      (await fetch(`${coachBase}/pair`, { method: "POST", body: "{}" })).status,
      404,
    );
    await close(proxy);
    proxy = http.createServer(
      middleware(fallback, root, { poseOnly: true, coachChat: true, coachPairing: true }),
    );
    await listen(proxy);
    const pairedBase = `http://127.0.0.1:${proxy.address().port}/api/replay`;
    assert.equal(
      (
        await fetch(`${pairedBase}/pair`, {
          method: "POST",
          body: '{"code":"12345678"}',
          headers: { Authorization: "Bearer test-session" },
        })
      ).status,
      200,
    );
    assert.equal(requests.at(-1).path, "/pair");
    assert.equal(
      (await fetch(`${pairedBase}/pair`, { method: "POST", body: "x".repeat(513) }))
        .status,
      413,
    );
    assert.equal(
      (
        await fetch(`${pairedBase}/chat`, {
          method: "POST",
          body: "{}",
          headers: { "X-Coach-Pair": "private-phone-token" },
        })
      ).status,
      200,
    );
    assert.equal(requests.at(-1).pair, "private-phone-token");
    await close(proxy);
    proxy = http.createServer(
      middleware(fallback, root, { poseOnly: true, shotReview: true }),
    );
    await listen(proxy);
    const shotBase = `http://127.0.0.1:${proxy.address().port}/api/replay`;
    assert.equal((await fetch(`${shotBase}/shot-review`, {
      method: "POST", body: "synthetic-video", headers: {
        Authorization: "Bearer test-session", "X-Coach-Pair": "private-phone-token",
        "X-User-Token": "verified-user-token", "X-Include-Pose": "1",
      },
    })).status, 200);
    assert.deepEqual(requests.at(-1), {
      path: "/shot-review", authorization: "Bearer test-session", pair: "private-phone-token",
      user: "verified-user-token", includePose: "1",
    });
    assert.equal((await fetch(`${shotBase}/shot-review`)).status, 405);
    for (const route of ["analyze", "chat", "coach", "food", "pair"])
      assert.equal((await fetch(`${shotBase}/${route}`, { method: "POST", body: "test" })).status, 404);

  } finally {
    if (proxy) await close(proxy);
    await close(upstream);
    fs.rmSync(root, { recursive: true, force: true });
  }
});
