#!/usr/bin/env node
// Load the current local service session without printing its token.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
let runtime;
try {
  runtime = JSON.parse(
    fs.readFileSync(path.join(root, "work/replay-service/runtime.json"), "utf8"),
  );
} catch {
  console.error(
    "Start the local analysis service first. No session configuration found.",
  );
  process.exit(1);
}
if (typeof runtime.token !== "string" || runtime.token.length < 32) process.exit(1);
const cli = require.resolve("expo/bin/cli", { paths: [root] });
const child = spawn(process.execPath, [cli, "start", ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, EXPO_PUBLIC_ANALYSIS_TOKEN: runtime.token },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
