# Coach chat

Coach is the fifth tab beside Train, Drills, Analyze and Progress. With `EXPO_PUBLIC_COACH_REMOTE_ENABLED=true`, it opens with a neutral **Coach Breakaway · AI training assistant** header and a message composer. No network or provider request runs on open. Without remote configuration, it opens in **Offline guide · no AI** mode.

## Age-independent Coach

At the user's explicit request, Coach availability no longer depends on the saved age range. Unknown, under-13, teen and adult profiles use the same first-send connection, private development pairing and provider-sharing consent. Coach does not collect age or ask the player to change a profile to unlock chat. This changes Coach only; other features retain their existing age restrictions.

This setting defines application behavior, not provider or legal clearance. Google's published [Gemini API age requirements](https://ai.google.dev/gemini-api/terms#age-requirements) remain applicable independently of the application's toggle. No claim of compliance with provider terms, COPPA, parental-consent requirements or production child-account requirements is made. Production account/backend deployment remains pending.

## First explicit send

The player writes a question or chooses a starter and presses Send. The app checks the current service and authenticated account or private development phone credential. The first question then presents a brief disclosure naming the actual provider. **Send question** confirms sharing and sends that queued question directly. There is no separate Connect or Enable action.

The queue survives connection and development pairing steps and is consumed once. Later questions in the same screen session reuse consent while the server, provider and account/paired-phone identity remain the same. Consent is currently memory-only: a new screen session can ask again, and no raw phone credential is copied into ordinary preferences. A changed provider or identity requires fresh consent.

Transient provider errors preserve the composer text and cancel automatic sending. Nothing silently retries or becomes an AI-labeled offline reply. A server `pair_required` rejection occurs before provider use, so that specific question can continue after explicit development pairing repair. The player can choose the clearly labeled offline guide instead.

## Data and response boundaries

Each chat request contains the current question, broad saved position, focus and compatible catalog drill names/cues/IDs. When the server advertises chat-memory support, it also includes a bounded set of recent completed AI exchanges from this conversation and identity scope. Age, nickname, body measurements, clips, practice history and assessments are excluded from profile/context fields; text that the player explicitly writes in chat is part of the shared conversation. Equipment and space constrain the catalog locally. The provider instruction does not request names, contacts, exact age, locations, schools, account credentials or other private information and tells the assistant not to repeat private details volunteered by a user.

The prompt limits replies to general football practice, avoids medical/diet/weight-loss advice and invented performance measurements, and permits only supplied drill IDs. Server and client validators reject unknown/incompatible drills and false provider attribution. AI never changes a profile, plan, history, test score or OVR. Chat retains the last 20 exchanges in memory only.

The offline guide uses fixed rules, not a language model. Supported focus requests return compatible catalog drills; unsupported requests explain its available topics. Drill cards open the real drill detail and practice timer.

## Current private cellular test

