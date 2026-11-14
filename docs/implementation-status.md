# Breakaway release scope

The shipping app is an account-free soccer practice tool: Train, Drills, Progress, Analyze and optional local reminders. Analyze supports account-free local shot replay and optional 13+ consented MediaPipe body tracking; pose results are temporary, no technique ratings/speed are generated, and the current analysis service is developer-hosted (see docs/shot-analysis.md).

## Shipping

- Constraint-aware plans, visible session drills, custom drills/playlists, practice history and six self-reported test scores.
- Per-minute drill pacing scaled to the frozen block length; revised difficulty set/reset constraints.
- All 30 starter drills have distinct photographic references. Two offline filmed demos loop after Play; another 24 reviewed online core-technique examples offer original timestamped YouTube links. Unknown child-directed status keeps those sources external-only. Four video gaps remain; authored guides and written steps stay available. Media unmounts before the timer. See docs/drill-media-verification.md.
- Foreground timer audio plays through iOS silent mode. Background practice is an explicit, default-off option; it reconciles wall-clock time and requests a local end notification, rather than claiming a background JavaScript service. It never advances to another drill automatically.
- One week of finite local reminders, excluding practiced dates; refreshed on relevant changes and foregrounding. Delivery follows device settings.
- Raw-save recovery backup before any repaired save can be written. Read/backup failures gate training/onboarding and block writes; Retry reads again. Isolated invalid active sessions are dropped while validated progress survives.
- Neutral unanswered age-range question. Age range stays local; unknown/under-13 users cannot access the experimental connected client. Local training remains available to every age range.

## Developer experiments, disabled by default

`EXPO_PUBLIC_DEVELOPER_FEATURES=true` enables experimental replay, AI, athlete notebooks, coach/team tools, accounts, community and membership. Restart Metro with a cleared cache after changing this build flag. Metro excludes the developer screen graph when disabled; these are not shipping product promises. Backend proxy routes are off by default too.

Leaderboards are disabled. No client writes practice points or opts into standings. The desired SQL schema revokes client score writes; policy tests cover those denials. No schema was deployed to a hosted project. Age screening is not identity verification, parental consent or a claim of legal compliance. Public community remains blocked from release pending a suitable youth-safety, moderation and privacy design.

The replay sample video is no longer bundled. Developer builds may provide a matching licensed HTTPS source URL; personal clips must never inherit authored sample annotations. The Train hero uses the genuine Kevin De Bruyne action photograph through the centralized `src/data/train-hero.ts` asset record, with source/license provenance in `assets/train-hero` and `assets/README.md`.

## Release dependencies

Two filmed drill examples are bundled for offline use; 24 further reviewed core-technique examples are official online references with explicit limits and no offline redistribution rights. Push & follow, Weaker-foot sole path, Pass and brake, and Angled pass and collect remain video gaps. Online embedding requires verified provider child-directed status; all current online entries remain unknown and external-only. Revised stages and authored guides remain original illustrative content, not coach-reviewed. Further filming, provider verification and qualified coach review remain external work; no review, seamless loop boundary or full-sequence accuracy is fabricated.

Physical-device tests remain required for silent-switch audio, lock/app-switch clock reconciliation, notification timing/cancellation, force-quit/relaunch, permission revocation and native media/share behavior. Native exports and pure clock tests do not prove OS delivery. Supabase/OpenAI/store services remain unconfigured.

## Development checks

Work on a branch, keep functional changes separate from repository-wide formatting, and use a pull request. GitHub Actions runs TypeScript, tests and Prettier checks. Generated work/exports are excluded from TypeScript. Verification results for this branch are recorded in docs/release-hardening.md.
