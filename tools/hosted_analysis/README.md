# Hosted video analysis

This dedicated production API replaces laptop pairing with Firebase identity. It does not expose the development chat, food, pairing or invite routes. Provider credentials are supplied through a pinned Secret Manager version, never through Expo public variables. The runtime uses its Cloud Run service identity for Firebase Admin and Firestore.

The deployment is **not ready for users** until Firebase registration, native App Attest configuration, privacy disclosure, a signed app build and device verification are complete. `HOSTED_AUTH_READY` defaults false. In that state health reports `available:false`, `authReady:false`, and both capabilities false; uploads return 503 before identity or processing. Do not turn this flag on merely to make a preview appear connected.

## User experience and authentication

Ordinary users select a video and receive analysis without a laptop, private invitation, pairing code, or provider key. A native Firebase anonymous session can be created silently, but its ID token must be accompanied by a verified Firebase App Check token for an explicitly allowlisted app ID. This requires a signed native build and registered App Attest app; Expo Go is not a production attestation substitute. Verified email accounts are also supported. Anonymous tokens without attestation, wrong-app tokens, expired/revoked identity tokens and unverified email accounts cannot dispatch work.

The client first checks HTTPS `/health` for `hosted:true`, `authentication:"firebase"` and `available:true` before sending credentials. `POST /shot-review` and `/pose` accept one multipart `video`, `Authorization: Bearer <Firebase ID token>`, and `X-Request-ID: <UUIDv4>`. Anonymous requests also require `X-Firebase-AppCheck`. `X-Include-Pose: 1` requests combined tracking with technique. Successful responses use the existing ShotTechnique/JointResult shapes. Videos are limited to 25 MiB and 30 seconds. The lower hosted upload limit leaves room beneath Cloud Run's HTTP/1 32 MiB request limit.

The client must preserve the same request ID per selected clip and operation across retries. Shot review and pose use different IDs. A completed retry returns the stored result rather than another provider call; conflicting bytes/mode/pose flag return 409. A running or uncertain request returns 409. The client must not automatically replace its ID to bypass a failure or quota. A fresh explicit review can receive a new ID after the prior operation is terminal. Expired result retrieval returns 410.

## Cost, persistence and retention

Firestore transactions atomically claim a request and increment UTC daily counters before dispatch. Default limits are two operations per identity per day and ten total operations per day, including pose. Counts are server-controlled. A timeout/crash/unknown completion never releases quota or silently redispatches work. At-most-once dispatch is scoped to the 48-hour idempotency retention window; request IDs must not be intentionally reused after that window. Completed result and completion state commit in one batch. Database outages fail closed. This initial synchronous service does not provide automatic crash recovery; uncertain requests remain blocked and consume their budget.

Raw videos exist only in an isolated temporary directory during processing and are removed afterward. Downscaled frames are sent to Google Gemini for technique review. Tracking runs inside the Google Cloud service. Completed results, including estimated joints, are retained server-side for at most 24 hours plus Firestore's asynchronous deletion delay; expired results are denied immediately at read time. Request digests/status tombstones expire after 48 hours and hashed daily usage records after seven days. TTL is configured on `expires_at` for `analysis_results`, `analysis_jobs`, and `analysis_usage`. Client access to these collections is denied by `firestore.rules`; only the runtime IAM identity accesses them.

Cloud Run uses minimum zero, maximum one instance, one CPU, 2 GiB, concurrency one, and a 120-second request timeout. Media work runs in a subprocess capped at 90 seconds. These are resource and operation limits, not a guaranteed currency spending cap: inbound traffic, builds, storage, database/auth operations and provider calls can incur charges. Configure owner billing alerts and provider quota as an additional guard. If an existing Gemini key is reused, its provider billing remains with its original project; only a separately provisioned project-restricted key isolates Gemini billing into the new project. Never retire or modify unrelated keys.

## Build and deploy

`deploy.py` defaults to a reviewable plan. It requires an explicit project ID and verifies the project is named `Breakaway Analysis` before applying. It never relies on the active gcloud project. The example is intentionally fail closed:

```sh
python tools/hosted_analysis/deploy.py \
  --project YOUR_BREAKAWAY_PROJECT --model YOUR_REVIEWED_GEMINI_MODEL
```

Add `--apply` only for the authorized target. Provision the regional Firestore database, dedicated `breakaway-analysis` runtime service account, Artifact Registry `analysis` repository, and Secret Manager separately. Runtime needs project `roles/datastore.user`, `roles/firebaseauth.viewer`, and secret-scoped `roles/secretmanager.secretAccessor`. The dedicated `breakaway-build` service account needs repository-scoped `roles/artifactregistry.writer` and bucket-scoped `roles/storage.objectAdmin` plus `roles/storage.legacyBucketReader` on the private regional `PROJECT-build` source/log bucket. The script sets that build identity and both source/log paths explicitly. The frontend needs Firebase's public app configuration; it never receives the runtime or provider secret.

The build stages only an explicit list of source files into a new temporary directory, prints the exact manifest, and uploads that directory. It never submits the workspace. Ignored `work/`, `.env`, credentials, local videos, private invitations, duplicate files and user attachments are excluded by construction. The image downloads the checksum-verified public MediaPipe model at build time. `--auth-ready --app-id ... --secret-version N` is required to enable work after the release gates are verified; a pinned secret version avoids silently changing a running deployment's provider credential.

Before enabling users: deploy deny-all Firestore client rules; verify TTL policies; register Firebase iOS app/team/App Attest and Anonymous Auth; verify actual identity and App Check tokens from a signed physical device; update the app's privacy statement to disclose Google Cloud processing and temporary result retention; validate no-auth/wrong-app/quota/retry behavior against the deployed service; only then authorize one bounded public licensed fixture to verify the actual provider integration.

## Offline verification

```sh
python -m pip install -r tools/hosted_analysis/requirements.txt
python -m unittest discover -s tools/hosted_analysis -p test_hosted.py -v
```

These tests mock Firebase and media providers and exercise the actual Firestore ledger adapter against a transactional fake, including parallel reservations, global quota, read-before-write ordering, cached replay, conflicts, expiry, authentication/attestation, database outage, upload size, temporary-file deletion and the strict staged build manifest. They make no provider calls. A real Firestore transaction integration and signed native device check remain deployment verification requirements.

Official references reviewed for this implementation: [Cloud Run request limits](https://cloud.google.com/run/quotas), [Cloud Run timeouts](https://cloud.google.com/run/docs/configuring/request-timeout), [Secret Manager integration](https://cloud.google.com/run/docs/configuring/services/secrets), [Firebase identity token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [App Check custom backend verification](https://firebase.google.com/docs/app-check/custom-resource-backend), [Firestore transactions](https://cloud.google.com/firestore/native/docs/manage-data/transactions), [Gemini server key handling](https://ai.google.dev/gemini-api/docs/api-key).
