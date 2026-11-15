# Hosted analysis client preparation

Hosted analysis is disabled in the production EAS profile. The existing local preview keeps its five tabs. Enabling hosted analysis adds Analyze independently; it does not enable the laptop-backed Coach screen.

The separate `analysis-validation` profile extends production with hosted analysis enabled, the verified Cloud Run URL, the `preview` EAS environment and the pinned `macos-tahoe-26.5-xcode-26.6` image. It is a four-tab native validation build, not the final five-tab public release. Default production remains unchanged.

Firebase iOS registration, anonymous Auth, App Attest registration and the real plist are configured. `BREAKAWAY_FIREBASE_IOS_CONFIG` is a sensitive file variable in this project's EAS preview environment. It contains Firebase client configuration, not a Gemini/provider credential. Local EAS commands must also receive the local path while evaluating app config:

```sh
BREAKAWAY_FIREBASE_IOS_CONFIG=./GoogleService-Info.plist npx eas-cli@27.5.0 config --platform ios --profile analysis-validation --json
```

An isolated iOS prebuild passed using the real plist: generated native files initialize App Check before Firebase, use dynamic frameworks and include the production App Attest entitlement. EAS has an active distribution certificate and existing provisioning profile; the build must synchronize App Attest capability and refresh provisioning if required. Signing and physical-device attestation have not yet been verified for this new profile.

The native iPhone implementation uses React Native Firebase 27.1.1, persistent anonymous Firebase Auth and App Attest. No developer pairing, laptop URL, shared bearer or provider API key authorizes hosted requests. Expo Go and Android cannot use this initial hosted identity path. Native verification errors leave the video available locally.

## Build prerequisites

1. Complete Firebase terms/project registration, enable anonymous Auth and register the iOS app `com.sprymosquito630.breakaway` with Apple team `23C48WC9WF`.
2. Register App Attest in Firebase and enable the Apple App Attest capability/provisioning entitlement. Obtain the real `GoogleService-Info.plist`; set `BREAKAWAY_FIREBASE_IOS_CONFIG` to its path (or EAS file variable).
3. Verify the deployed HTTPS endpoint. Its `/health` must identify `hosted: true` and `authentication: "firebase"` before the client accepts it. Set `EXPO_PUBLIC_HOSTED_ANALYSIS_URL` and explicitly set `EXPO_PUBLIC_HOSTED_ANALYSIS_ENABLED=true` in a reviewed build profile. Keep developer/local preview flags disabled for that release.
4. Build with Node 24.12+, Xcode 26.2+ and the generated native Firebase plugins. RNFirebase 27 requires dynamic iOS frameworks; the conditional app config provides this. Existing local-only builds exclude Firebase from native autolinking and from the JavaScript native identity module.
5. Verify real-device App Attest, anonymous identity persistence, a real clip, quota rejection, cancellation and retry before enabling a public release. This work has not verified a signed native build or device attestation.

Uploads use Expo binary multipart with a 25 MiB, 30-second client bound, Firebase ID token, App Check token and an operation UUID. Retries of the same clip and mode reuse that UUID while the review screen remains mounted; the pose fallback has a separate UUID. Unmounting the screen starts a new review lifetime. The client never automatically replaces a UUID after a 409; server error messages remain visible. After an expired cached result (410), reopen the clip to deliberately begin a new review.

Firebase App Check token refresh starts only when hosted analysis is requested. The native Firebase SDK retains its anonymous identity across app launches. A normal app data reset does not delete that server identity or reset daily quotas.

Firebase may remove inactive anonymous users after 30 days. The client recovers a deleted/expired anonymous identity once, sharing sign-in across concurrent requests. Network errors, disabled users, failed attestation and verified-account failures never recreate an identity.
