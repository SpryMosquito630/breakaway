# Hosted analysis client preparation

Hosted analysis is disabled in the production EAS profile. The existing local preview keeps its five tabs. Enabling hosted analysis adds Analyze independently; it does not enable the laptop-backed Coach screen.

The separate `analysis-validation` profile extends production with hosted analysis enabled, the verified Cloud Run URL, the `preview` EAS environment and the pinned `macos-tahoe-26.5-xcode-26.6` image. It is a four-tab native validation build, not the final five-tab public release. Default production remains unchanged.

Firebase iOS registration, anonymous Auth, App Attest registration and the real plist are configured. `BREAKAWAY_FIREBASE_IOS_CONFIG` is a sensitive file variable in this project's EAS preview environment. It contains Firebase client configuration, not a Gemini/provider credential. Local EAS commands must also receive the local path while evaluating app config:

```sh
BREAKAWAY_FIREBASE_IOS_CONFIG=./GoogleService-Info.plist npx eas-cli@27.5.0 config --platform ios --profile analysis-validation --json
```

An isolated iOS prebuild passed using the real plist: generated native files initialize App Check before Firebase, use dynamic frameworks and include the production App Attest entitlement. The signed validation build then passed native archive, signing and IPA export. EAS enabled the Apple App Attest capability and generated active provisioning profile `Q2U37W8S43`, keeping the existing distribution certificate.

