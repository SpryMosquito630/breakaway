# Hosted analysis deployment record

Verified November 15, 2026. The cloud service and Firebase app are configured, but **video analysis remains deliberately disabled for users** pending controlled native validation. No Gemini generation request was made during this deployment.

## Resources

| Item | Deployed value |
| --- | --- |
| Google Cloud project | `breakaway-analysis-2026-1115` |
| Project name / number | Breakaway Analysis / `467843664681` |
| Region | `us-west1` |
| Cloud Run service | `breakaway-analysis` |
| Service URL | [Breakaway analysis service](https://breakaway-analysis-467843664681.us-west1.run.app) |
| Revision | `breakaway-analysis-00002-974` |
| Cloud Build | `195318a4-d440-450c-a958-a3f64b459352` — succeeded in 2m20s |
| Image tag | `us-west1-docker.pkg.dev/breakaway-analysis-2026-1115/analysis/worker:beta-20261115-1` |
| Image digest | `sha256:f491693233ef5eb4a0003687c35b8e9ff35f32e97ce1159e2c9797a3e415325e` |
| Gemini model | `gemini-3.8-flash` |
| Provider credential | Server-only Secret Manager `breakaway-gemini-key`, pinned version `1` |
| Firestore | Native mode, regional `us-west1` |
| Firebase iOS app | `1:467843664681:ios:78f31ff711e878b7198538` |

This is a separate project associated with the owner-approved billing account. Existing Pace resources and the previous Gemini credential were left unchanged. The newly provisioned Gemini key is restricted to the Generative Language API in the Breakaway project. A model-metadata GET returned 200 and confirmed `generateContent` support; no billed generation was requested. Cloud hosting, builds, database/auth operations and eventual provider use can incur charges.

## Verified behavior and limits

- Public `GET /health` returned 200 with `hosted:true`, `authentication:"firebase"`, and `available:false`, `authReady:false`, `jointViewAvailable:false`, `shotReviewAvailable:false`.
- Unauthenticated `POST /shot-review` and `/pose` returned 503 `service_unavailable`. The `HOSTED_AUTH_READY=false` gate stops processing before identity verification, quota reservation or provider dispatch. This is the expected setup state, not evidence that normal-user analysis is ready.
- Runtime configuration was inspected: one CPU, 2 GiB memory, concurrency one, request timeout 120 seconds, minimum zero and both service/revision maximum one instance. Media subprocesses are limited to 90 seconds. Upload limits are 25 MiB and 30 seconds.
- Durable daily limits are two operations per identity and ten operations globally, counting pose and technique operations. Unknown/timeout outcomes retain their reservation; a retry cannot silently dispatch another provider request.
- The runtime uses the dedicated `breakaway-analysis` service account with Firestore and Firebase Auth read permissions and secret-scoped access to the pinned provider credential. No client receives the provider key or runtime credentials.

Cloud Build uploaded exactly 17 allowlisted source/config files, approximately 63 KiB, from a fresh temporary context. No repository `work/` directory, `.env`, private invitations, credentials, attachments, user clips or unrelated duplicate files were uploaded. The build successfully imported actual OpenCV/MediaPipe native dependencies and verified the downloaded pose model checksum.

## Persistence, retention and checks

The backend stores completed results separately from request tombstones. Result access expires after 24 hours, request tombstones after 48 hours, and hashed daily usage records after seven days. Firestore TTL policies on `expires_at` were confirmed **ACTIVE** for `analysis_results`, `analysis_jobs`, and `analysis_usage`. Physical deletion is asynchronous; the API independently denies expired result access. Deny-all Firestore client rules were deployed and their active release/source verified; an unauthenticated database read returned 403.

Twelve offline hosted tests passed, including the real ledger adapter against a transactional fake, parallel global quota, cached replay, conflicting requests, result expiration, authentication/App Check denial, database outage, upload bounds, temporary-file deletion and the strict build manifest. Existing client tests and CI passed separately.

An additional real Firestore integration used temporary verification-prefixed collections under owner OAuth identity. Atomic reservation, completed-result replay and four concurrent users competing for two remaining global slots all passed. All eight synthetic verification documents were deleted. Production analysis collections and daily counters were not used. Service-account impersonation could not obtain a token, and its temporary grants were removed. Runtime permissions were then independently verified by a one-task, zero-retry Cloud Run job using the deployed image and the actual runtime service account, without a Gemini secret. That job successfully created/read/deleted one synthetic Firestore document and confirmed Firebase Auth lookup permission using a nonexistent synthetic identifier. Execution `breakaway-runtime-verification-6r5m9` completed successfully; its temporary job was deleted afterward. No real user records were read.

During API-key creation, the CLI unexpectedly emitted the newly created key in its operation output despite a restricted output format. That key was immediately revoked and its deletion metadata confirmed. It was never stored as the runtime secret. A replacement was created with both output streams captured and transferred directly into Secret Manager version 1 without logging its value. The original existing key was not modified.

## Remaining release gates

1. Firebase project/app registration, Anonymous Auth, eligible anonymous-account cleanup and App Attest configuration are now verified at the configuration layer. No guest accounts were created by these deployment checks. The registered iOS app ID is allowlisted on the backend. These configuration checks do not prove native attestation works.
2. Backend prerequisites are verified: deny-all Firestore client rules, all three active TTL policies, and actual runtime service-account Firestore/Auth permissions.
3. Complete the signed native Firebase/Auth/App Check integration. After the prerequisite backend checks pass, the owner may enable `HOSTED_AUTH_READY` for controlled native validation while keeping the production client feature flag disabled. Test real token restoration, anonymous identity plus attestation, expired/wrong-app denial, and retry/idempotency on a physical device. Expo Go cannot establish the final production attestation path. Enabling protected validation is separate from releasing the feature publicly.
4. Update user-facing privacy disclosures for Google Cloud processing, sampled frames sent to Gemini, anonymous identifiers and temporary result retention. Review owner billing alerts/provider quotas.
5. Run one explicitly bounded licensed-fixture provider check through verified identity after protected validation is enabled. Expose the feature to normal users only after the remaining gates pass.

Operational details and the plan-first deployment command are in [the hosted backend README](../tools/hosted_analysis/README.md).
