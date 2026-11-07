# Breakaway — native training notebook

## Direction

Whole-app redesign after the user rejected the first presentation as generic and too verbose. Preserve the forest/volt identity and all existing tasks/data, while replacing the landing-page hierarchy with a compact native utility. The user’s requested Impeccable, Frontend Design and Taste skills informed the critique, information editing, layout and visual review. Taste’s marketing defaults are adapted to a native product: variance4, motion2, density4.

## Hierarchy

The primary navigation has three tabs: Train, Drills and Progress. Train prioritizes one session start/resume action, compact time and weekly context. Today's drill list is collapsed; My plan and Video replay are quiet secondary rows. My plan remains a full secondary screen. Settings links to More tools, whose four categories separate Training, Coaching, Notebook and optional Connected services.

Drills opens with search and My setup / Saved / All. Skill and custom filters are disclosed; a compact overflow contains Create drill and Playlists. Library rows open details rather than repeating save buttons. Saving lives in drill details. Custom drills without difficulty variants do not show empty challenge controls.

Progress is a compact overview: real overall test score only when all six tests exist, or a quiet invitation to begin. Skill tests and touch growth each open focused screens. History, practice milestones and season goals are separate destinations. XP remains distinct from test scores.

Settings consolidates training preferences, keeps Replay onboarding visible, discloses privacy/practice notes and shows reminder time controls only while reminders are enabled. Practice, onboarding, data, upload consent, clock accounting and all feature implementations remain intact. The simplification reduces competing entry points rather than deleting capabilities.

## Tokens

Neutral background #F6F7F5; white rows/cards; ink #14231C; muted #616B64; line #E3E7E1. Forest #0C4A34, pressed #082D20, soft #E1EDE5, volt #C6EF2E. Orange #C2410C indicates a running timer only; danger #B42318 identifies destructive actions. Muted text retains contrast on soft surfaces.

Archivo400/500/600 carries the interface. Screen titles27/34, section18/24, row15/22, secondary13/19. Barlow Condensed800 appears only as the compact brand wordmark. IBM Plex Mono is restricted to real timers and practice/result data. Text respects accessibility scaling.

20-point page gutters; gaps8/12/16/24. Cards16 radius, controls10–12. Flat fills, no shadows, gradients, decorative pitch stripes or fake graphics. Native headers, back navigation and confirmation alerts; reduced-motion transitions remain enabled.

## Visuals and content

The bundled editorial photo `assets/training-editorial.png` is tightly cropped in the session panel and larger on the welcome screen. See `work/asset-notes.md` for provenance. Category icons identify library rows. Movement diagrams are specific to the drill and appear only in guidance/detail contexts, never as repeated decorative thumbnails. Actual drill instructions remain intact; operational reading is progressively disclosed.

No fake scores, zero-dashboard, slogans, repeated disclaimers, decorative metrics or invented progress. The app remains phone-first, local-only and Expo SDK58 compatible. Appearance follows the system by default, with Light and Dark overrides. Reference tokens live in `src/theme/tokens.json`; semantic palette roles resolve them for both themes. Control boundaries use line-strong, and inverse text uses dedicated on-fill roles.

## Review

Pre-edit audit and screen plan: `work/redesign-audit.md`. Main-agent screenshot and interaction review covers the native app and390×844 browser surface. Domain tests retain session accounting guarantees.

## Interaction feedback

Native taps use a centralized, non-blocking haptic utility. Selection ticks acknowledge changed tabs, choices, filters, drill/settings rows, disclosure, navigation icons and appearance choices; weekday and reminder switches use toggle feedback. Primary actions use medium impacts, secondary actions and swaps use light impacts. Confirmed onboarding/preferences/benchmark saves use success feedback; skips, early-finish confirmations and confirmed resets use warning feedback. Invalid reminder-time submissions use error feedback, while reminder operations acknowledge intent without claiming an asynchronous success.

Shared controls accept `feedback={false}` or a semantic override. Benchmark start/retry disable generic control feedback because the countdown already emits its own light ticks/start cue. Timer warning and finish patterns remain separate and occur once per block. Disabled controls, unchanged tabs, passive renders, scrolling and typing produce no haptics. Android uses the platform haptic engine; iOS uses selection, impact and notification feedback. Web and unavailable/background/OS-suppressed feedback stay silent; no permission or override is requested.

## Practice controls and transitions

Running and paused practice keep the frozen drill name, stage, “Aim for” target, dominant timer and one cue together. A single68-point primary control stays pinned, with12-point separation from secondary actions; Pause uses volt for visibility, while Resume and Start use pitch. Small screens compact spacing and timer size without truncating targets or cues. Instructions remain available through disclosure.

Completion identifies the finished drill and actual completed count, then previews the next session-assigned drill and target. Next opens setup and never starts a timer automatically. Warm-up, setup, completion and drill changes reset reading position; pauses and ticks preserve it. Early finish/end confirmation, haptics, keep-awake, accounting and storage semantics are unchanged.