[Build 6](https://expo.dev/accounts/sprymosquito630/projects/breakaway/builds/453ba42f-3669-48b9-b615-1fb2c0bfc2f7) finished successfully from `4aabb9939d0ce0c713150044e466b95d065b8907`. Inspection of the downloaded IPA verified signed App Attest environment `production`, a matching embedded profile that allows production, team `23C48WC9WF`, the expected bundle identifier, version `1.0.0 (6)` and the registered Firebase app ID. IPA SHA-256: `6029d06789868385c942d1a67c9875036146aafbbe1d4bb5c9504e8cf406594e`.

[Submission 87e79185-b470-49b4-bc32-4a3faa4b6df0](https://expo.dev/accounts/sprymosquito630/projects/breakaway/submissions/87e79185-b470-49b4-bc32-4a3faa4b6df0) successfully uploaded build 6 to App Store Connect on November 15, 2026 using the existing ASC API key and `--no-auto-testflight-setup`. Apple API verified `VALID` and internal `READY_FOR_BETA_TESTING`, but build 6 remains unassigned. The private Personal testing group still has one existing owner tester and only build 3. No public App Review/release or tester changes were requested. Physical-device attestation and the complete iPhone analysis flow remain unverified.

**Do not distribute build 6:** subsequent inspection of its actual IPA found `NSMicrophoneUsageDescription` absent. Camera and photo-library descriptions are present, but the recording path does not meet its native microphone permission requirement. No physical recording or crash behavior was tested. Both `expo-camera` and `expo-audio` had microphone permission disabled; overriding only the camera plugin still failed actual native prebuild verification.

The next build sets the hosted recording description on both plugins, leaving default production options unchanged. An isolated prebuild using the real Firebase plist verified microphone, camera and photo descriptions, dynamic frameworks and production App Attest. A regression test generates actual hosted and default iOS native projects: hosted microphone description must be present, and default production must retain its absent microphone description. The replacement signed IPA still needs inspection before distribution.

The native iPhone implementation uses React Native Firebase 27.1.1, persistent anonymous Firebase Auth and App Attest. No developer pairing, laptop URL, shared bearer or provider API key authorizes hosted requests. Expo Go and Android cannot use this initial hosted identity path. Native verification errors leave the video available locally.

## Build prerequisites

1. Complete Firebase terms/project registration, enable anonymous Auth and register the iOS app `com.sprymosquito630.breakaway` with Apple team `23C48WC9WF`.
2. Register App Attest in Firebase and enable the Apple App Attest capability/provisioning entitlement. Obtain the real `GoogleService-Info.plist`; set `BREAKAWAY_FIREBASE_IOS_CONFIG` to its path (or EAS file variable).
3. Verify the deployed HTTPS endpoint. Its `/health` must identify `hosted: true` and `authentication: "firebase"` before the client accepts it. Set `EXPO_PUBLIC_HOSTED_ANALYSIS_URL` and explicitly set `EXPO_PUBLIC_HOSTED_ANALYSIS_ENABLED=true` in a reviewed build profile. Keep developer/local preview flags disabled for that release.
4. Build with Node 24.12+, Xcode 26.2+ and the generated native Firebase plugins. RNFirebase 27 requires dynamic iOS frameworks; the conditional app config provides this. Existing local-only builds exclude Firebase from native autolinking and from the JavaScript native identity module.
5. Verify real-device App Attest, anonymous identity persistence, a real clip, quota rejection, cancellation and retry before enabling a public release. The signed native build passed; device attestation remains unverified.

Uploads use Expo binary multipart with a 25 MiB, 30-second client bound, Firebase ID token, App Check token and an operation UUID. Retries of the same clip and mode reuse that UUID while the review screen remains mounted; the pose fallback has a separate UUID. Unmounting the screen starts a new review lifetime. The client never automatically replaces a UUID after a 409; server error messages remain visible. After an expired cached result (410), reopen the clip to deliberately begin a new review.

Firebase App Check token refresh starts only when hosted analysis is requested. The native Firebase SDK retains its anonymous identity across app launches. A normal app data reset does not delete that server identity or reset daily quotas.

Build 6 was started from `4aabb99`. Its picker still displays the local 50 MB hint, but its hosted upload guard enforces 25 MiB. The replacement source also uses 25 MiB for the hosted picker hint and initial size check. Keep build 6 unassigned because of its missing recording permission.

Firebase may remove eligible anonymous users any time after 30 days from creation. The client recovers a deleted/expired anonymous identity once, sharing sign-in across concurrent requests. Network errors, disabled users, failed attestation and verified-account failures never recreate an identity.

## Build 6 toolchain observations

The cold SwiftPM resolution took about 26 minutes. The actual preliminary command used `xcodebuild -resolvePackageDependencies ... -derivedDataPath ./build` from the iOS directory; native logs reference checkouts under `/Users/expo/workingdir/build/ios/build/SourcePackages/checkouts/`. The build eventually succeeded without an SDK downgrade or transport override. Global SwiftPM cache paths were not exposed in the logs. Future explicit clone/cache paths must be checked against the actual resolve command and successful EAS cache-save logs.

Cloud Expo Doctor reported 19/20 checks: its only warning concerned the app.json/app.config.js static-config relationship. The configuration explicitly uses app.json values. A standard `context.config` callback tested in an isolated checkout passed 20/20 checks, but that follow-up is not part of build 6.

Build 7 attempted `GYM_USE_SYSTEM_SCM=true`, `GYM_CLONED_SOURCE_PACKAGES_PATH=.swiftpm-cache/source-packages` and `GYM_PACKAGE_CACHE_PATH=.swiftpm-cache/package-cache`, with EAS custom caching of `ios/.swiftpm-cache`. The actual preliminary resolve command contained all three options, but returned an empty package graph in about two seconds; archive then failed with missing FirebaseCore/Auth/AppCheck/Installations products. The cache was a miss. No IPA was produced or submitted. [Fastlane's command generator](https://github.com/fastlane/fastlane/blob/2.236.1/fastlane_core/lib/fastlane_core/project.rb) confirms those flags affect preliminary resolution, not only archive.

The replacement profile removes all three GYM options and the custom cache block, restoring Build 6's successful resolver configuration with its default `-derivedDataPath ./build` behavior. Microphone/context.config/25 MiB fixes, SDK versions and dynamic frameworks remain in place. The exact optimization responsible for the empty graph is not isolated; no further cache/path changes are part of this correction. A cold Firebase fetch may again take about 26 minutes. [EAS custom caching](https://docs.expo.dev/build-reference/caching/) saves only after successful builds, so the failed Build 7 did not warm that attempted cache.


## Verified owner validation build 8

[Build 8](https://expo.dev/accounts/sprymosquito630/projects/breakaway/builds/0ea7b09c-52ef-4221-aa4f-4f02aa6659b8) succeeded from `1147e3199857f6313b7b46357c208acc047623f3`, version `1.0.0 (8)`, using the restored default resolver. The package graph was nonempty and native archive/export succeeded. Inspection of the actual IPA independently confirmed microphone/camera/photo descriptions, matching bundle/team/Firebase app ID, signed App Attest `production`, and an embedded profile permitting production. Deep strict code-signature verification returned zero. SHA-256: `342ee476706be64f135cab3ee0b92be4991689ef472f82bbd249a8251627001f`.

The owner required fresh approval for future native builds and TestFlight uploads. Build 8 was already running when that instruction arrived; it was allowed to finish and was not uploaded automatically. After the signed artifact was verified, the owner explicitly approved uploading exactly build 8 and adding it to the existing private group for only the existing account. No further build is authorized by that approval.

[Submission 1182e596-4b57-47ad-a738-90800dd9c32c](https://expo.dev/accounts/sprymosquito630/projects/breakaway/submissions/1182e596-4b57-47ad-a738-90800dd9c32c) succeeded. Apple build `5b78ff84-2a58-4456-9558-e7794b8a58dc` became VALID and READY_FOR_BETA_TESTING. After reverifying the existing group had only the same owner, one relationship request added only build 8 (HTTP 204). Independent readback on November 15 at 21:19:33 UTC confirmed IN_BETA_TESTING and group builds `[8, 3]`, one tester, automatic access off and no public link. Build 6 remains unassigned; build 7 produced no IPA. No invitations, additional testers, public App Review submission or release were created.

The existing owner's invitation remains INVITED with no registered devices; the owner needs to accept Apple's existing invitation and install 1.0.0 (8). Physical-device anonymous authentication, App Attest, video recording and the full Analyze upload/overlay flow remain to be checked on that iPhone. Server Gemini generation and compatible pose-payload checks have passed separately; these do not replace the phone test.
