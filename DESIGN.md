# Breakaway — native training notebook

## Direction

Whole-app redesign after the user rejected the first presentation as generic and too verbose. Preserve the forest/volt identity and all existing tasks/data, while replacing the landing-page hierarchy with a compact native utility. The user’s requested Impeccable, Frontend Design and Taste skills informed the critique, information editing, layout and visual review. Taste’s marketing defaults are adapted to a native product: variance4, motion2, density4.

## Hierarchy

Each screen has one job. Today opens on a180-point session panel with actual training photography, a compact week and three72-point drill rows. Plan leads with editable preferences and drills; full weekly detail is disclosed. Drills uses search and a horizontal category rail. Practice makes the timer dominant and pins operational controls. Progress prioritizes actual history; benchmarks remain secondary. Onboarding uses large selection rows and pinned actions. Settings groups related edits and contains the sole local-data and training-content notices.

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
