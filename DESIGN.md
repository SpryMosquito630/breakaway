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

The bundled editorial photo `assets/training-editorial.webp` is tightly cropped in the session panel and used on onboarding editorial breaks. Welcome uses the footage documented below. See `assets/README.md` for tracked provenance. Category icons identify library rows. Movement diagrams are specific to the drill and appear only in guidance/detail contexts, never as repeated decorative thumbnails. Actual drill instructions remain intact; operational reading is progressively disclosed.

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

Drill details and pre-timer setup share one instruction flow. Sole rolls and marker slalom lead with visible, paused filmed examples. Playback uses one Play/Pause/Replay control and a Slow 0.5× toggle. Clips play offline, pause on blur/background, release on unmount, and never remain mounted once timed practice starts, including paused timed blocks.

The other 26 base drills lead with labeled top-view movement guides; the two keeper drills and custom drills without a guide use written instructions. All 30 starter drills have a specific authored observation cue and common mistake, separate from any measured result. Custom drills never inherit starter feedback. One observation cue stays visible; selected-stage steps, mistakes, tips, full target guidance and source credits share one Instructions & notes disclosure. This content is illustrative and not coach reviewed.

Filmed coverage remains two drills. The sole clip illustrates one-foot contact, with its limitation visible and alternating-foot steps authoritative. The slalom shows weave, turn and return; written spacing/pace remain authoritative. Additional footage is accepted only after actual movement and distribution rights are checked. A review of 20 candidate sources found no qualifying additions for the next foundational drills; no unrelated clip is substituted. Both existing clips were re-encoded at 960×540, silent H.264 CRF27 faststart, totaling 1,994,802 bytes (35.1% smaller). License, provenance, hashes and limits are recorded under assets/drill-demos.

## Simplification review, November 6, 2026

The user's critique identified clutter and too many competing actions. The taste skill's redesign audit was applied contextually to native product UI: variance 3, motion 1, density 2. Existing forest identity, typography, controls, accessibility and themes remain. No new animation, decoration or dependencies were added. Marketing-specific SEO, marquee and bento patterns do not apply. Audit: work/simplification-audit.md. Browser review covers 390px/320px primary screens and changed navigation paths.

## Focused shipping scope

The default app exposes training, drills, progress and reminders. Today’s drills are visible. Laptop-dependent replay and all other experimental products are hidden behind an explicit developer build flag, including their screen dependencies. Privacy and recovery protections are functional boundaries, not merely hidden buttons. Age onboarding is neutral and unanswered; local age ranges never become cloud profile data. No subscription benefits or public leaderboards are advertised. See docs/implementation-status.md.

## Drill guidance distillation — November 8, 2026

Detail and pre-timer setup prioritize title, compact requirements, a movement visual, one cue and one Instructions & notes disclosure. Licensed full-frame posters replace black paused video regions; Play is secondary to the pinned Start action. Footage limitations remain concise and visible. Detail uses a quiet bookmark action and compact challenge chips; setup places optional screen-lock settings after guidance. Running targets, timers, saved data, skill profile and navigation remain unchanged. Audit: `work/distill-ui-audit.md`.

## Recorded onboarding reference, November 8, 2026

The user requested the full visible Footly onboarding sequence. Breakaway now uses 39 screens with dark forest/lime quiz and photo beats, purple plan/profile beats, bold Archivo headings, pinned pill CTAs, numbered question rows, an interactive position pitch, a horizontal training-style photo carousel, optional explicit metric pickers, editable local week notes, colored goals, and an onboarding-only snapshot/style carousel. Full source map and data audit: `breakaway-onboarding-spec.md`.

Every fresh or replay draft starts unanswered. Required training inputs stay explicit; only reference-verified screens offer Skip, while optional private notes can remain blank. No questionnaire answer creates a skill score, body assessment, calorie prescription, fabricated loading sequence or 12-week forecast. Account/referral/Health controls are omitted because the shipping app does not implement them. Skill profile remains the sole persistent skill-rating destination. Existing replay history, age restrictions, custom-plan semantics and recovery fences remain intact. Optional local notes are allowlisted, sanitized and excluded from connected payloads; reminders use the existing scheduler only after final save.

