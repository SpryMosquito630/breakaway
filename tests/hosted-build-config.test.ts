import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const config = require("../app.config.js");

test("default builds preserve existing plugins and omit Firebase native configuration", () => {
  const previous = process.env.EXPO_PUBLIC_HOSTED_ANALYSIS_ENABLED;
  try {
    process.env.EXPO_PUBLIC_HOSTED_ANALYSIS_ENABLED = "false";
    const value = config();
    assert.equal(value.ios.googleServicesFile, undefined);
    assert.equal(
      value.plugins.some((p: unknown) => String(p).includes("firebase")),
      false,
    );
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_HOSTED_ANALYSIS_ENABLED;
    else process.env.EXPO_PUBLIC_HOSTED_ANALYSIS_ENABLED = previous;
  }
});

test("hosted native configuration refuses missing Firebase registration and uses App Attest production entitlement", () => {
  const names = [
    "EXPO_PUBLIC_HOSTED_ANALYSIS_ENABLED",
    "BREAKAWAY_FIREBASE_IOS_CONFIG",
    "EXPO_PUBLIC_HOSTED_ANALYSIS_URL",
  ];
  const previous = names.map((name) => process.env[name]);
  try {
    process.env.EXPO_PUBLIC_HOSTED_ANALYSIS_ENABLED = "true";
    delete process.env.BREAKAWAY_FIREBASE_IOS_CONFIG;
    assert.throws(config, /GoogleService-Info.plist/);
    // Synthetic paths only inspect configuration; no native build or Firebase call.
    process.env.BREAKAWAY_FIREBASE_IOS_CONFIG = "/synthetic/GoogleService-Info.plist";
    process.env.EXPO_PUBLIC_HOSTED_ANALYSIS_URL = "https://analysis.example.com";
    const value = config();
    assert.equal(
      value.ios.entitlements["com.apple.developer.devicecheck.appattest-environment"],
      "production",
    );
    assert.deepEqual(value.plugins.at(-1), [
      "expo-build-properties",
      { ios: { useFrameworks: "dynamic" } },
    ]);
  } finally {
    names.forEach((name, i) => {
      if (previous[i] === undefined) delete process.env[name];
      else process.env[name] = previous[i];
    });
  }
});
