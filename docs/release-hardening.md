# Training release hardening

Branch: `fix/training-release-hardening`.

## Changes

1. Saved-data recovery backs up exact raw JSON before repaired saves can be written. Read/backup failures block updates, checkpoints and onboarding. Retry rereads. Isolated session and preference damage preserves validated progress and valid local age restrictions.
2. Foreground timer cues use silent-mode playback. Background practice is optional and off by default; a frozen wall-clock deadline counts only the current block. It requests notification permission explicitly, never auto-advances, cancels stale notifications, and falls back to paused mode with a message after permission or scheduler failure.
3. Drill targets use per-minute pacing and actual frozen duration. Catalog revision 2 has distinct one/two/four-repetition work/reset constraints. Old snapshots are not rewritten or given invented rates.
4. Finite reminders cover seven local dates, skip practiced dates, and reconcile on history/preferences, foreground and local midnight. They expire if the app is not reopened; notification delivery depends on OS settings.
5. Default navigation exposes only training, drills, progress and reminders. Today’s drills are visible. A Metro-gated developer barrel excludes experimental products and their dependencies from default builds. Leaderboards are disabled and client score writes/opt-in are blocked by the desired SQL grants/policies.
6. Age onboarding starts unanswered; all ages can train locally. Unknown/under-13 users cannot use the experimental account/community client. Age range stays local and cannot be upgraded by replaying onboarding or cloud restore.
7. Tracked WebP hero is 151,092 bytes instead of the 2.5 MB PNG. The 4.5 MB replay sample is removed from shipping assets. Provenance is in assets/README.md. Android icon background uses forest green.
8. Prettier formats source/tests; CoachTools.tsx now has maximum line length 152 rather than 3,247. Generated analysis JSON is excluded. CI runs install, typecheck, tests and format checks with read-only permissions and pinned actions. Functional changes and mechanical formatting are separate commits on a branch.

## Verified

- TypeScript, 156 tests and Prettier check passed.
- Current-source iOS and Android production exports passed; Hermes bundles 5,053,272 and 5,057,205 bytes.
- 37 unique exported assets; only the two licensed drill demonstration MP4s and 147.55 KiB WebP hero. No old editorial PNG or replay sample MP4.
- Membership and food implementation strings absent from default native bundles. Developer-enabled web build also compiles.
- Desired connected SQL and permission fixtures passed on disposable PostgreSQL. Client alias writes succeed; score writes and leaderboard opt-in fail. No hosted migration was applied.
- Browser: unanswered age question; under-13 local training; visible assigned drills; duration-scaled six-minute target; core-only Settings; background option remains off until explicit action.

## Remaining release work

Physical-device tests are required for silent-switch playback, lock/app-switch/force-quit reconciliation, notification timing/cancellation and permission revocation. Automated exports and pure clock tests do not establish real OS delivery.

Only two filmed examples currently exist. More licensed, drill-matched footage and qualified coach review remain external content work. No coach approval, scouting validity or model accuracy is claimed. A content-review checklist is in docs/drill-content-review.md.

Age screening is only a guard, not verified identity or parental consent. Community remains excluded from shipping. A launch involving young players needs a suitable privacy/consent/moderation review; consult the [FTC’s COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) and [Apple’s review guidelines](https://developer.apple.com/app-store/review/guidelines/). No statement here claims legal approval or App Store acceptance.
