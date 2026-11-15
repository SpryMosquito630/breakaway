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

Each chat request contains only that question, broad saved position, focus and compatible catalog drill names/cues/IDs. Age, nickname, body measurements, clips, practice history, assessments and earlier messages are excluded. Equipment and space constrain the catalog locally. The provider instruction does not request names, contacts, exact age, locations, schools, account credentials or other private information and tells the assistant not to repeat private details volunteered by a user.

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

Current checks pass: 247 app tests, TypeScript, formatting, 20 targeted Python coaching/Gemini/pairing tests and proxy tests.


### Conversation presentation

Coach now uses a compact native header with an original message badge, a clear AI/offline label and the existing Settings destination. A short static greeting starts the conversation. An explicit send immediately creates a right-aligned lime user bubble, including queued/sending/error status; actual replies appear in left-aligned forest bubbles with truthful provider labels and compact catalog cards. Retry updates the same failed turn, and choosing the offline guide completes the same queued question with an explicit offline source. No plan-change or human-online claim is made.

Typing dots appear only while a real chat request is waiting and the screen is focused. They animate opacity on the native driver, become static with Reduce Motion and stop on unmount/focus loss. Keyboard handling, readable message widths, the rounded bottom composer and scroll position stay within the existing native screen. The five new conversation-state tests cover immediate pending messages, real provider attribution, duplicate-free retries, same-turn offline completion and the 20-turn bound. Connection, pairing, consent, authentication and provider quotas are unchanged.

Presentation QA at 390×844 and the default 1280-pixel browser width verified the compact header/composer, immediate queued bubble, same-turn offline reply, catalog-card navigation and conversation preservation on return. Long messages produced no horizontal document overflow. The visual check used the offline guide to preserve the owner’s existing paired phone connection; it made no provider request or service restart. Native keyboard layout and typing-animation fidelity still need a physical-device check. The preview is saved in output/screenshots/breakaway-coach-messaging.jpg.
