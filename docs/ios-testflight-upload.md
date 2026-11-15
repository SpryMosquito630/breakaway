# iOS TestFlight upload

The `production` profile in `eas.json` creates a store-signed build with experimental developer features disabled. Uploading that build to App Store Connect makes it available for TestFlight processing; public App Store review and release are separate actions.

## Current setup

- App: Breakaway, version `1.0.0`, Expo SDK 58.
- Expo CLI authentication verified for `sprymosquito630`.
- EAS project: [`@sprymosquito630/breakaway`](https://expo.dev/accounts/sprymosquito630/projects/breakaway), project ID `d37a05e8-b275-42ad-8519-57ec26d88e7d`.
- iOS bundle identifier `com.sprymosquito630.breakaway` is registered as Breakaway in Apple Developer team `23C48WC9WF`.
- App Store Connect record: [Breakaway: Soccer Training](https://appstoreconnect.apple.com/apps/6832437565/testflight/ios), Apple ID `6832437565`, SKU `breakaway-ios`, primary language English (U.S.). The display name includes “Soccer Training” because “Breakaway” alone was unavailable. The app's installed display name remains Breakaway.
- Existing local provisioning profiles identify Apple Developer team `23C48WC9WF` (David Tian). Verify the selected team during Apple authentication.
- The Account Holder accepted the updated Apple Developer Program License Agreement directly; the agreement banner cleared on App Store Connect.
- Expo Free quota was checked on November 8, 2026: 0 of 15 iOS builds used, with no current charges. No plan purchase is needed for this build.
- The EAS production environment currently has no configured variables. The app uses its offline defaults for unconfigured connected services; developer features are disabled by the build profile.
- iOS JavaScript export succeeded (3,280 modules, 54 assets). This verifies bundling, not a native archive or physical-device behavior.
- `expo-doctor` passed all 20 checks, and the resolved EAS production configuration uses the intended project, bundle identifier, store distribution, and disabled developer features.
- Xcode 26.6 is installed at `/Applications/Xcode.app`. The global active developer directory points to Command Line Tools; use the override below for local Xcode commands.

## Signing and submission configuration

1. The bundle identifier is already registered in verified Apple team `23C48WC9WF`. Do not use another app's identifier.
2. The repository is already associated with the EAS project above; do not initialize another project.
3. The matching App Store Connect record is created, and `submit.production.ios.ascAppId` is set to `6832437565`. Do not create another record.
4. Apple authentication is complete: the account owner entered two-factor verification directly in their own terminal, and EAS restored that local session with the correct team. EAS uses the existing team distribution certificate and an active Breakaway App Store provisioning profile (`V36DN8663B`), expiring July 2, 2027. No existing certificates were revoked.
5. The existing team's App Store Connect API key is assigned to Breakaway for EAS Submit. Private key material remains in the EAS credentials service, outside source control. Never send passwords, codes, cookies, or private keys in chat or commit them.

## App Store candidate: build 5

- Final EAS production build: [`81025a24-0800-4864-bb95-6e281b8d9eab`](https://expo.dev/accounts/sprymosquito630/projects/breakaway/builds/81025a24-0800-4864-bb95-6e281b8d9eab), version `1.0.0 (5)`, source `012ad4baf1a1dcc35d3f9e431e7f1fd7c4aa1ee7`. Native archive/signing/export finished successfully. This includes always-visible support/privacy links, explicit recovery-backup deletion on confirmed Reset, a concurrent load/retry reset guard, and theme-aware native-stack status-bar styling.
- Exact-build EAS submission: [`86784a70-0a22-4417-a78c-acd3c67bb806`](https://expo.dev/accounts/sprymosquito630/projects/breakaway/submissions/86784a70-0a22-4417-a78c-acd3c67bb806). Scheduled with `--no-auto-testflight-setup`. Apple App Store Connect API confirms build 5 is `VALID`, internal `READY_FOR_BETA_TESTING`, external `READY_FOR_BETA_SUBMISSION`, matched to the exact EAS build ID. No export-compliance blocker is reported.
- Downloaded signed IPA verified bundle `com.sprymosquito630.breakaway`, version/build `1.0.0 (5)`, minimum iOS `16.4`, `ITSAppUsesNonExemptEncryption: false`, and `UIViewControllerBasedStatusBarAppearance: true`. Both public support/privacy URLs and reset-guard text are present in the Hermes bundle; disabled membership implementation text is absent. IPA is 32,544,408 bytes; Hermes bundle is 5,211,692 bytes. EAS used the production profile with developer features false and no production service environment variables.
- Validation: all 197 tests and TypeScript passed for the privacy/reset changes; final status-bar option changes passed TypeScript, formatting and diff checks. Prior production iOS export passed. A new native archive succeeded for the final source. Final build-5 native Simulator review subsequently confirmed readable Dark status-bar icons and visible Privacy policy/Support controls. These checks do not replace physical-device testing.
- Previous build 4: [`1cbbbec7-98d7-414c-b350-e4c9024d0241`](https://expo.dev/accounts/sprymosquito630/projects/breakaway/builds/1cbbbec7-98d7-414c-b350-e4c9024d0241), source `ad52875b250d171edf8523f926a45a432b1c6b32`, submission [`2ca9c270-7618-40fd-8256-3ba4ab737385`](https://expo.dev/accounts/sprymosquito630/projects/breakaway/submissions/2ca9c270-7618-40fd-8256-3ba4ab737385). Apple confirms VALID / READY_FOR_BETA_TESTING / READY_FOR_BETA_SUBMISSION. It lacks the final native-stack status-bar fix and must not be selected for public review.
- The user explicitly approved publishing the privacy information. The main agent published Data Not Collected and the policy URL through App Store Connect, then verified the Published confirmation. Screenshot evidence: `outputs/breakaway-privacy-published.png` (external task output).
- The final build 5 (Apple build UUID `5e2077bd-f728-48fe-a4ed-6bfda087fefc`) is selected on the App Store version and the version Save completed. Pricing is free, availability is United States only (1 available / 174 not available), and Mac/Vision distribution is unchecked and saved. Manual release is selected. Listing metadata and private review-contact fields are saved.
- Five final build-5 Dark screenshots (1206 × 2622, sRGB RGB PNG without alpha) are uploaded and persist after page reload (5 / 10 slots). They show truthful zero history/assessments. Screenshot processing finished and Add for Review validation passed. External capture evidence: `outputs/app-store/capture-validation-dark.json` and the five files in `outputs/app-store/iphone-dynamic-island-medium-dark/`.
- Public App Review was submitted successfully: “1 Item Submitted,” with review detail verified Waiting for Review for iOS `1.0.0 (5)`. Submission [`33ec25eb-a4bd-453d-a645-5e781bb2789f`](https://appstoreconnect.apple.com/apps/6832437565/distribution/reviewsubmissions/details/33ec25eb-a4bd-453d-a645-5e781bb2789f). External proof: `outputs/breakaway-app-review-submitted.png`. Manual release remains selected. The app is not approved or released.

## Earlier TestFlight build 3

- Successful EAS build: [`553ca21d-ad95-49f4-9a4d-c13c8365ae8d`](https://expo.dev/accounts/sprymosquito630/projects/breakaway/builds/553ca21d-ad95-49f4-9a4d-c13c8365ae8d).
- Version/build: `1.0.0 (3)`, iOS production, source commit `9b7d6b104a18986a49e03858855a087630084f7c`. This includes the reviewed onboarding footer, measurement picker, comparison layout, and player-card rotation fixes.
- Submission: [`66caa300-3e46-43fd-8afd-1b4a6106ec30`](https://expo.dev/accounts/sprymosquito630/projects/breakaway/submissions/66caa300-3e46-43fd-8afd-1b4a6106ec30). Apple accepted and processed build 3 successfully: App Store Connect API confirms `VALID`, internal state `READY_FOR_BETA_TESTING`, and external state `READY_FOR_BETA_SUBMISSION`, with no export-compliance blocker. Automatic TestFlight group setup was disabled during submission.
- The signed IPA's metadata verifies the intended bundle, version/build, and `ITSAppUsesNonExemptEncryption: false`.
- App Store Connect UI confirms the private internal group `Personal testing` contains only build `1.0.0 (3)` (Ready to Test) and the single signed-in account authorized by the user. Its tester status is Invited; the group shows 1 tester and 1 build. Automatic distribution is off. No external testers or public link were added.
- Combined validation before build 3: typecheck, formatting, all 193 tests, and `git diff --check` passed. Browser review covered all 39 onboarding steps. Native Simulator checks covered measurement-wheel selection/drag and card front/edge/back rotation with finish changes that keep the card front-facing; original profile data was preserved. These checks do not measure on-device frame performance.
- Previous build 2: [`19204529-b22f-41c4-8bc5-9ed794b98c8e`](https://expo.dev/accounts/sprymosquito630/projects/breakaway/builds/19204529-b22f-41c4-8bc5-9ed794b98c8e), source `7ff5dcb`, submission [`6bfb61b2-533c-413e-808e-041448a0e7bf`](https://expo.dev/accounts/sprymosquito630/projects/breakaway/submissions/6bfb61b2-533c-413e-808e-041448a0e7bf). Apple processing is `VALID` and internal state is `READY_FOR_BETA_TESTING` after manual export-compliance completion. It predates the onboarding fixes in build 3.
- Failed build 1: [`b50b9698-27d1-4f63-ba44-ccf0b565c570`](https://expo.dev/accounts/sprymosquito630/projects/breakaway/builds/b50b9698-27d1-4f63-ba44-ccf0b565c570), source `2ae1afd`. CocoaPods could not resolve `PurchasesHybridCommon (= 20.4.0)` required by `react-native-purchases@11.0.1`; its CDN podspec returned HTTP 404. No IPA was produced or submitted.
- The successful build pins `react-native-purchases@10.16.0`, following [RevenueCat's Expo guidance](https://github.com/RevenueCat/react-native-purchases/releases/tag/11.0.0). Its required `PurchasesHybridCommon@19.17.0` and transitive `RevenueCat@5.99.0` podspecs are both published (HTTP 200). After the dependency change, typecheck, 193 tests, formatting, iOS export, and all 20 Expo Doctor checks passed. Native dependency installation, Xcode archive, signing, and IPA export then passed on EAS.
- Build 2 does not embed `ITSAppUsesNonExemptEncryption`; its export-compliance answers were completed in App Store Connect after reviewing the app's OS-provided encryption and HTTPS usage. `app.json` now sets `ITSAppUsesNonExemptEncryption: false` for subsequent builds, consistent with that declaration.

## Build and upload

Confirm available build quota and any cost before starting a remote build. Do not purchase or change plans automatically.

```sh
npx eas-cli@27.5.0 build --platform ios --profile production
```

Record the resulting build ID. Submit that specific verified build, so an unrelated latest build cannot be selected:

```sh
npx eas-cli@27.5.0 submit --platform ios --profile production --id <verified-build-id> --no-auto-testflight-setup
```

For a local build instead, first verify CocoaPods, Fastlane and the remaining local build prerequisites:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer npx eas-cli@27.5.0 build --platform ios --profile production --local
```

Upload completes only when App Store Connect has received and processed the build. Check TestFlight for any processing, export-compliance or tester-access requirements. Do not submit for public review or enable automatic release as part of this workflow.

## Validation before wider distribution

Complete the physical-device checks in `docs/release-hardening.md`, especially audio under the silent switch, notification permission changes, lock/app-switch/force-quit behavior and notification cancellation. Existing production exports do not establish physical-device behavior. Coach content review and privacy/listing work remain separate requirements for a public launch.

Before enabling developer video-capture routes in a future build, fix their microphone permission configuration: the signed IPA lacks `NSMicrophoneUsageDescription` because the later `expo-camera` plugin disables microphone permission. Replay and PoseReview routes are guarded by `DEVELOPER_FEATURES` in `App.tsx` and are unavailable in this production build.

References: [Expo iOS submission](https://docs.expo.dev/submit/ios/), [Expo managed credentials](https://docs.expo.dev/app-signing/managed-credentials/), [Apple build uploads](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds).
