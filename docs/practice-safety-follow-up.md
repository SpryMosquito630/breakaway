# Practice safety follow-up — November 14, 2026

The original hardening, demo-first and onboarding branches were merged through PRs 1–3 after their GitHub checks passed. The next changes are separated into PRs 4–8: injury responses, drill pacing, calendar/position UI, saved-data recovery and release boundaries. Each must pass its own CI before merging into main. No App Store submission or new TestFlight upload is implied by a merge.

## Behavior

- Offline injury and dizziness questions return “Stop and tell a parent or coach.” without drill cards, including direct drill-selector calls.
- Recovery offers exact raw-text export, retry and a confirmed fresh start. Backups are verified before replacing the active save; older backups are retained. Recovery controls scroll on smaller screens. A closed share sheet is not proof that a file was saved.
- Catalog revision 3 supplies movement-specific work rounds and rest. The block timer includes both. Easier toe taps suggests 20 taps per 30 seconds of work with 15 seconds of rest. Harder slalom suggests two complete out-and-back runs per 45 seconds of work with 30 seconds of rest: up to ten over six minutes. A partial last work round is prorated down. Players may rest sooner; counts are suggestions, never completion gates.
- The two CB markers save separate left/right marker metadata while retaining the same CB training role. Legacy CB answers highlight one marker.
- Rest-day previews name the next scheduled date, label the next session's drills and offer “Train now.” Planned dates are shaded; completion checks are larger and contrasting; the current-day outline remains exclusive to today.
- Release builds expose Train, Drills and Progress. Laptop-backed Coach and Analyze destinations require a debug build and explicit preview flags. Metro substitutes a disabled barrel on production exports, and production EAS flags disable their service integrations.

## Pacing limits and source context

The counts are conservative starter suggestions selected for the actual movement and its collection/reset time. They have not been validated as universal standards or reviewed by a qualified coach. Previous results remain unchanged, and an active session keeps its frozen older target. Revision 3 does not reinterpret revision 2 results as progress at the new pace.

Using bounded practice/rest periods is consistent with [Ottawa Internationals' ball-mastery program](https://www.ottawasoccer.com/training-ball-mastery/) and the emphasis on varied movements and settings in [FIFA's technical activation overview](https://www.fifatrainingcentre.com/en/practice/technical-activation/technical-activation-part-2--circuit-overview.php). These sources do not endorse this app or establish its exact counts. Coach review of every stage remains content work.

## Device checks still required before release

No simulator, browser, unit test or export establishes physical iPhone behavior. On an actual phone, verify:

1. Silent switch on: 10-second and completion audio cues are audible at a usable volume.
2. Foreground practice: the screen stays awake and the current block finishes.
3. Background option on/off: lock/unlock, switch to music and return, interrupt/force quit and reconcile the current block without auto-advancing.
4. Notifications allowed, denied and revoked: reminder and block-end delivery, cancellation after completing practice, and no duplicate/stale alerts.
5. Corrupt/future-version save: export via the native share sheet; cancel and retry; confirm fresh setup while the verified raw backup remains.

Record device model, iOS/build version and observed results. All five remain unverified on physical hardware in this change.