## Onboarding card reference refinement

The onboarding-only snapshot now follows the recorded collectible card's compact 0.77 width/height proportion, shallow crowned shoulders, near-vertical stepped sides and rounded, rippled foot. Native SVG supplies three metallic contour lines, clipped dark foil facets and diagonal metallic ribbons. The unset preview is black/gold; Forest, Volt, Slate, Plum and Blue remain explicit optional choices, with no initial selection. Each finish uses the same ornamental geometry. Breakaway branding, left-aligned real test OVR/position, centered neutral portrait, name band and six compact saved-test ratings replace the previous generic green shield. Unassessed ratings remain dashed. The card remains inside onboarding only; no new destination, generated score, photo upload or persistent player-card feature is introduced.

## Welcome field video — November 8, 2026

Welcome alone uses a licensed, silent approximately ten-second indoor urban astroturf shot sequence by Ruben Velasco (Mixkit 2918), beneath the headline and transparent Get started footer. The player takes on a defender, changes direction, advances and strikes around 7.9 seconds before the ball travels toward goal. The 540×1170 portrait crop keeps the shooting foot visible at contact and follows the ball afterward; the loop resets with an intentional cut. Bundled welcome media totals 1,318,340 bytes. Source rights, transformations and hashes are recorded under assets/welcome; chronological 4fps crop evidence is in work/welcome-footage-review/extended-final-portrait-sequence.jpg. The existing marker-slalom drill example remains intact.

A matching bundled poster covers loading/error and remains static until the system Reduce Motion preference resolves false. Inactive/background, blurred replay, leaving welcome and unmount pause/release the owned player. It never claims the app audio session, prevents device idle, publishes Now Playing controls, or updates the practice clock. All later onboarding surfaces retain their existing imagery/layout.

## Quiz tap-to-continue — November 8, 2026

The numbered single-choice quiz and position pitch now advance after an explicit tap: frequency, club, ambition, tracking, blocker, motivation, technical focus, position, experience, training goal, consistency and food source. Those screens omit Continue; only reference-verified screens retain Skip. Level, commitment, playstyle, diet, multiple-choice, text, pickers, schedule and summary screens retain their explicit actions. Selection feedback lasts 180 ms, or advances on the next event turn with Reduce Motion. No answer is selected automatically.

Position plus pitch abbreviation, and experience plus year range, update atomically before advancing. One tokenized pending transition rejects repeated taps and stale callbacks; navigation, cancellation, blur, background and unmount invalidate it. Back retains only this draft’s chosen answers. This changes onboarding navigation only, with no practice auto-start or history/age behavior change.


## Reference skips and horizontal scene handoff — November 8, 2026

Generic Skip rows are removed. Measurements, training/body goal and plan comparison use “Skip quiz”; plan brief uses “Skip”; reminders use “Not right now”. Private dietary/allergy/measurement/week notes remain optional, and notification decline clears the temporary reminder request. No question-number changes were made.

A 260 ms horizontal body/footer handoff follows the observed reference transition. Forward exits left/enters right, Back reverses; cubic Bézier (0.22, 0.61, 0.36, 1), transform only, native driver on iOS/Android. Header, progress, background and video remain stationary. Stable scene keys preserve outgoing scroll position; scenes are inert during motion. Interruptions cancel stale completions and settle at zero translation; Reduce Motion has no spatial transition. Full reference/data notes remain in `breakaway-onboarding-spec.md`.

## Answer feedback cards — November 8, 2026

Five evidenced contexts now show a nonblocking floating feedback card: club teams, starting-lineup ambition, consistency/enjoyment motivation, final Ball only equipment and a final four-day schedule. Known reference headings remain; unsupported selection, medical and training-load promises are rewritten around actual choices. No scores or saved data are created.

