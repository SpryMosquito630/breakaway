import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  symlinkSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const plist = require("@expo/plist").default;
const root = path.resolve(__dirname, "..");

test(
  "actual iOS prebuild keeps recording permission in hosted builds despite camera plugin ordering",
  { timeout: 120000 },
  () => {
    const directory = mkdtempSync(path.join(tmpdir(), "breakaway-permission-prebuild-"));
    try {
      for (const file of [
        "app.json",
        "app.config.js",
        "package.json",
        "react-native.config.js",
        "firebase.json",
      ])
        copyFileSync(path.join(root, file), path.join(directory, file));
      mkdirSync(path.join(directory, "assets"));
      copyFileSync(
        path.join(root, "assets/icon.png"),
        path.join(directory, "assets/icon.png"),
      );
      symlinkSync(
        path.join(root, "node_modules"),
        path.join(directory, "node_modules"),
        "dir",
      );
      // Config-only fixture: no Firebase service or native app is executed.
      const firebase = path.join(directory, "GoogleService-Info.plist");
      writeFileSync(
        firebase,
        plist.build({
          GOOGLE_APP_ID: "1:123456789:ios:0000000000000000000000",
          BUNDLE_ID: "com.sprymosquito630.breakaway",
          PROJECT_ID: "synthetic-config-only",
          GCM_SENDER_ID: "123456789",
          API_KEY: "synthetic-not-a-credential",
        }),
      );
      const build = (hosted: boolean) => {
        const result = spawnSync(
          process.execPath,
          [
            require.resolve("expo/bin/cli"),
            "prebuild",
            "--platform",
            "ios",
            "--no-install",
            "--clean",
          ],
          {
            cwd: directory,
            encoding: "utf8",
            timeout: 55000,
            env: {
              ...process.env,
              CI: "1",
              EXPO_NO_DOTENV: "1",
              EXPO_PUBLIC_HOSTED_ANALYSIS_ENABLED: String(hosted),
              EXPO_PUBLIC_HOSTED_ANALYSIS_URL: "https://analysis.example.com",
              BREAKAWAY_FIREBASE_IOS_CONFIG: firebase,
            },
          },
        );
        assert.equal(
          result.status,
          0,
          `native prebuild failed: ${result.error?.message ?? result.stderr}`,
        );
        return plist.parse(
          readFileSync(path.join(directory, "ios/Breakaway/Info.plist"), "utf8"),
        );
      };
      const hosted = build(true);
      assert.equal(
        hosted.NSMicrophoneUsageDescription,
        "Record audio with your practice video.",
      );
      assert.equal(
        hosted.NSCameraUsageDescription,
        "Record practice videos and scan food labels when you choose these features.",
      );
      assert.ok(hosted.NSPhotoLibraryUsageDescription);
      const local = build(false);
      assert.equal(local.NSMicrophoneUsageDescription, undefined);
      assert.ok(local.NSCameraUsageDescription);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
