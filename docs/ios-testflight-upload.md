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

## Current build and submission

- Successful EAS build: [`19204529-b22f-41c4-8bc5-9ed794b98c8e`](https://expo.dev/accounts/sprymosquito630/projects/breakaway/builds/19204529-b22f-41c4-8bc5-9ed794b98c8e).
- Version/build: `1.0.0 (2)`, iOS production, source commit `7ff5dcb9daa06dadfc1ee16adae72f334632c304`.
- Submission: [`6bfb61b2-533c-413e-808e-041448a0e7bf`](https://expo.dev/accounts/sprymosquito630/projects/breakaway/submissions/6bfb61b2-533c-413e-808e-041448a0e7bf). Apple accepted the upload on November 8, 2026 (Pacific). After the export-compliance answers were saved, App Store Connect API confirms build `1.0.0 (2)` has processing state `VALID`, internal state `READY_FOR_BETA_TESTING`, and external state `READY_FOR_BETA_SUBMISSION`.
- The signed IPA's metadata verifies the intended bundle, installed name Breakaway, version/build, iPhone-only support, and minimum iOS 16.4.
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
