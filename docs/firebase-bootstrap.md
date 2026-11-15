# Breakaway Firebase bootstrap

Dedicated project: `breakaway-analysis-2026-1115` (`467843664681`). Do not use or modify the Pace project.

As of November 15, 2026, project creation and billing are confirmed. Firebase Management, Identity Toolkit, App Check, API Keys, and Cloud Resource Manager APIs are enabled. Identity Platform authentication was initialized and anonymous sign-in is enabled, verified from `projects/467843664681/config`. Automatic anonymous-account cleanup after 30 days is enabled and verified through the Identity Platform configuration API. Firebase iOS app `1:467843664681:ios:78f31ff711e878b7198538` is now registered; its validated public iOS configuration is at the repository root, `GoogleService-Info.plist`.

## Previous blocker and resolution

`projects.addFirebase` returned HTTP 403 `PERMISSION_DENIED` with the generic message “The caller does not have permission.” The signed-in Google account has the project Owner role, the cloud-platform OAuth scope, and all four required permissions passed `testIamPermissions`. Unaccepted Firebase Terms is an inference from those checks and the official troubleshooting documentation; a Terms prompt was not directly observed. Browser inspection was unavailable because the Chrome DevTools profile was already running.

After the account holder opened the Firebase console and reported no visible Terms prompt, a fresh project GET returned ACTIVE and an addFirebase retry returned ALREADY_EXISTS. Firebase was therefore already enabled; no legal acceptance action was performed by the agent. The earlier 403 no longer reproduced. Do not create another project. [Firebase troubleshooting](https://firebase.google.com/docs/projects/use-firebase-with-existing-cloud-project).

## Reproduce or verify setup

Run the non-mutating checks first:

```sh
python3 tools/bootstrap-breakaway-firebase.py
```

The authorized setup completed successfully using the following idempotent command:

```sh
python3 tools/bootstrap-breakaway-firebase.py --apply
```

The script only targets the project above. It obtains a gcloud access token in memory and never prints tokens or API key strings. It registers/reuses iOS bundle `com.sprymosquito630.breakaway`, Apple Team `23C48WC9WF`, and App Store Connect app `6832437565`; enables anonymous Auth with automatic account cleanup after 30 days; registers App Attest with a one-hour token lifetime; restricts the iOS Firebase client API key to that bundle and Auth/App Check/Installations APIs; and writes the public `GoogleService-Info.plist` at the repository root. It does not create an Apple private key, configure DeviceCheck, alter Gemini keys, or change Firestore client rules. Its final output includes the Firebase app ID to add to the Cloud Run backend’s allowed-app configuration.

## Native verification remains required

App Attest requires the Apple App ID capability and `com.apple.developer.devicecheck.appattest-environment` set to `production`. A fresh native build and real-device test must verify anonymous Auth and Firebase App Check token exchange followed by an authenticated backend request. Simulator attestation and Expo Go do not establish production readiness. [App Attest setup](https://firebase.google.com/docs/app-check/ios/app-attest-provider).

Validation so far: bootstrap script syntax check and live read-only billing/IAM checks passed. The mutating bootstrap subsequently passed. Independent GET checks verified app metadata, the App Attest one-hour lifetime, iOS API-key restrictions, enabled anonymous authentication, and automatic cleanup. Physical-device attestation remains unverified.

## Data retention and privacy before enabling guests

Automatic cleanup deletes eligible anonymous Auth accounts any time after 30 days from creation, not necessarily precisely on day 30. Linked accounts are excluded. It does not establish deletion of application records stored in Firestore. Backend records keyed by an anonymous UID need their own retention/deletion policy, and the app privacy disclosure must cover this anonymous identifier and the uploaded analysis data before guest analysis is enabled. The backend owner has been notified. [Anonymous account cleanup](https://firebase.google.com/docs/auth/ios/anonymous-auth#automatic_clean-up), [configuration field](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/Config).

## Registered native client

- Firebase app ID: `1:467843664681:ios:78f31ff711e878b7198538`.
- iOS bundle: `com.sprymosquito630.breakaway`; Apple Team: `23C48WC9WF`; App Store Connect: `6832437565`.
- App Attest token lifetime: `3600s`; no DeviceCheck provider or Apple private key was configured.
- The associated Firebase client key is restricted to that iOS bundle and Identity Toolkit, Secure Token, Firebase App Check, and Firebase Installations APIs. Gemini is excluded.
- Public configuration: `GoogleService-Info.plist`; use the EAS file variable `BREAKAWAY_FIREBASE_IOS_CONFIG` for the dedicated analysis-validation build when configured by the release owner. Ordinary production remains disabled for hosted analysis pending release validation.
