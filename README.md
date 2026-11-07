# Breakaway

A working Expo / React Native soccer practice app for Expo Go. The project directory is named PlayerAccelerator; the user-selected app identity is Breakaway.

## Run on your phone

```sh
npm install
npm start
```

Install Expo Go on your iPhone or Android phone. Connect the computer and phone to the same Wi-Fi network, then scan the QR code printed by Expo (`Camera` on iPhone; `Scan QR code` in Expo Go on Android). This project uses Expo SDK 58 and requires Expo Go with SDK 58 support (including the current iPhone client). An SDK 57 client cannot open this project. If your network blocks local connections, run `npx expo start --tunnel` instead.

For a simulator, start Metro and press `i` (Xcode / iOS simulator) or `a` (Android emulator). `npm run web` provides a secondary browser preview; the primary deliverable is the native app.

## What works

- Unanswered onboarding for position, focus, experience, weekly days, session length, space and equipment; replay it from Settings.
- A rotating three-drill plan matched to those constraints; schedule/focus edits and drill swaps.
- 30 searchable starter drills, three difficulty stages with targets, instructions, movement diagrams and individual practice. Two completed Easy check-ins at the same drill revision and stage advance its suggested challenge.
- Completed training days in the week strip, a weekly goal count and Done for today state.
- Warm-up guidance, timed blocks, pause/resume, skip, replace, end early, partial/completed recap and effort check-in.
- Local session history with per-drill records and a built-in 3–2–1 / 30-second touch test.
- Optional local reminders on selected training days, plus system/light/dark appearance.
- Training paths, daily energy/equipment check-ins, match calendar, custom drills, favorites and reusable playlists.
- Six repeatable self-reported skill tests, radar/ratings and test-derived OVR. Participation XP, levels, challenges, streaks, badges and season cards are separate from ability.
- A Tools tab with fitness routines, foreground GPS runs, food/photo/barcode notebook, recovery logs and manual match records.
- Offline coach session builder, diagrams, print/PDF export and local team organization with RSVP and constrained side balancing.
- Saved video replay with measured ball tracking through the local analysis computer; experimental MediaPipe joint overlays and a local plan-aware guide.
- Optional prepared account/community, explicit cloud-backup, AI-feedback and native purchase integrations. These remain unavailable without configuration; they do not simulate users, feedback, purchases or credit balances.
- Preferences, themes, reminders and confirmed local data reset across feature notebooks.

Generated sessions rotate across training days; manually swapped plans keep their chosen order. Existing aggregate history remains valid and is not assigned guessed drill IDs. New sessions store actual drill IDs, revisions, difficulty, elapsed time and completion status.

Data is stored on the device with AsyncStorage. Going into the background pauses and saves the timer; reopening a session starts paused. The running timer keeps the screen awake and cues the final 10 seconds and block completion with sound/haptics. Manual lock or switching apps still pauses practice. The countdown display updates locally rather than publishing shared app state every second. The timer accounts for actual elapsed foreground practice, caps elapsed time at the block duration and excludes setup/warm-up/pause time. A fully elapsed block is completed; an early finish or skip is partial. Replacements preserve time already practiced. While running, storage is checkpointed every 5 seconds; an abrupt force-kill may lose up to 5 seconds. Normal backgrounding saves immediately. Optional account sync backs up training only after an explicit upload; video, photos and GPS are excluded.

## Checks

```sh
npm run typecheck
npm test
npx expo install --check
npx expo export --platform ios --platform android --output-dir work/export
```

Domain tests cover constraint matching, timing, pauses, early finishes, completion and replacement accounting. Native device QA should include onboarding, timer background/relaunch behavior, edits and reset. Source is split across `src/components`, `src/screens`, `src/data`, `src/domain` and `src/state`.

## Design and limitations

[Breakaway design reference](https://claude.ai/artifact/RyykViF3qpGNrbNY43TtR9). A compact native redesign uses neutral surfaces, restrained forest/volt accents, editorial training photography and bundled Barlow Condensed / Archivo / IBM Plex Mono fonts; native navigation and Lucide outlines. See DESIGN.md and PRODUCT.md.

The training content is illustrative and has not been reviewed by a coach. OVR summarizes app-defined self-reported tests, not validated scouting ability. Sample results never become personal data. Tracking is experimental: ball detection measures image motion and joint overlays estimate visible landmarks; neither establishes technique quality. Two filmed drill examples and 28 movement schematics are included; the remaining drills do not have filmed examples. Local training needs no account or paid service.

## Optional services

Use `.env.example` for public client settings. Never put provider secrets in public Expo variables. Supabase setup and RLS tests are in `supabase/README.md`; billing gates and dormant ledger preparation are in `docs/billing.md` and `docs/billing-backend.md`. Real accounts, products and hosted verification are still required before activation.

To use cellular video analysis, start the Python service, then the token-aware Expo runner in `tools/replay_analysis/README.md`. Restart Expo after restarting Python because the development token rotates. This local development service is not production hosting. AI is disabled until server credentials, a model and request authentication are configured. No paid API calls were made during implementation.

See `docs/implementation-status.md` for the complete build and activation boundaries. Physical-device camera, GPS, media storage, PDF/share sheets and store purchase QA remain required.
