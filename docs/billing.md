# Membership integration and activation

The client integration is prepared; a paid service is **not live**. No store owner project, products, public SDK keys, legal policy URLs or credit service is configured in this checkout. Local training tools remain free. Membership never changes OVR, XP or earned training progress. Nothing in the app fabricates a successful transaction or a credit balance.

## Client boundaries

`src/billing/revenueCat.ts` loads `react-native-purchases` only after checking the platform, Expo execution environment and configuration. Web and Expo Go do not import/configure it. RevenueCat's Expo Go Preview API Mode uses mocks; this app deliberately does not use that mode for membership. Actual purchase testing needs a rebuilt native development app or store distribution build containing the SDK, not a JavaScript reload. Missing native modules fail closed.

`MembershipScreen` reads localized prices, titles, descriptions and subscription periods from the current RevenueCat offering. It shows no fabricated plans, discounts or prices. Only recurring subscription packages are shown; it does not sell consumable credits. Configure the current offering to contain only the intended membership products with accurate descriptions and entitlement mapping. The system store sheet supplies final purchase and trial terms. The client does not claim specific premium features before a real plan is defined and enforced.

The only active state comes from SDK CustomerInfo with an active configured entitlement and `VERIFIED` or `VERIFIED_ON_DEVICE` signature verification on both the entitlement collection and specific entitlement. `NOT_REQUESTED`/`FAILED` are rejected. SDK11 exposes INFORMATIONAL verification; the app explicitly checks results rather than assuming informational mode blocks access. No active state is written to AsyncStorage, custom credits, XP or parent approval state. This is client presentation state, never authority for a server-paid operation.

Purchase and restore are explicit user button actions. Cancellation, device restrictions, payment pending, connectivity and uncertain store errors have separate messages. Apple Ask to Buy/payment pending does not grant membership; approval must occur through the store. CustomerInfo updates and app foreground trigger refresh. Restore checks the restored entitlement rather than assuming the restore call means a paid membership exists. A store error may have an uncertain transaction outcome; the UI directs users to purchase history/refresh/restore before retrying.

Creator codes accept 3–24 ASCII letters, numbers, underscores or hyphens, normalized to uppercase. A configured client can submit `creator_code` as a RevenueCat subscriber attribute. This is unverified attribution only: no campaign lookup, discount, grant or commission claim. Backend campaign validation and payout rules are intentionally absent.

## Owner configuration

Use the platform **public SDK key**, never a RevenueCat secret API key. Set these in the build environment:

```text
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_<public-platform-key>
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_<public-platform-key>
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT=<actual-entitlement-identifier>
EXPO_PUBLIC_MEMBERSHIP_TERMS_URL=https://<published-membership-terms>
EXPO_PUBLIC_PRIVACY_URL=https://<published-privacy-policy>
```

Missing keys, entitlement, HTTPS legal URLs or a supported native runtime keep purchases unavailable. Test Store keys are not accepted: they must not accidentally present simulated transactions as real store purchases. Store sandbox purchases use the appropriate Apple/Google store configuration and platform SDK key.

In App Store Connect / Play Console and RevenueCat, the owner must configure matching app identifiers, store credentials, subscription products, entitlement mapping, current offering, localized descriptions, legal terms and store account agreements. Build a native application with `react-native-purchases@11.0.1` and Expo-compatible `expo-constants`; configure native development client/build signing separately. Complete real sandbox verification on both platforms: current price/period, successful purchase, cancellation, Ask to Buy/payment pending, rejected payment, restore, expiry/refund/revocation, offline recovery and return from payment authentication. No paid transaction was attempted by the agent.

The SDK currently uses an anonymous RevenueCat app user; optional Supabase sign-in does not yet link billing identities. Existing account features and all free tools work without this link. Before cross-device account-owned billing goes live, add explicit identity lifecycle handling (authenticated user ID only, login/logout switching, restore transfer policy) and verify that it cannot attribute another person's receipt to a signed-out account. Do not use email or a guessed/local ID as authentication.

## Analysis credits and paid AI

`src/billing/credits.ts` is a read-only provider contract with an unavailable implementation until an authenticated backend is connected. It shows no number, grants or debit buttons. A future backend implementation must read an authoritative ledger; it must not trust a balance submitted by the client.

Before activating paid AI, implement server enforcement: authenticate the caller; map the authenticated account to RevenueCat identity; verify current entitlement using a server-side RevenueCat credential/API or authenticated, validated webhooks; handle expiry/refunds/revocations and webhook retries idempotently; keep a durable credit ledger; atomically reserve/debit credits around analysis with idempotency keys and a documented failure/refund policy. Client CustomerInfo/creator codes and local training data never authorize paid requests. RevenueCat webhooks need server-only secret verification and must never be forwarded from a client as proof. No webhook endpoint or paid credit ledger has been provisioned by this change.

## Verification

`npx tsx --test tests/billing.test.ts` checks runtime/config gating, unsigned/inactive/unrelated entitlement refusal, verified entitlement acceptance, pending/cancellation/restriction classification, localized store strings, bounded creator normalization and the unavailable credit adapter. `npm run typecheck` passes. These are offline contract tests; native purchase, renewal, receipt transfer, restore and store sandbox validation remain blocked on owner store configuration and native builds.

Official references checked November 6, 2026:

- [RevenueCat Expo installation and native development builds](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [RevenueCat error handling and pending payments](https://www.revenuecat.com/docs/test-and-launch/errors)
- [Restoring purchases](https://www.revenuecat.com/docs/getting-started/restoring-purchases)
- [Trusted Entitlements and signature verification](https://www.revenuecat.com/docs/customers/trusted-entitlements)
- [React Native SDK source and supported versions](https://github.com/RevenueCat/react-native-purchases)