The card is independent of the question scene and does not delay auto-advance. It anchors above the measured active footer or safe area, enters with 220 ms opacity/12-point upward translation, holds 2,400 ms and exits over 160 ms. Reduce Motion removes movement; interruption/replacement cancels timers and native animation completions. No X or touch interception is added. Source evidence, exact triggers and accessibility handling are recorded in `breakaway-onboarding-spec.md`.

## Position-specific playing styles — November 8, 2026

The onboarding inspiration carousel now follows the detailed pitch choice: strikers, wide players, attacking/central/defensive midfielders, left/right fullbacks, centre backs and goalkeepers have relevant named-player groups. Still exploring mixes four roles; legacy broad-only drafts receive representative groups. The 20-player catalog keeps persisted names compatible and keys photos by stable ID. Every fresh choice remains unanswered; changing position clears an incompatible inspiration atomically, keeps a compatible one, and Continue validates against the visible group. Photos are bundled with per-group source and license links; full provenance lives in `assets/player-styles/manifest.json` and `LICENSE.md`.

The playstyle frame follows measurements from the clean 444×960 recording at approximately 1:29: card x67/y182, width310/height669, photo about390 high, title y84, and CTA y880. The native card therefore uses 70% of viewport width (capped at 360), 69.7% of viewport height (minimum 500 for readable content), a photo at 58% of card height, centered side insets and a 7.4%-width gap. At390×844 this is a273×588 frame with a341-point photo. The position badge and selected check sit on the photograph; an SVG fade meets the compact body and deliberate lower breathing room. This slide omits the bulky brand/progress rows, retains accessible Back/Cancel controls in a separate 48-point row, and uses a readable 24/30-point heading with normal tracking and natural wrapping on narrow phones. The controls, question and subtitle remain outside the scrolling carousel content so selection focus or scrolling cannot move or clip the question. The whole frame fits above the pinned action at a comparable phone aspect ratio; shorter phones can scroll vertically. Group-specific licensing disclosure remains below the carousel. Existing selection, storage, transition and saved training behavior stays intact.

## Measurement wheel interaction repair — November 8, 2026

Height/weight now select the centered row while the player drags or flings, then snap at 32-point boundaries. Taps commit and center the tapped row. The containing page pauses vertical scrolling during wheel interaction, and native momentum-end plus a web/idle fallback settle the row. Gesture state is initialized once per mounted wheel and survives controlled readout updates.

Metric/imperial changes remount the wheel at the nearest supported integer row for the existing canonical cm/kg value. Unit presentation and initial viewport positioning do not write answers; unanswered readouts remain dashes. Converted fractional cm/kg values display as matching rounded rows; an explicit new selection commits the selected unit value. Existing optional Skip, local-only metadata, bounds, age/history protections and other onboarding behavior remain unchanged.

## Reference measurement presentation — November 8, 2026

The measurement screen now follows the supplied clean reference stills: compact 28/34 heading, an 8-point subtitle gap, a 204×44 unit segment, two grouped readouts and 32-point wheel rows with three visible rows. Faded edges and a flat dark center pill replace the outlined green selection. Imperial height has independent feet and inches wheels with a combined `5' 9"`-style readout; weight uses lbs. The extra instruction line and measurement CTA arrow are removed. Branding, privacy subtitle, optional Skip and other onboarding screens remain.

Fresh feet/inches are independent unanswered draft parts; choosing only one cannot create a height. Feet 2 restrict inches to 8–11, feet 7 to 0–10. A feet change that invalidates the chosen inch clears the inch and pending canonical height until the player explicitly chooses a valid partner. Existing canonical metric height may derive both display parts on a unit flip without writing or losing precision. Wheel row geometry is shared by snapping/selection, and cancelled gestures cannot commit late movement.

## First-question entry — November 8, 2026

The intro’s “I’m ready” opens Question #1 with a 240 ms opacity crossfade instead of the general horizontal scene slide. The static intro photo, outgoing body and CTA fade out while the first question appears as one group. Header/back/progress stay stationary. No blur dependency, row stagger or spring is introduced. Back, the first answer-to-Q2 handoff and later scene transitions retain existing behavior. Reduced Motion and interruption use the same immediate-settle/token cancellation path.

