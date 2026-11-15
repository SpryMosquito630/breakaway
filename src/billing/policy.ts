/** Pure policy helpers. Never persist entitlements or derive them from local XP. */
export type StoreConfig = {
  apiKey: string;
  entitlement: string;
  termsUrl: string;
  privacyUrl: string;
};
function publicUrl(value?: string): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
export function readStoreConfig(input: {
  platform: string;
  executionEnvironment?: string;
  iosKey?: string;
  androidKey?: string;
  entitlement?: string;
  termsUrl?: string;
  privacyUrl?: string;
}): { config: StoreConfig | null; message: string } {
  if (
    (input.platform !== "ios" && input.platform !== "android") ||
    input.executionEnvironment === "storeClient"
  )
    return {
      config: null,
      message:
        "Store purchases need a store-enabled build. Your local training tools remain free.",
    };
  const key = input.platform === "ios" ? input.iosKey : input.androidKey;
  if (
    !key ||
    !new RegExp(`^${input.platform === "ios" ? "appl" : "goog"}_[A-Za-z0-9]+$`).test(
      key,
    ) ||
    !input.entitlement?.trim()
  )
    return {
      config: null,
      message:
        "Membership is not connected to the store in this build. Your local training tools remain free.",
    };
  const termsUrl = publicUrl(input.termsUrl);
  const privacyUrl = publicUrl(input.privacyUrl);
  if (!termsUrl || !privacyUrl)
    return {
      config: null,
      message: "Membership terms are not available yet. Purchases are unavailable.",
    };
  return {
    config: { apiKey: key, entitlement: input.entitlement.trim(), termsUrl, privacyUrl },
    message: "",
  };
}
export function hasVerifiedEntitlement(info: unknown, entitlement: string): boolean {
  if (!info || typeof info !== "object") return false;
  const entitlements = (
    info as {
      entitlements?: {
        verification?: unknown;
        active?: Record<string, { isActive?: unknown; verification?: unknown }>;
      };
    }
  ).entitlements;
  const active = entitlements?.active?.[entitlement];
  // VERIFIED_ON_DEVICE is signed StoreKit data; paid server features still require server verification.
  const verified = (value: unknown) =>
    value === "VERIFIED" || value === "VERIFIED_ON_DEVICE";
  return (
    active?.isActive === true &&
    verified(entitlements?.verification) &&
    verified(active.verification)
  );
}
export function normalizeCreatorCode(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9_-]{2,23}$/.test(normalized) ? normalized : null;
}
export function storePrice(priceString: unknown, period: unknown): string | null {
  if (typeof priceString !== "string" || !priceString.trim() || priceString.length > 100)
    return null;
  const periods: Record<string, string> = {
    P1W: "week",
    P1M: "month",
    P2M: "2 months",
    P3M: "3 months",
    P6M: "6 months",
    P1Y: "year",
  };
  return `${priceString.trim()}${typeof period === "string" && periods[period] ? ` / ${periods[period]}` : ""}`;
}
export type PurchaseOutcome =
  "cancelled" | "pending" | "not-allowed" | "network" | "store" | "error";
export function purchaseError(error: unknown): {
  outcome: PurchaseOutcome;
  message: string;
} {
  const e = error as { code?: unknown; userCancelled?: boolean } | null;
  const code = String(e?.code ?? "");
  if (e?.userCancelled || code === "1" || code === "PURCHASE_CANCELLED_ERROR")
    return {
      outcome: "cancelled",
      message: "Purchase cancelled. Your membership has not changed.",
    };
  if (code === "20" || code === "PAYMENT_PENDING_ERROR")
    return {
      outcome: "pending",
      message:
        "Waiting for store approval or payment. Membership will update only after the store confirms it. For Ask to Buy, approval happens through Apple Family Sharing.",
    };
  if (code === "3" || code === "PURCHASE_NOT_ALLOWED_ERROR")
    return {
      outcome: "not-allowed",
      message:
        "Purchases are not allowed on this device or store account. Check your store or family settings.",
    };
  if (
    code === "10" ||
    code === "35" ||
    code === "NETWORK_ERROR" ||
    code === "OFFLINE_CONNECTION_ERROR"
  )
    return {
      outcome: "network",
      message:
        "The store could not be reached. Check your connection, then refresh membership.",
    };
  if (code === "2" || code === "STORE_PROBLEM_ERROR")
    return {
      outcome: "store",
      message:
        "The store could not confirm the result. Check your store purchase history, then refresh or restore before trying again.",
    };
  return {
    outcome: "error",
    message:
      "The store could not complete this request. Refresh membership or try restoring existing purchases.",
  };
}
