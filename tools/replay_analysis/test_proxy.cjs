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
    requests.push({ path: req.url, authorization: req.headers.authorization });
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
    for (const route of ["analyze", "chat", "coach", "food"]) {
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
  } finally {
    if (proxy) await close(proxy);
    await close(upstream);
    fs.rmSync(root, { recursive: true, force: true });
  }
});