The pre-question intro also has its own entrance beat: the headline starts 80 points lower, then the group rises while the supporting copy and checklist fade in together. Welcome-to-intro uses a stationary 240 ms dissolve instead of combining a horizontal handoff with the vertical reveal. The rise begins immediately and decelerates over 900 ms; supporting content uses a separate native opacity animation with a 160 ms delay and 600 ms duration. This removes the previous 180 ms pause, slow-fast-slow 1,100 ms rise and thresholded opacity interpolation. Welcome’s existing mounted background remains in a stable sibling layer only through the 240 ms dissolve, fading out while the intro photo fades in; it then unmounts and releases its player. This avoids a dark gap or a restarted video during the handoff. The intro photo fades out on exit to Q1; crossfade opacity eases continuously over 240 ms. These are tuned implementation values, not exact timings recovered from the recording. A 15 fps inspection at 14–16.8 seconds confirms vertical staging; a 30 fps inspection at 17.7–18.4 seconds shows roughly seven frames of Q1 overlap. The existing final layout and Breakaway copy are preserved. “I’m ready” does not wait for this reveal; an early tap freezes the visible intro for its outgoing dissolve. Back replays the entrance. Reduced Motion shows the settled content immediately; background, blur and unmount stop both owned animations.

## Core app continuity with onboarding — November 8, 2026

Train, Drills and details, Progress and history, Settings and preferences, and Practice and recap now share onboarding’s forest background #080F0B, panel #151E16, lime #B6FF3B and olive selection fill through centralized semantic tokens. Archivo Bold titles and headers, pill actions and chips, quiet outlined panels and a tonal timer surface preserve the existing compact hierarchy. Back controls use the primary ink role. Existing drill media, instructions, disclosures and empty progress states remain intact; no new widgets, claims or capabilities were added. Weekly day cells are 48 points high, appearance choices expose checked state on native and web, and History uses the singular session label when appropriate.

Fresh installs default to Dark without saving a preference. Explicit stored Light, Dark and System choices restore unchanged. Light adapts the same identity with pale green-neutral surfaces, forest actions and dark ink; inverse action roles remain readable in both themes. Theme tests enforce 3:1 control-boundary and 4.5:1 text/action contrast. Practice clocks, accounting, alerts, reminders, assessments and local history retain their existing behavior. Browser review covers the core navigation, drill search/details/save, warm-up/setup/run/pause and empty test profile; device verification is recorded separately.


## Onboarding materials and action photography — November 8, 2026

The 39-step reference pass refines numbered rows, local selected halos, editorial layouts, purple setup surfaces, reminder previews, feedback cards and metallic player-card detail. Shared navigation, no-preselection, measurement privacy and real rating behavior remain intact. Nineteen visible player images now use credited action photography with whole footballs inside the portrait crops; the shortened bottom fade preserves the ball. Haaland remains compatible with old saved answers but is outside visible rosters. See `docs/onboarding-visual-parity.md` for scope and verification limits.

## Player carousel sizing, centered selection and goal video — November 9, 2026

The playstyle slide now uses a single width-based scale from the clean 444×960 reference: heading at y84, card at x67/y182, 310×669 frame and 390-point photograph, with a 33-point inter-card gap. At 390 wide this yields a 272.3×587.6 frame and 342.6-point photo. Removing the 48-point back-control row prevents the heading and cards being displaced. Back is omitted on the playstyle and position confirmation screens as in the reference; replay Cancel remains. Native safe insets and larger text can expand the layout, and shorter displays retain vertical scrolling and photo credits.

The user's November 9 override applies only to the player inspiration carousel: its first relevant player is selected on entry, and the nearest centered card becomes selected as the carousel moves. A compatible previous choice is restored at its own card. Midpoint calculations clamp overscroll; initial positioning stays stable while selection changes, taps scroll to their card, and native/web scroll and momentum events update the choice. This does not auto-advance. Other questionnaire screens remain unanswered until chosen. Role changes still clear incompatible choices before the carousel chooses the first relevant player.