## Skill profile and touch-test growth

Progress leads with a dark six-axis Skill profile for Pace, Shooting, Passing, Dribbling, Defending and Physical. Radar and Ratings offer the same skill breakdown through touch targets of at least 44 points. An actual skill receives a test score only after a saved assessment using its fixed, versioned protocol. Unassessed skills remain dashed. Partial coverage shows individual points; the filled polygon and OVR unlock after all six tests are recorded. OVR is the rounded mean of each skill’s latest chronological test score, and can decrease. These app-defined 0–100 test targets are gamification, not validated player ratings or population norms. Defending is explicitly a lateral-footwork proxy and Physical a sustained-coordination proxy. Raw results, recent history, date and score changes remain visible in skill details even when a score reaches its cap.

Assessments begin through the selected skill’s detail. Setup confirmation is explicit, with a defer action and concise equipment/space requirements. A three-second countdown precedes every test. Pace and slalom require a helper at the finish to stop the captured stopwatch; recorded time cannot be edited. Fixed-duration tasks end automatically. Accuracy tasks require every attempt before count entry. Counts begin blank; invalid values cannot save. Cancellation, backgrounding or leaving a live test cancels without saving. Retrying clears the entry. Timers reuse keep-awake and sound/haptic feedback. Assessment records are local, protocol-versioned and sanitized on restore; old data works without conversion. Existing touch benchmarks are never silently imported.

Preview example explicitly labels the entire surface SAMPLE PROFILE and shows illustrative values only. Preview state is temporary, never persisted or mixed into training data.

The separate Touch-test growth section retains the personal benchmark index: earliest positive self-counted 30-second result establishes 100; subsequent results show `round(latest / baseline × 100)`, without an upper cap. It is labeled as growth, never OVR. Zero before a positive baseline stays unrated. Saved benchmark data supplies the trend and history; sessions never increase the index.

## Position in onboarding

Position is the first question after welcome: Goalkeeper, Defender, Midfielder, Forward or Still exploring. Every fresh onboarding/replay draft starts unanswered, and Continue requires an explicit choice. The flow now has six question/summary steps. A chosen answer survives Back within that draft. The summary includes position. Settings exposes Position separately and within all training preferences; legacy users may leave it unset while editing other preferences.

The chosen focus remains primary. Generated daily sessions keep two focus drills where available; supporting drills rotate within position-relevant existing skill families: goalkeeper/defender use passing and ball control, midfielder passing and weaker foot, forward dribbling and ball control. Still exploring and legacy unset positions retain balanced existing behavior. Goalkeeper options promise ball work/distribution only, with no specialist keeper curriculum added. Equipment/space eligibility and deterministic calendar rotation remain authoritative. Position-only edits or replay answers preserve manually customized drill plans. Other substantive preference changes retain existing plan regeneration behavior.

`Profile.position` is optional for backward compatibility. Restore retains recognized positions and drops only malformed position values; old saves continue without forced onboarding or cleared progress. New onboarding validates position explicitly. All existing sessions, assessments, benchmarks and replay data remain intact.

## Saved replays and daily time

Personal clips can be explicitly saved after analysis. My replays stores the copied video and validated tracking data locally, with limits of 10 clips and 200 MB. Native media lives in app Documents; browser previews use IndexedDB blobs. Opening a saved replay does not require another analysis request. Individual deletion and clearing replay storage require confirmation; replay-only recovery preserves training preferences and history. Sample clips remain separate. Unsaved selected clips are temporary.

Today offers 10, 15, 20 or 30 minutes for the current local calendar day. The optional override survives reopening, expires at the next local day and never edits weekly preferences. Active sessions keep their original timing. Today totals, per-block previews and newly started sessions use the same effective duration; My Plan continues to show the usual schedule.

## Drill demonstrations

All 28 drills have labeled top-view movement schematics, which show direction rather than measured technique. Two bundled filmed examples are available: sole-roll foot contact and marker slalom. The sole example demonstrates one-foot contact; written instructions explain alternating feet. Remaining drills retain schematics and instructions without pretending to have filmed demonstrations. Source, licensing and review limits are recorded in assets/drill-demos.

Demonstrations start collapsed and paused, expose normal/half-speed playback, and pause on blur or background. They appear in drill details and pre-timer setup, and unmount before timed practice so video playback never competes with the drill clock.

## Simplification review, November 6, 2026

The user's critique identified clutter and too many competing actions. The taste skill's redesign audit was applied contextually to native product UI: variance 3, motion 1, density 2. Existing forest identity, typography, controls, accessibility and themes remain. No new animation, decoration or dependencies were added. Marketing-specific SEO, marquee and bento patterns do not apply. Audit: work/simplification-audit.md. Browser review covers 390px/320px primary screens and changed navigation paths.
