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

## Finish configuration

1. The bundle identifier is already registered in verified Apple team `23C48WC9WF`. Do not use another app's identifier.
2. The repository is already associated with the EAS project above; do not initialize another project.
3. The matching App Store Connect record is created, and `submit.production.ios.ascAppId` is set to `6832437565`. Do not create another record.
4. Run `npx eas-cli@27.5.0 credentials --platform ios` and select `production`. The saved Keychain password authenticated successfully, but a fresh two-factor verification is required. The account owner must enter the code directly in their own terminal. Never send passwords, codes, cookies, or private keys in chat or commit them. Configure a distribution certificate and App Store provisioning profile for Breakaway. A development certificate alone cannot sign this upload.
5. Configure submission authentication using the team's App Store Connect API key through EAS credentials. Keep private key material outside source control.

## Build and upload

Confirm available build quota and any cost before starting a remote build. Do not purchase or change plans automatically.

```sh
npx eas-cli@27.5.0 build --platform ios --profile production
```

Record the resulting build ID. Submit that specific verified build, so an unrelated latest build cannot be selected:

```sh
npx eas-cli@27.5.0 submit --platform ios --profile production --id <verified-build-id>
```

For a local build instead, first verify CocoaPods, Fastlane and the remaining local build prerequisites:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer npx eas-cli@27.5.0 build --platform ios --profile production --local
```

Upload completes only when App Store Connect has received and processed the build. Check TestFlight for any processing, export-compliance or tester-access requirements. Do not submit for public review or enable automatic release as part of this workflow.

## Validation before wider distribution

Complete the physical-device checks in `docs/release-hardening.md`, especially audio under the silent switch, notification permission changes, lock/app-switch/force-quit behavior and notification cancellation. Existing production exports do not establish physical-device behavior. Coach content review and privacy/listing work remain separate requirements for a public launch.

References: [Expo iOS submission](https://docs.expo.dev/submit/ios/), [Expo managed credentials](https://docs.expo.dev/app-signing/managed-credentials/), [Apple build uploads](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds).