Position confirmation uses a dedicated 4.6-second licensed penalty take filmed from behind the goal, with the ball visibly entering and deforming the foreground net. The portrait crop preserves that action. Source, Free License and hashes are in `assets/position-confirmation`. The same silent player ownership, motion-preference poster, loading/error fallback, blur/background pause and release behavior is shared with welcome. Welcome's footage is unchanged. This is a licensed substitute, not identical private-reference footage.

## Measurement defaults, comparison and action timing — November 9, 2026

The user's explicit follow-up replaces the earlier unanswered measurement policy. On first entering Height & weight, Metric starts at 175 cm and 70 kg, matching the recording's initial settled measurement state at approximately 101–106 seconds. Imperial converts those same canonical values to 5′9″ and 154 lbs; later recorded 5′11″ is a subsequent wheel edit, not the initial state. Changed measurements survive Back and unit changes. Skip quiz clears both measurement notes from the draft. They remain local optional data, and visiting the slide does not save a profile. Other questionnaire defaults remain unchanged.

The “A week that works for you” comparison now uses the reference's narrow equal-height columns: 114×268 at 444 width, 42-point gap, compact cadence values above the bars and captions below. The values reflect actual frequency/commitment answers (for example, “A few / times a week” and “2–3× / a week”) instead of wrapping full answer sentences into the bars. No analysis score or invented frequency is added. This identified slide is the comparison after notifications, not the later seven-day schedule editor.

The complete recording was audited for action presence. All observed numbered single-choice/pitch screens already omitted the primary CTA and advanced on selection. The newly corrected difference is temporal: assessment, strengths, growth and fuel initially reveal content without a primary CTA, then show a manual action. Their footer actions now appear after approximate observed heading-to-action delays of 3,500/2,000/2,500/1,500 ms respectively (recording samples bound these to roughly ±500 ms; these are tuned delays, not recovered source constants). The footer reserves its eventual height and does not mount a hidden interactive button. Reduce Motion shows the action immediately. Step changes, blur, background and unmount cancel the owned timer; foreground/focus restart an interrupted reveal. No editorial step advances or saves automatically. Equipment uses the reference's Next label. Nutrition/permission wording stays adapted to real app capabilities.

## Reference bar growth and editorial entrances — November 9, 2026

Plan comparison and the week comparison now grow their colored bars vertically, with a small upward settle and a separate upright label entrance. Only the gradient layer scales; label glyphs retain their size and travel with the rising top edge. Final bar dimensions, captions and comparison data stay unchanged. Native Animated drives scale/translation/opacity, without per-frame height or width updates. The 750 ms growth, 120 ms start offset, 10-point settle and eased curve are implementation choices within the observed settling window, not recovered source constants. The source shows minor lower-edge drift; an exact transform origin cannot be established.

Assessment rows rise/fade at 300 ms intervals. Strengths and growth panels arrive in groups roughly 500 ms apart, while fuel checklist groups have a shorter sequence. Actual assessed horizontal rating fills grow from the left; unassessed rails remain empty. No fabricated counters, nutrition targets or source sample ratings are introduced. Every content group finishes before or at its existing manual action's reveal; none advances the screen. Quiz choice rows and editable inputs do not receive new staggers. The existing snapshot flip remains unchanged.

Forward handoffs now dissolve over 300 ms for body goal to plan comparison, consistency to reminders, comparison entry, assessment entry, assessment to strengths, strengths to growth and snapshot to fuel. Reminder-to-comparison and food-source-to-assessment bridge omitted source loading/dislikes screens and are deliberate adaptations. Growth to snapshot retains its horizontal entrance, consistent with the recorded purple heading moving in from the right. Other quiz and Back navigation retains the existing slide. Intro retains its earlier 240 ms dissolve.

The entrance hook owns separate Animated values for each scene, freezes outgoing values on step cleanup, stops native animations on unmount, and settles the current scene when backgrounded, blurred or Reduce Motion is enabled. Re-entering an actual step creates a fresh entrance; editing answers inside the same step does not restart it. Background/focus return retains the settled frame. Reduced Motion renders the final content immediately. Interactive controls and saved data are unaffected.
