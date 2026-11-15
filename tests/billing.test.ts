import test from "node:test";
import assert from "node:assert/strict";
import {
  hasVerifiedEntitlement,
  normalizeCreatorCode,
  purchaseError,
  readStoreConfig,
  storePrice,
} from "../src/billing/policy";
import { analysisCredits } from "../src/billing/credits";
const config = {
  platform: "ios",
  executionEnvironment: "standalone",
  iosKey: "appl_public123",
  entitlement: "pro",
  termsUrl: "https://example.org/terms",
  privacyUrl: "https://example.org/privacy",
};
test("only a configured native store build can load purchases", () => {
  assert.ok(readStoreConfig(config).config);
  for (const override of [
    { platform: "web" },
    { executionEnvironment: "storeClient" },
    { iosKey: "sk_secret" },
    { iosKey: "test_mock" },
    { entitlement: "" },
    { privacyUrl: "http://example.org" },
    { termsUrl: "" },
  ])
    assert.equal(readStoreConfig({ ...config, ...override }).config, null);
  assert.equal(readStoreConfig({ ...config, platform: "android" }).config, null);
  assert.ok(
    readStoreConfig({ ...config, platform: "android", androidKey: "goog_public123" })
      .config,
  );
});
test("untrusted, missing, inactive or unrelated entitlements never activate membership", () => {
  const customer = (verification: string, active = true) => ({
    entitlements: { verification, active: { pro: { isActive: active, verification } } },
  });
  for (const bad of [
    null,
    {},
    { pro: true },
    customer("FAILED"),
    customer("NOT_REQUESTED"),
    customer("VERIFIED", false),
  ])
    assert.equal(hasVerifiedEntitlement(bad, "pro"), false);
  assert.equal(hasVerifiedEntitlement(customer("VERIFIED"), "other"), false);
  assert.equal(
    hasVerifiedEntitlement(
      { entitlements: { verification: "VERIFIED", active: { pro: { isActive: true } } } },
      "pro",
    ),
    false,
  );
  assert.equal(hasVerifiedEntitlement(customer("VERIFIED"), "pro"), true);
  assert.equal(hasVerifiedEntitlement(customer("VERIFIED_ON_DEVICE"), "pro"), true);
});
test("pending and refusal states are not successful purchases", () => {
  assert.equal(purchaseError({ code: "20" }).outcome, "pending");
  assert.equal(purchaseError({ code: "PAYMENT_PENDING_ERROR" }).outcome, "pending");
  assert.equal(purchaseError({ userCancelled: true }).outcome, "cancelled");
  assert.equal(purchaseError({ code: "3" }).outcome, "not-allowed");
  assert.equal(purchaseError({ code: "2" }).outcome, "store");
});
test("prices use localized store strings and creator codes remain bounded attribution", () => {
  assert.equal(storePrice("9,99 €", "P1M"), "9,99 € / month");
  assert.equal(storePrice(undefined, "P1Y"), null);
  assert.equal(storePrice("", "P1Y"), null);
  assert.equal(normalizeCreatorCode(" creator_42 "), "CREATOR_42");
  for (const bad of ["ab", "x".repeat(25), "<script>", "CREATE CODE"])
    assert.equal(normalizeCreatorCode(bad), null);
});
test("missing credit backend never invents a spendable balance", async () => {
  const result = await analysisCredits.readBalance();
  assert.equal(result.available, false);
  assert.equal("remaining" in result, false);
});
