# Dedicated Coach section

Coach is a normal fifth tab beside Train, Drills, Analyze and Progress. It opens in **Offline guide · no AI** mode with focus prompts and a message composer. The introductory drill card and "About this coach" section have been removed. This is a fixed-rule catalog matcher, not a language model: equipment, space and saved position constrain recommendations; an explicit supported focus returns only matching skills. Unsupported questions explain the guide's available topics instead of returning unrelated drills. Cards in replies open the existing drill details and practice timer. Saved plan/history/tests are summarized only when asked. No profile/history/plan is changed, and no score is invented. The session-only chat retains the last 20 exchanges and is not saved to disk.

## Remote integration prepared, not activated

`EXPO_PUBLIC_COACH_REMOTE_ENABLED=true` opts into the Coach connection control independently of `EXPO_PUBLIC_DEVELOPER_FEATURES`. Both flags default off. Enabling Coach does not expose other developer screens. Default/offline Coach never probes the remote service. Unknown age and under-13 profiles cannot connect or send; changing to either aborts an in-flight request and returns to offline mode.

A real AI exchange additionally needs all of the following:

- An authenticated Supabase session. The public Supabase URL and publishable key initialize the existing client when the Coach flag is enabled. This change does not add production account/sign-in UI; that remains a dependency before public AI activation. Existing developer account tools can establish a session in test builds.
- The existing replay/coaching service configured with server-side `GEMINI_API_KEY` and `GEMINI_MODEL` (preferred for text chat), or `OPENAI_API_KEY` and `OPENAI_MODEL`, Supabase auth configuration and the existing per-service transport token. Provider secrets never belong in `EXPO_PUBLIC_*` variables. Keep the existing auth verification, request quotas and protected transport. No development auth bypass is enabled by this feature.
- A reachable `/api/replay/chat` route (or configured analysis URL). `EXPO_PUBLIC_COACH_REMOTE_ENABLED=true` exposes only protected chat alongside existing player analysis routes; it does not expose the video/food or other developer endpoints.
- Explicit in-screen consent before AI mode. Connecting checks the authenticated session and service availability; it sends no chat. The player reviews disclosure and enables AI, then explicitly sends the first question.

The consent and reply labels identify the selected provider (Google Gemini or OpenAI). Each request sends only that message, broad saved position, focus and compatible catalog drill names/cues/IDs. It excludes nickname, age value, body measurements, clips, history, tests and previous chat. Gear and space are applied locally to the allowed catalog. The server's bounded response validator and client validation reject unknown/incompatible drill IDs. Provider output must identify the selected `source: gemini` or `source: openai`; an error never silently becomes an AI-labeled offline answer. AI mode can be switched back to the offline guide at any time outside an active request.

## Verification

`tests/coach-recommendations.test.ts` verifies catalog eligibility and gear changes, weaker-foot intent, factual activity summaries, no health advice, age/build gating, data minimization and provider-output validation. Existing coach guide and server contract tests cover the unchanged service. Actual provider replies require the credentials, authenticated account and route configuration above; no live AI claim is made without an actual provider response.

Main-agent browser QA at390×844 verified the fifth Coach tab, a weaker-foot prompt returning three compatible ball-only drills, and navigation to the correct drill with its actual video and timer action. This exercised the offline guide only; no provider request was made. Full project checks pass:227 tests, TypeScript and formatting, plus an iOS production export. Native keyboard behavior and genuine authenticated AI remain unverified dependencies.

The existing client initialization was reviewed against the current [Supabase React Native Auth quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native), with no new SDK methods or database/schema operations. Provider secrets remain server-side and the existing server verifies end-user tokens; client getSession is used to retrieve transport credentials, not to authorize the server request.

## Gemini setup prepared; awaiting key

No Gemini key is present and no live provider request has been made. The adapter uses Google's [generateContent REST API](https://ai.google.dev/api/generate-content), structured JSON output and existing bounded response validation. `gemini-3.8-flash` is a [stable model supporting structured outputs](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), verified in November 2026. The model remains an explicit server setting rather than an implicit default. Gemini enables text chat only; food/video AI availability remains separately tied to OpenAI.

1. Edit the blank `GEMINI_API_KEY` in ignored `work/replay-service/coach.env.local` (permissions 600), copied from `tools/replay_analysis/coach.env.example`. Keep secrets out of chat and public Expo variables. The loader reads literal values without shell expansion.
2. For normal account-authenticated use, configure the server's Supabase URL/publishable key and the app's corresponding public settings. Existing account authentication is required; this work adds no sign-in UI. Configure `EXPO_PUBLIC_COACH_REMOTE_ENABLED=true` for the Coach UI and protected chat proxy. The existing service bearer token is still required.
3. After coordinating a restart of the existing service, run the same Python environment that runs the analysis service: `python tools/replay_analysis/start-coach.py --env-file work/replay-service/coach.env.local`. The loader starts `server.py` using existing model verification and session-token behavior; restarting changes that token, so restart Metro using `node tools/replay_analysis/start-expo.cjs` with the prior Expo options. Do not start a second server against an active session.

For a controlled local debug test without account infrastructure, the **existing** server `ALLOW_DEV_AI=1` path permits five total attempts per service run. The Coach UI additionally requires `EXPO_PUBLIC_COACH_DEV_ENABLED=true`, a debug build (`__DEV__`) and server-advertised development availability; normal production builds continue to require account authentication. Supabase configuration always takes precedence over development opt-in, including missing/expired JWT rejection. Do not enable accountless development testing on a shared/public tunnel. Neither development opt-in nor remote Coach was activated by this change.

`python3 tools/replay_analysis/test_gemini.py` uses mocked transport only to cover structured requests, truthful provider source, missing credentials, auth precedence, refusal/truncation/malformed responses, allowed drills and the fifth-request quota boundary.
