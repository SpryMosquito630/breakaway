# Breakaway

An Expo SDK 58 soccer practice app focused on training, drills, progress and reminders. No account or laptop service is required for the shipping app.

## Run

```sh
npm ci
npm start
```

Open with Expo Go supporting SDK 58. For cellular access, use `npm start -- --tunnel`. Native iOS/Android is the primary target; `npm run web` is a secondary preview.

## Player experience

- Explicit onboarding for age range, position, focus, experience, schedule and setup. Answers start blank; replay onboarding from Settings.
- Equipment/space-aware rotating plans, visible session drills, custom drills, saved drills and playlists.
- Timed practice with keep-awake, sound/haptics, pause/resume and per-drill history. Targets scale to actual block length.
- Background counting is optional and off by default. Enabling it explicitly asks for notification permission; the current block can finish while locked or in another app, and the next drill waits. OS settings control notification delivery. Foreground-only practice pauses when leaving the app.
- Six versioned self-reported tests, skill profile/OVR, touch-test growth and practice milestones. OVR is based on app-defined targets, not validated scouting ability.
- A finite week of local reminders, skipping days already practiced. The app refreshes that week when opened or relevant data changes.
- Recovery preserves raw saved data before repair and blocks writes when a read or backup fails. A damaged active session does not discard valid history.

The training content is illustrative and has not been reviewed by a qualified coach. Two filmed examples and movement schematics are included; not every drill has a filmed demo. See assets/README.md for tracked provenance and docs/implementation-status.md for release boundaries.

## Optional development tools

Replay analysis, AI, accounts/community, athlete/coach tools and membership are experiments hidden from the default app and excluded from its screen graph. To work on them, set `EXPO_PUBLIC_DEVELOPER_FEATURES=true` in local `.env`, then restart Metro with `--clear`. Do not enable this flag in a release build. These features still have external service, content and youth-safety dependencies. Leaderboards are disabled.

Copy `.env.example` for public configuration names; server secrets never belong in EXPO_PUBLIC variables. Python analysis setup is documented in tools/replay_analysis/README.md. The optional developer replay sample uses EXPO_PUBLIC_REPLAY_SAMPLE_URL and is not bundled.

## Checks and contributions

Use a branch and pull request; keep functional commits separate from formatting. GitHub Actions checks every PR and main push.

```sh
npm run typecheck
npm test
npm run format:check
npm run format
npx expo export --platform ios --platform android --output-dir work/export
```

Native camera, sound, notifications, lock/relaunch and permission flows require physical-device verification in addition to automated checks.