The local Gemini connection is active for the user's explicitly authorized private development test. The API key remains server-only in ignored `work/replay-service/coach.env.local`, permissions 600; no provider key belongs in `EXPO_PUBLIC_*`, app storage or the public bundle. The adapter uses Google's [generateContent REST API](https://ai.google.dev/api/generate-content), structured JSON and bounded response validation. `GEMINI_MODEL` remains explicit; the configured test model is `gemini-3.8-flash`. Gemini enables text chat only; video/food AI is separately tied to OpenAI and remains unavailable without its own configuration.

Server `ALLOW_DEV_AI=1` and `COACH_DEV_PAIRING=1` enable this private test. The client requires a debug build (`__DEV__`), `EXPO_PUBLIC_COACH_DEV_ENABLED=true` and server-advertised development availability. `EXPO_PUBLIC_COACH_REMOTE_ENABLED=true` exposes Coach independently of `EXPO_PUBLIC_DEVELOPER_FEATURES`, which stays false. The public proxy exposes only health, Joint View, Coach chat and its explicitly enabled pairing exchange.

After binding, the service writes an eight-digit one-use code to ignored `work/replay-service/coach-pairing.json` with permissions 600. The masked development-only **Pair phone** form accepts it. The code expires after ten minutes and locks after five failed exchanges. It is never returned by health or printed in service logs. `/pair` accepts at most 512 bytes, requires the current analysis session bearer and exchanges the code once for a random 256-bit phone credential. The code file is removed on success.

Accountless `/chat` requires the separate credential in `X-Coach-Pair` before reading a message or reserving provider quota. It expires after two hours. Native SecureStore retains it across reloads; web uses memory only. It is bound to the exact service base URL and expiry and cleared after an authorization failure. The bundled analysis bearer alone cannot authorize paid chat. Pairing attempts and rejected credentials consume no provider quota. The service allows five provider attempts per run, including failed provider calls.

The ignored `resume-session.py` helper preserves the existing analysis bearer, model verification, port and temporary upload cleanup when coordinating a local service restart. Restarting the normal `server.py` entry point instead rotates that bearer and requires restarting Expo via `start-expo.cjs`. Keep the existing tunnel/port options when restarting Metro. Never launch a second service against an active session.

## Production authentication remains separate

Normal account-authenticated use needs matching server/client Supabase URL and publishable-key settings, an authenticated session, a deployed protected route and server-side provider credentials. This work adds no sign-in UI or production hosting. Supabase configuration always takes precedence over development pairing: the pairing endpoint is unavailable, and missing/expired account JWTs cannot fall back to a paired phone. Account requests retain five attempts per user and 50 total attempts per service run; development pairing retains its separate five-attempt cap.

A future account-free production integration would need server-verified installation/anonymous-user identity, durable budgets and appropriate platform/account protections. No anonymous production backend or parental-management system is activated by this change.

## Age correction and saved data

**Settings → Age range** shows the currently saved range, three neutral choices and an explicit **Save age range** action. Only that explicit editor can correct an existing range. It changes only the chosen range and preserves the profile's other values, plan, history, active practice and assessments. Ordinary training edits preserve saved age metadata; onboarding replay and general edits retain their existing under-13 protections. Coach does not use age correction as a connection prerequisite.

## Verification

Public-tunnel browser QA previously verified the adult first-send flow: a neutral composer without a Connect button, generic passing question, development pairing, two-sentence Google Gemini disclosure, **Send question**, then a genuine Gemini reply with a compatible **Pass and brake** catalog card. Earlier offline QA verified compatible weaker-foot drills, drill details and the timer. These were browser tests, not a physical phone over cellular.

Tests cover all-age/unknown-age Coach availability and queue continuation, no send on open, one-use consent continuation, no automatic replay after errors, provider/server/account consent invalidation, pairing precedence, data minimization, age-only profile correction, saved-data preservation and the unchanged restrictions of other features. Server tests use mocked provider transport for structured requests, real source labels, malformed/refused output, auth precedence, pairing expiry/guess limits, owner-file permissions and the fifth-attempt quota boundary. Proxy tests cover route flags, body bounds and phone-header forwarding. The actual server key was absent from a downloaded public iOS development bundle.


Earlier public-tunnel browser QA explicitly changed an adult dummy test profile to **Under 13** through Settings → Age range and **Save age range**, verified the saved row, and returned to a neutral Coach composer with no age block. Sending the generic message “hi” followed the same development pairing and two-sentence Gemini disclosure, then **Send question** automatically produced a genuine Gemini greeting with compatible **Sole rolls** and **Inside touches** catalog cards. No actual child information or profile age/name was submitted to the provider. This verifies browser behavior, not a physical phone over cellular. The service was refreshed afterward with the existing bearer and tunnel preserved, leaving a fresh owner code and five development attempts.

Current checks pass: 255 app tests, TypeScript, formatting, 25 targeted Python coaching/Gemini/pairing/memory tests and proxy tests.


### Conversation presentation

Coach now uses a compact native header with an original message badge, a clear AI/offline label and the existing Settings destination. A short static greeting starts the conversation. An explicit send immediately creates a right-aligned lime user bubble, including queued/sending/error status; actual replies appear in left-aligned forest bubbles with truthful provider labels and compact catalog cards. Retry updates the same failed turn, and choosing the offline guide completes the same queued question with an explicit offline source. No plan-change or human-online claim is made.

Typing dots appear only while a real chat request is waiting and the screen is focused. They animate opacity on the native driver, become static with Reduce Motion and stop on unmount/focus loss. Keyboard handling, readable message widths, the rounded bottom composer and scroll position stay within the existing native screen. The five new conversation-state tests cover immediate pending messages, real provider attribution, duplicate-free retries, same-turn offline completion and the 20-turn bound. Connection, pairing, consent, authentication and provider quotas are unchanged.

Presentation QA at 390×844 and the default 1280-pixel browser width verified the compact header/composer, immediate queued bubble, same-turn offline reply, catalog-card navigation and conversation preservation on return. Long messages produced no horizontal document overflow. The visual check used the offline guide to preserve the owner’s existing paired phone connection; it made no provider request or service restart. Native keyboard layout and typing-animation fidelity still need a physical-device check. The preview is saved in output/screenshots/breakaway-coach-messaging.jpg.


### Bounded in-session chat memory

The updated service advertises `chatMemoryAvailable: true`; older services receive no history field and the client does not claim memory support. Once available, each request can include up to six recent completed AI exchanges, with alternating user/assistant messages. Offline, failed and queued turns are excluded. The active question is appended once. Past assistant text includes its validated drill IDs so follow-ups can refer to attached cards. Current training preferences and the current allowed catalog override older suggestions.

Memory is scoped to the server base URL, provider and authenticated user or paired-phone credential. Scope metadata and credentials remain in memory and are never included in transcript JSON. A versioned consent key requires renewed disclosure before the expanded messages/replies payload is shared. Conversation and consent are not written to disk by the app or local service. Relaunch starts fresh; there is no cross-device or permanent memory. OpenAI requests retain `store:false`. No provider-retention guarantee is implied.

The client caps transcript text at 6,000 characters and 8,000 UTF-8 bytes and drops the oldest complete pairs until the **entire serialized request**, including current question/context, fits the existing 24,000-byte body limit. The server independently rejects extra fields, non-text messages, instruction/tool roles, non-alternating or incomplete exchanges and oversized transcripts before reserving provider quota. The existing 1,800-output-token limit and provider/session quotas remain unchanged. Gemini receives explicit alternating `user`/`model` contents; OpenAI Responses receives manual `user`/`assistant` history, following [Google's chat-history documentation](https://ai.google.dev/gemini-api/docs/generate-content/text-generation) and [OpenAI conversation-state documentation](https://developers.openai.com/api/docs/guides/conversation-state).

The header's **New chat** action clears conversation memory, cancels the app's pending request and fences late completions/errors so an older request cannot repopulate the new conversation. It preserves a valid pairing credential and an unchanged sharing-consent scope; it does not reset provider quota or modify training data. A provider request already processing can still consume an attempt.

Runtime activation requires loading the updated Python service. The existing server stores the paired-phone token hash only in process memory, so restarting it requires one new development pairing code. After source review, the local analysis service was restarted once with the existing analysis bearer, port and models preserved. The public and Wi-Fi Expo sessions stayed running. That backend update invalidated the old process-only paired-phone credential, so this private preview requires one fresh pairing code; normal production account authentication is unaffected.

Memory verification uses mocked provider transport only: eight app tests cover role/order/card retention, identity/provider/status isolation, six-exchange bounds, current-question exclusion, old-backend capability gating, complete Unicode request budgeting, oversized-context rejection and late-completion fencing. Five Python tests cover strict validation, both provider payloads, health capability, invalid-history rejection before quota/provider calls and non-chat rejection. A live two-turn generic Gemini adapter test passed after source review: the first message selected passing while current training context retained Ball control, and the follow-up asked which skill had just been selected. With the actual validated prior exchange included, Gemini correctly recalled passing. Two isolated development attempts were used; the running owner session was not used for this test. Sanitized generic proof is saved in ignored private work/replay-service/chat-memory-live-proof.json. This proves provider memory handling, not physical-device or end-to-end app memory behavior.

Runtime health now advertises `chatMemoryAvailable:true` with Gemini chat and local Joint View available. The service was left with a fresh owner pairing code and five unused development attempts. Requests carrying only the bundled bearer still require the separate paired-phone credential.

## Automatic private development preview

The accountless preview can connect through an owner-issued **private QR link** instead of typing an eight-digit code. This is development access, not an anonymous public AI endpoint. Release builds continue to exclude the laptop-backed Coach screen. Provider API keys remain server-side.

The owner runs `tools/replay_analysis/preview_invite.py --prepare-only` before starting the local service with `COACH_PREVIEW_INVITE_ENABLED=1` (alongside the existing explicit development flags). Preparation reuses an unexpired seven-day owner capability; it does not rotate credentials on ordinary restarts. The raw capability is stored only in ignored `work/replay-service/coach-preview-invite.json`, mode0600. The service reads `coach-preview-grant.json`, containing its stable ID, SHA256 hash and expiry, also mode0600. Expired, malformed or disabled grants fail closed. No HTTP endpoint can issue a grant.

After the current Expo origins are recorded in `work/expo-cellular-current.txt` and `work/expo-wifi-current.txt`, run `tools/replay_analysis/preview_invite.py` to create owner-only private link files. `node tools/replay_analysis/preview_invite_qr.cjs <private-link-file> output/screenshots/breakaway-coach-private-cellular-qr.png` creates the private QR; the analogous Wi-Fi file uses the `-wifi-` name. These precise private QR patterns are ignored by Git. Do not publish private links or their QR images: possession authorizes the bounded development capability. Ordinary Expo URLs stay safe to use without granting Coach access.

The secret travels in the URL fragment, after `/--/coach-connect`, so it is absent from HTTP request targets, public manifests and JavaScript bundles. The app captures cold and warm links before fonts/navigation, only when the debug Coach flag is enabled. Native credentials persist in device-only SecureStore; the web preview uses tab-scoped sessionStorage and removes the private fragment immediately. A URL import is not a successful provider request: the server still checks the grant and its expiry on each chat.

Credentials remain bound to an exact service base. A changing Expo tunnel cannot be trusted merely because it presents a public health ID; only an explicit new private launch link can rebind the saved credential. The same owner capability is reused in newly generated private links while unexpired. Native ordinary relaunch/reload at that base then needs no code. Native Expo Go delivery of URL fragments still requires device verification; local parser tests and browser QA do not establish this behavior on a phone.

Provider consent and the existing five-request development quota are unchanged. A public bundle bearer without a valid private capability still gets `pair_required` before any provider request or quota increment. The eight-digit owner code remains a fallback. A verified account continues to use the existing authenticated path instead of this development mechanism.
