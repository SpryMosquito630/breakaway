# Breakaway App Store submission

Prepared November 8, 2026 for English (U.S.), version 1.0.0. App Store Connect app ID: `6832437565`. Version 1.0.0 (5) has been submitted to App Review and is Waiting for Review. It is not approved or released.

## Audited build and scope

Final candidate is `1.0.0 (5)`, source `012ad4baf1a1dcc35d3f9e431e7f1fd7c4aa1ee7`, EAS build [`81025a24-0800-4864-bb95-6e281b8d9eab`](https://expo.dev/accounts/sprymosquito630/projects/breakaway/builds/81025a24-0800-4864-bb95-6e281b8d9eab). Native archive/signing succeeded; exact upload [`86784a70-0a22-4417-a78c-acd3c67bb806`](https://expo.dev/accounts/sprymosquito630/projects/breakaway/submissions/86784a70-0a22-4417-a78c-acd3c67bb806) completed; Apple confirms build 5 is VALID / READY_FOR_BETA_TESTING / READY_FOR_BETA_SUBMISSION, matched to that exact EAS build ID. The signed IPA contains both policy/support URLs and the reset guard, version/build is correct, non-exempt encryption is false, and view-controller status-bar appearance is true. Build 5 includes the theme-aware native-stack status bar fix. Build 4 lacks that fix; earlier TestFlight build 3 also lacks the policy links/reset correction. Only build 5 is intended for public review. `eas.json` sets `EXPO_PUBLIC_DEVELOPER_FEATURES=false`. `App.tsx` gates experimental navigation; `metro.config.js` substitutes a disabled developer-screen barrel. The shipping app provides local training, drill instructions, timers, plans/playlists, assessments, practice progress and optional local reminders.

Accounts, community, cloud sync, AI analysis, replay capture, location tracking, food scanning, coach/team workspaces and membership are excluded from this shipping experience. Do not advertise them or declare data based on their source files alone. Supabase client creation is disabled by the feature gate; RevenueCat is dynamically initialized only from its disabled membership flow. No app analytics/crash-reporting service initialization was found. Bundled photos/videos work offline; opening source/license links hands off to the browser.

## Copy-ready listing

| Field | Value | Length |
| --- | --- | --- |
| Name | Breakaway: Soccer Training | 26 / 30 characters |
| Subtitle | Drills, plans & daily progress | 30 / 30 characters |
| Keywords | football,ball,control,dribbling,passing,shooting,practice,timer,skills,first,touch,planner | 90 / 100 ASCII bytes |
| Primary category | Sports | |
| Secondary category | Health & Fitness | Optional; reflects exercise practice |
| Copyright | 2026 David Tian | Owner confirmed by user |
| Support URL | https://sprymosquito630.github.io/breakaway-support/ | HTTP 200 verified |
| Privacy Policy URL | https://sprymosquito630.github.io/breakaway-support/privacy.html | HTTP 200 verified |
| Marketing URL | Leave blank unless a real product website exists | Optional |

Promotional text (157 / 170 characters):

Make time for your next touch. Build a soccer practice plan, follow clear drill instructions, and keep your training history in one place. No account needed.

Description:

Make your next soccer practice easier to start. Breakaway helps you choose a focus, follow a plan and keep a record of the work you put in.

A PLAN THAT FITS YOUR PRACTICE
Choose your training focus, available time, space and equipment. See the drills in your session before you begin, replace a drill when needed, and create custom drills and playlists.

CLEAR DRILL GUIDANCE
Explore 30 starter drills with written instructions and coaching prompts. Movement diagrams help explain setup and direction, and two bundled video examples show selected movements. Choose a difficulty and follow a timed practice block at your own pace.

PROGRESS YOU CAN LOOK BACK ON
Save completed sessions, record your own skill-test results, and follow your practice history, streaks and milestones. Practice XP reflects completed activity; skill ratings come from your recorded tests.

REMINDERS YOU CONTROL
Turn on optional local practice reminders and choose a time. During a session, you can also enable an end-of-block notification when you lock your phone or switch apps. Notification delivery follows your device settings.

YOUR TRAINING STAYS ON YOUR DEVICE
Start without an account. Your preferences, optional onboarding answers and practice history are saved locally. Clear saved training from Settings whenever you choose.

First-release notes, if requested by App Store Connect:

Welcome to Breakaway. Build a soccer practice plan, follow starter drills, save your sessions and track your own skill-test results. Optional local reminders help you make time to train.

## App Review information

Sign-in required: No. No review demo credentials are needed.

Copy-ready review notes:

Breakaway is an account-free, on-device soccer practice app. Complete the onboarding questions to create a local plan; optional questions can be skipped. No server connection, account, subscription or purchase is required to use the shipping training features.

After setup, the Train tab shows the current plan and its drills. Open a drill to view its written steps, movement guide and selected bundled examples; start practice to use its timer. Progress shows saved practice and self-reported skill-test results. Custom drills/playlists are available through the training planner.

Optional reminders can be enabled in Settings. Background practice is off by default; explicitly enabling it requests notification permission and provides an end-of-current-block alert. It does not automatically advance to another drill. Notification timing depends on iOS settings. Declining notifications does not prevent normal practice.

Training preferences, onboarding answers and progress are stored locally. Settings > Reset all data clears saved training on this device. There is no public sharing, user chat, AI analysis, cloud account or paid membership in this release. Photo/source credits are available with the relevant content; featured players are not affiliated with or endorsing Breakaway.

Review contact: use an actual reachable person's first/last name, email and phone number. Do not infer these from the developer-team name, git author or Expo handle. Main agent should inspect existing App Store Connect contact values before asking the owner.

## App Privacy assessment

Recommended disclosure for this exact shipping configuration: **Data Not Collected**, subject to confirming the actual production environment remains empty as recorded in `docs/ios-testflight-upload.md` and no third-party runtime collection is enabled outside this source configuration.

In build 3, Reset clears active training and reminders but a local recovery backup of a repaired save may remain. Submitted build 5 adds explicit recovery-backup deletion on Reset. Appearance preference remains as a nonpersonal display setting. Removing the app and its data through iOS removes its app storage; device backups follow device settings. No separate age-restriction marker survives Reset.

Local data includes training preferences, age range, name/club and other optional onboarding reflections, optional height/weight, practice history, skill-test results, custom drills and local reminder preferences. These stay in device storage; no account or collection endpoint is used by the shipping app. Optional local notifications do not require an app-owned remote push service. Do not request ATT because there is no tracking feature.

Apple excludes data processed only on device from its definition of collected data. Apple-operated data collection is separately handled by Apple. Browser destinations opened by a user have their own privacy practices. Avoid claiming that external websites never collect information.

## Age-rating answers

Use the current questionnaire and let Apple calculate the rating. Health or Wellness Topics: **Yes**, because soccer exercise recommendations are included; Apple's current global matrix associates this with 9+. Medical or Treatment Information: **None**. No parental controls or verified age-assurance mechanism; a self-declared age range is not identity or age verification.

No user-generated public content, chat, advertising, unrestricted embedded web access, violence, sexual content, profanity, substance references, gambling or loot boxes were found in shipping features. Personal practice badges are not competitive events between users; Contests: **None** appears appropriate. Fixed external source/license links do not provide an unrestricted in-app browser. Do not select Made for Kids based solely on the age-range onboarding question. Regional and older-OS ratings may differ.

## Submission status and remaining validation

1. **Privacy publication and final candidate.** Public support/policy pages are live and the final signed build 5 includes their Settings links, reset-backup removal and native status-bar correction. Apple processing has finished successfully; build 5 (Apple build UUID `5e2077bd-f728-48fe-a4ed-6bfda087fefc`) is selected on the version and the version Save completed. The user explicitly approved publication; the main agent published Data Not Collected and the policy URL through App Store Connect and verified its Published confirmation. Screenshot evidence is `outputs/breakaway-privacy-published.png` (external task output). Privacy publication is complete. Free pricing and United States-only availability are saved (1 available / 174 not available); Mac and Vision distribution are unchecked and saved. Manual release is selected. Metadata and private App Review fields are saved. Five final build-5 Dark screenshots are uploaded and persisted after page reload (5 / 10 slots); processing finished and Add for Review validation passed. The main agent submitted version 1.0.0 (5) to App Review and verified Waiting for Review.
2. **Support page and contact.** The live public support page uses dedicated GitHub Issues without publishing personal contact details. The user authorized using the existing private Apple account contact for App Review; verify the saved review-contact fields in App Store Connect.
3. **Rights-holder/contact values.** The user confirmed David Tian as the copyright holder and authorized using the existing private Apple account contact for App Review. Public support stays on the dedicated GitHub Issues page.
4. **Screenshots complete.** Five real build-5 Dark screenshots are uploaded and persisted after reload (5 / 10 slots). Processing finished and Add for Review validation passed. The 1206 × 2622 PNGs use sRGB RGB without alpha and show truthful zero-history/zero-assessment state. Final native Simulator review confirmed the Dark status bar is readable and Privacy policy/Support controls are present. External evidence: `outputs/app-store/capture-validation-dark.json` and `outputs/app-store/iphone-dynamic-island-medium-dark/01-train-medium.png` through `05-progress-medium.png`. Device support is iPhone only (`supportsTablet=false`).
5. **Physical-device validation.** Existing documentation still requires silent-switch timer audio, lock/app-switch/force-quit reconciliation, notification timing/cancellation and permission-revocation checks. TestFlight processing and Simulator checks do not establish these behaviors. Qualified coach review is still outstanding; the app describes the starter drills as illustrative.

The app's signed IPA contains dormant camera/photo/location permission descriptions from native plugins, but shipping routes do not request them. The missing microphone usage description remains irrelevant while video capture is inaccessible; do not enable developer capture without fixing it. Further public distribution may also require App Store Connect pricing, availability, content-rights, trader/compliance and agreement answers based on the owner's actual circumstances. Do not invent legal/trader status or expand territories without authorization.

## App Review submission

The main agent completed Submit for Review and verified “1 Item Submitted” followed by Waiting for Review for iOS `1.0.0 (5)`. Submission ID: `33ec25eb-a4bd-453d-a645-5e781bb2789f`. [Open the review submission](https://appstoreconnect.apple.com/apps/6832437565/distribution/reviewsubmissions/details/33ec25eb-a4bd-453d-a645-5e781bb2789f). External screenshot evidence: `outputs/breakaway-app-review-submitted.png`. Manual release remains selected, so App Store approval does not itself publish the app. No approval or public release is claimed.

## Evidence and official references

Source: `eas.json`, `metro.config.js`, `App.tsx`, `src/config/features.ts`, `src/connected/client.ts`, `src/billing/revenueCat.ts`, `src/screens/Settings.tsx`, `src/screens/Onboarding.tsx`, `src/screens/Progression.tsx`, `src/data/drill-demos.ts`, `assets/player-styles/LICENSE.md`, `docs/ios-testflight-upload.md`, `docs/implementation-status.md`, `docs/release-hardening.md`.

Official Apple sources checked November 8, 2026:

- [App Review Guidelines, including 5.1.1(i)](https://developer.apple.com/app-store/review/guidelines/)
- [App privacy details and definition of collection](https://developer.apple.com/app-store/app-privacy-details/)
- [Age-rating values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/)
- [App Store categories](https://developer.apple.com/app-store/categories/)

Verification performed for this submission: read-only route/service/data/permission audit; repository-wide URL/contact search; checked current HEAD's difference from build source; counted metadata character/byte limits. The app source changes passed TypeScript, all 197 tests, focused formatting checks and git diff --check. Public support/privacy URLs returned HTTP 200. No user profile was reset. Production builds 4 and 5 were created and exact-build uploads were scheduled using existing EAS/Apple signing. The user-approved privacy declaration is published. App Store Connect has build 5 selected, metadata saved, five final Dark screenshots uploaded, free United States-only availability and manual release configured. Final native Simulator checks passed for status-bar contrast and policy/support controls; physical-device limitations above remain. App Review submission is complete and the verified state is Waiting for Review; approval and release have not occurred. Manual release remains selected.
