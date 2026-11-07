# Breakaway release scope

The shipping app is an account-free soccer practice tool: Train, Drills, Progress and optional local reminders. It no longer promotes unfinished products as player-facing features.

## Shipping

- Constraint-aware plans, visible session drills, custom drills/playlists, practice history and six self-reported test scores.
- Per-minute drill pacing scaled to the frozen block length; revised difficulty set/reset constraints.
- Foreground timer audio plays through iOS silent mode. Background practice is an explicit, default-off option; it reconciles wall-clock time and requests a local end notification, rather than claiming a background JavaScript service. It never advances to another drill automatically.
- One week of finite local reminders, excluding practiced dates; refreshed on relevant changes and foregrounding. Delivery follows device settings.
- Raw-save recovery backup before any repaired save can be written. Read/backup failures gate training/onboarding and block writes; Retry reads again. Isolated invalid active sessions are dropped while validated progress survives.
- Neutral unanswered age-range question. Age range stays local; unknown/under-13 users cannot access the experimental connected client. Local training remains available to every age range.

## Developer experiments, disabled by default

`EXPO_PUBLIC_DEVELOPER_FEATURES=true` enables experimental replay, AI, athlete notebooks, coach/team tools, accounts, community and membership. Restart Metro with a cleared cache after changing this build flag. Metro excludes the developer screen graph when disabled; these are not shipping product promises. Backend proxy routes are off by default too.

Leaderboards are disabled. No client writes practice points or opts into standings. The desired SQL schema revokes client score writes; policy tests cover those denials. No schema was deployed to a hosted project. Age screening is not identity verification, parental consent or a claim of legal compliance. Public community remains blocked from release pending a suitable youth-safety, moderation and privacy design.

The replay sample video is no longer bundled. Developer builds may provide a matching licensed HTTPS source URL; personal clips must never inherit authored sample annotations. The hero is a 148 KiB WebP with provenance tracked in assets/README.md.

## Release dependencies

Only two filmed drill examples currently exist. The other drills have schematics/instructions. Revised stages are original illustrative content, not coach-reviewed. Additional footage must demonstrate the actual drill and have documented rights. A qualified coach review and further filmed demonstrations require external content/review work; no review or accuracy is fabricated.

Physical-device tests remain required for silent-switch audio, lock/app-switch clock reconciliation, notification timing/cancellation, force-quit/relaunch, permission revocation and native media/share behavior. Native exports and pure clock tests do not prove OS delivery. Supabase/OpenAI/store services remain unconfigured.

## Development checks

Work on a branch, keep functional changes separate from repository-wide formatting, and use a pull request. GitHub Actions runs TypeScript, tests and Prettier checks. Generated work/exports are excluded from TypeScript. Verification results for this branch are recorded in docs/release-hardening.md.
