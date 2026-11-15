# Hosted analysis deployment record

Verified November 15, 2026. The **protected API is enabled for controlled owner TestFlight validation**. The ordinary production client feature remains disabled; no public App Store release was made in this deployment. Actual Gemini generation and pose-payload contract/alignment passed an admin-only licensed-fixture check after the owner selected the existing Gemini credential. The result appropriately withheld a technique score. Usable body landmarks and physical-device identity/attestation remain unverified.

## Resources

| Item | Deployed value |
| --- | --- |
| Google Cloud project | `breakaway-analysis-2026-1115` |
| Project name / number | Breakaway Analysis / `467843664681` |
| Region | `us-west1` |
| Cloud Run service | `breakaway-analysis` |
| Service URL | [Breakaway analysis service](https://breakaway-analysis-467843664681.us-west1.run.app) |
| Revision | `breakaway-analysis-00004-l4b` |
| Controlled-validation activation | November 15, 2026; `HOSTED_AUTH_READY=true` |
| Cloud Build | `195318a4-d440-450c-a958-a3f64b459352` — succeeded in 2m20s |
| Image tag | `us-west1-docker.pkg.dev/breakaway-analysis-2026-1115/analysis/worker:beta-20261115-1` |
| Image digest | `sha256:f491693233ef5eb4a0003687c35b8e9ff35f32e97ce1159e2c9797a3e415325e` |
| Gemini model | `gemini-3.8-flash` |
| Provider credential | Server-only Secret Manager `breakaway-gemini-key`, pinned version `2`; version `1` disabled, not destroyed |
| Firestore | Native mode, regional `us-west1` |
| Firebase iOS app | `1:467843664681:ios:78f31ff711e878b7198538` |

Cloud hosting, Firestore, identity and secret storage are in the separate Breakaway project associated with the owner-approved billing account. **Gemini usage now bills the existing credential's original provider project**, not the new Breakaway project. The owner explicitly selected that existing key after the newly provisioned key encountered a Prepay rejection. Its original value and configuration were left unchanged and copied in memory into Secret Manager version 2; the key's original project metadata was not independently readable (lookup returned 403). The unused version 1 is disabled but retained for audit; its session-created API key was revoked and deletion metadata confirmed. The original existing key and Firebase client key were not modified. Cloud hosting, builds, database/auth operations and provider use can incur charges.

## Verified behavior and limits

- After controlled-validation activation, public `GET /health` returned 200 with `hosted:true`, `authentication:"firebase"`, `available:true`, `authReady:true`, `jointViewAvailable:true` and `shotReviewAvailable:true`. Only the auth-readiness environment variable changed; the existing container image was reused.
- Missing-identity and invalid-JWT `POST` requests to both `/shot-review` and `/pose` returned 401 `auth_required`, before upload parsing, quota reservation or provider dispatch. Aggregate counts for production jobs, results and usage were zero before and after all four rejection checks. No generation request was made.
- The Firebase app-ID allowlist, service/revision instance maxima and daily operation limits were independently checked and preserved. The later owner-authorized credential update changed only the provider pin to Secret Manager version `2`, reusing the existing image.
- Runtime configuration was inspected: one CPU, 2 GiB memory, concurrency one, request timeout 120 seconds, minimum zero and both service/revision maximum one instance. Media subprocesses are limited to 90 seconds. Upload limits are 25 MiB and 30 seconds.
- Durable daily limits are two operations per identity and ten operations globally, counting pose and technique operations. Unknown/timeout outcomes retain their reservation; a retry cannot silently dispatch another provider request.
- The runtime uses the dedicated `breakaway-analysis` service account with Firestore and Firebase Auth read permissions and secret-scoped access to the pinned provider credential. No client receives the provider key or runtime credentials.

Cloud Build uploaded exactly 17 allowlisted source/config files, approximately 63 KiB, from a fresh temporary context. No repository `work/` directory, `.env`, private invitations, credentials, attachments, user clips or unrelated duplicate files were uploaded. The build successfully imported actual OpenCV/MediaPipe native dependencies and verified the downloaded pose model checksum.

## Persistence, retention and checks

The backend stores completed results separately from request tombstones. Result access expires after 24 hours, request tombstones after 48 hours, and hashed daily usage records after seven days. Firestore TTL policies on `expires_at` were confirmed **ACTIVE** for `analysis_results`, `analysis_jobs`, and `analysis_usage`. Physical deletion is asynchronous; the API independently denies expired result access. Deny-all Firestore client rules were deployed and their active release/source verified; an unauthenticated database read returned 403.

Twelve offline hosted tests passed, including the real ledger adapter against a transactional fake, parallel global quota, cached replay, conflicting requests, result expiration, authentication/App Check denial, database outage, upload bounds, temporary-file deletion and the strict build manifest. Existing client tests and CI passed separately.

An additional real Firestore integration used temporary verification-prefixed collections under owner OAuth identity. Atomic reservation, completed-result replay and four concurrent users competing for two remaining global slots all passed. All eight synthetic verification documents were deleted. Production analysis collections and daily counters were not used. Service-account impersonation could not obtain a token, and its temporary grants were removed. Runtime permissions were then independently verified by a one-task, zero-retry Cloud Run job using the deployed image and the actual runtime service account, without a Gemini secret. That job successfully created/read/deleted one synthetic Firestore document and confirmed Firebase Auth lookup permission using a nonexistent synthetic identifier. Execution `breakaway-runtime-verification-6r5m9` completed successfully; its temporary job was deleted afterward. No real user records were read.

During API-key creation, the CLI unexpectedly emitted the newly created key in its operation output despite a restricted output format. That key was immediately revoked and its deletion metadata confirmed. It was never stored as the runtime secret. A replacement was created with both output streams captured and transferred directly into Secret Manager version 1 without logging its value. The original existing key was not modified.

## Bounded provider verifications

An owner-authorized admin-only Cloud Run job used the existing deployed image, runtime service account and pinned secret version 1. Its only media input was a 2.8-second, 256 × 144, 5 fps excerpt of the repository's licensed `assets/drill-clips/wall-open-out.mp4` (5,737 bytes). No user video was accessed. The job had one task, zero automatic retries, and a 90-second media-worker bound. It committed a real Firestore reservation before the provider call.

The worker returned 503 `provider_unavailable`. Existing Cloud Monitoring `consumed_api` metrics independently identified exactly one `GenerateContent` request with the underlying **HTTP 402** response. Official [Gemini API error documentation](https://ai.google.dev/gemini-api/docs/generate-content/api-errors) maps 402 to unavailable/depleted Prepay credit; [billing documentation](https://ai.google.dev/gemini-api/docs/billing/) explains that attaching a Cloud Billing account alone may not establish an active positive Gemini Prepay balance. The precise AI Studio billing balance/setup has not been inspected, and no credits were purchased or auto-reload enabled.

Current diagnostic limitation: the deployed provider adapter collapses upstream HTTP/network failures into generic 503 `provider_unavailable`; operators may need provider request metrics to distinguish billing, quota and other causes. No error-classification source/image change was made during successful-provider verification.

No retry was made with that credential. The first synthetic operation remains `uncertain`, its usage reservation was not refunded, and the durable global daily attempt count increased from zero to one. No result record was created. The one-off job, temporary media, environment file and local helper were deleted.

The owner then explicitly selected the existing Gemini key, accepting that its original provider project receives Gemini usage charges. The backend copied it directly into Secret Manager version 2 without exposing its value or modifying the original key. A model-metadata GET returned 200. Cloud Run moved to revision `breakaway-analysis-00004-l4b` with version 2, preserving the image, auth gate, app allowlist and resource/operation limits.

Exactly one further admin-only fixture attempt was authorized after this material credential change. Execution `breakaway-provider-v2-verification-6ghs6` succeeded with the same short licensed fixture and zero automatic retries. Gemini returned a valid subjective review with **score withheld**, low confidence, 14 sampled frames and 2.8-second duration; the combined MediaPipe pose payload contained 14 frames. The actual existing TypeScript `validShotTechnique`, `validShotPose` and `poseMatchesVideo` checks passed. This verifies real provider generation, correct abstention and compatible/aligned pose output. Body visibility and `poseHasBody` were not recorded before result deletion, so usable landmarks or a usable body overlay are not verified. This does not establish a meaningful technique grade or physical-device attestation.

The second operation completed and the durable global daily attempt count increased from one to two; the synthetic verification identity also used two daily attempts. Both reservations and usage counts were retained. The temporary result record, local result file, clip, environment file, helper and one-off job were deleted after redacted status recording. No further provider attempts were made.

## Controlled validation and remaining release gates

1. Firebase project/app registration, Anonymous Auth, eligible anonymous-account cleanup and App Attest configuration are now verified at the configuration layer. No guest accounts were created by these deployment checks. The registered iOS app ID is allowlisted on the backend. These configuration checks do not prove native attestation works.
2. Backend prerequisites are verified: deny-all Firestore client rules, all three active TTL policies, and actual runtime service-account Firestore/Auth permissions.
3. The owner authorized protected API activation after the backend and privacy prerequisites passed. `HOSTED_AUTH_READY=true` is now active while the ordinary production client feature flag remains disabled. Owner-only TestFlight validation build 6 was started from source `4aabb99`, without automatic submission or public publication. The signed build and physical-device behavior still need verification: native session restoration, anonymous identity plus App Attest, expired/wrong-app denial, and retry/idempotency. Expo Go cannot establish this production attestation path. API readiness for controlled validation is separate from a public release.
4. The published [privacy policy](https://sprymosquito630.github.io/breakaway-support/privacy.html) was freshly fetched with HTTP 200 after activation. Its November 15, 2026 disclosure includes Google Cloud processing and microphone use. The broader disclosure covers sampled frames sent to Gemini, anonymous identifiers and temporary result retention. Owner billing alerts/provider quotas remain an operational review item.
5. The owner-selected existing credential passed actual generation without purchasing new credits or enabling auto-reload. The admin-only verification did not weaken any public authentication route. A licensed-fixture check through genuinely verified native identity/attestation still remains; no fake App Check tokens or identity bypasses are permitted. Expose the feature to normal users only after the remaining physical-device checks pass. Revisit a separately funded Breakaway Gemini credential only through a later owner-approved billing decision.

Operational details and the plan-first deployment command are in [the hosted backend README](../tools/hosted_analysis/README.md).
