# Dedicated Coach section

Coach is a normal fifth tab beside Train, Drills, Analyze and Progress. It opens in **Offline guide · no AI** mode. This is a fixed-rule catalog matcher, not a language model: equipment, space and saved position constrain recommendations; a recognized focus changes their ordering. Cards open the existing drill details and practice timer. Saved history/tests are summarized only when asked. No profile/history/plan is changed, and no score is invented. The session-only chat retains the last 20 exchanges and is not saved to disk.

## Remote integration prepared, not activated

`EXPO_PUBLIC_COACH_REMOTE_ENABLED=true` opts into the Coach connection control independently of `EXPO_PUBLIC_DEVELOPER_FEATURES`. Both flags default off. Enabling Coach does not expose other developer screens. Default/offline Coach never probes the remote service. Unknown age and under-13 profiles cannot connect or send; changing to either aborts an in-flight request and returns to offline mode.

A real AI exchange additionally needs all of the following:

- An authenticated Supabase session. The public Supabase URL and publishable key initialize the existing client when the Coach flag is enabled. This change does not add production account/sign-in UI; that remains a dependency before public AI activation. Existing developer account tools can establish a session in test builds.
- The existing replay/coaching service configured with server-side `OPENAI_API_KEY`, `OPENAI_MODEL`, Supabase auth configuration and the existing per-service transport token. OpenAI secrets never belong in `EXPO_PUBLIC_*` variables. Keep the existing auth verification, request quotas and protected transport. No development auth bypass is enabled by this feature.
- A reachable `/api/replay/chat` route (or configured analysis URL). Default Metro proxy exposure may permit only pose routes. Deployment must deliberately expose the protected chat route; this change does not widen the proxy.
- Explicit in-screen consent before AI mode. Connecting checks the authenticated session and service availability; it sends no chat. The player reviews disclosure and enables AI, then explicitly sends the first question.

Each request sends only that message, broad saved position, focus and compatible catalog drill names/cues/IDs. It excludes nickname, age value, body measurements, clips, history, tests and previous chat. Gear and space are applied locally to the allowed catalog. The server's bounded response validator and client validation reject unknown/incompatible drill IDs. Provider output must identify `source: openai`; an error never silently becomes an AI-labeled offline answer. AI mode can be switched back to the offline guide at any time outside an active request.

## Verification

`tests/coach-recommendations.test.ts` verifies catalog eligibility and gear changes, weaker-foot intent, factual activity summaries, no health advice, age/build gating, data minimization and provider-output validation. Existing coach guide and server contract tests cover the unchanged service. Actual provider replies require the credentials, authenticated account and route configuration above; no live AI claim is made without an actual provider response.

Main-agent browser QA at390×844 verified the fifth Coach tab, a weaker-foot prompt returning three compatible ball-only drills, and navigation to the correct drill with its actual video and timer action. This exercised the offline guide only; no provider request was made. Full project checks pass:227 tests, TypeScript and formatting, plus an iOS production export. Native keyboard behavior and genuine authenticated AI remain unverified dependencies.

The existing client initialization was reviewed against the current [Supabase React Native Auth quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native), with no new SDK methods or database/schema operations. Provider secrets remain server-side and the existing server verifies end-user tokens; client getSession is used to retrieve transport credentials, not to authorize the server request.
