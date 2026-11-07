# Breakaway implementation status

The roadmap combines seven competing products. Implementations must distinguish local functionality, configured online integrations and experimental analysis. A feature is not live merely because its screen or adapter exists.

## Local core

- Existing practice clock, frozen sessions, reminders, local history and theme remain authoritative.
- Position onboarding starts unanswered. Existing saves remain compatible.
- Saved personal replays keep media and measured ball tracking on device, independently of sample footage.
- Drill instruction currently includes two bundled examples and 28 movement schematics; the remaining drills do not have filmed examples.
- Daily time overrides apply to the local date and preserve the weekly schedule.

## Current roadmap build

- Training: explicit position/weak-foot paths, daily readiness, match calendar, weekly review, favorites, custom drills and playlists.
- Progression: participation XP, levels, schedule-aware streaks, challenges, badges, practice paths, personal-best recognition and season goals. Ability ratings still come only from saved tests.
- Athlete notebook: guided routines/rest timers, foreground GPS, manual personal records, food/label/photo logs, hydration/sleep, focus timers and match records.
- Coach and match organizer: curated session builder, saved sessions, diagrams and exports; local teams, manual ratings, RSVPs, formations and constrained balancing.
- Connected football: optional auth and explicit training sync; private friends/spaces/challenges, chat/events/polls, opt-in standings and block/report controls.
- Coaching: local plan-aware guide, optional structured online chat/video feedback, and experimental local joint visualization.
- Membership: provider-backed offering/purchase/restore adapter with runtime/build gating. No entitlement is granted by a client-side counter or pending payment.

## External activation requirements

Supabase Auth/REST/email require a configured project and the reviewed schema. Local SQL policy tests do not establish hosted integration. Online AI requires server-side credentials, a configured model and request authorization; no live paid AI calls are made during development without those settings. Store purchases require configured products/provider keys and a store-enabled native build; Expo Go is not a payments test environment.

GPS, camera, device media persistence, share sheets and purchase flows need physical-device verification. Joint visibility and generated feedback are experimental, not validated technique or medical judgments. Original instructional content remains illustrative rather than coach-endorsed.

## Verification ledger

November 6, 2026 final integration: 126 app tests passed with no failures/skips; TypeScript passed; combined iOS/Android Expo export passed (38 assets). Backend checks: 11 coaching contracts, six billing-webhook tests and eight existing ball-service tests. Connected and billing SQL policy/ledger suites passed on disposable PostgreSQL 17.11; concurrent credit reservations did not overspend. No hosted service or paid call was exercised.

Browser checks at 390px: all-unanswered onboarding, position, training paths, custom drill creation/favorite, ordered playlist save and actual practice start, meal persistence after reload, local guide, saved coach-session creation/details/diagram, progression routes and empty-state OVR. All toolkit routes opened; account/community/purchase/AI unavailable states stayed honest. Real local joint review rejected cropped footage and produced aligned, playable full-body landmarks on stock footage. These are fixture checks, not general model accuracy. A review also fixed specialist keeper drills appearing in outfield generated plans and blocked notebook writes after a failed read until successful retry.

Unverified: physical camera/barcode permissions, real GPS route, native filesystem/share/print, store sandbox purchase and hosted Supabase/Auth/email/OpenAI. Native export is not a device run. Billing remains dormant preparation; purchase reconciliation, authenticated identity linking, durable paid jobs and a verified balance endpoint still require implementation/configuration before charging. The app has no fake credit grant or live billing route.
