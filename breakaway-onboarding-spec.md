# Breakaway onboarding, November 8, 2026

39 screens, adapted from the user-supplied Footly recording. The recording ends during a fuel-plan reveal; it does not show the next screen or completed onboarding. The implemented final action opens Breakaway’s existing Train destination.

Source evidence: `work/footly-recording-review/screen-spec.md` and local reference frames. Reference footage and extracted frames are ignored working artifacts, not distributed app assets.

The meaningful reveal is the player’s own intended routine alongside their current frequency, followed by the actual days and time they select. The hands-on moment is the position pitch, training-style carousel and editable week. The achievable promise is a starter session that respects chosen focus, position, experience, equipment, space and time. No score or fitness claim follows from the questionnaire.

## Act 1: context and reflection

| Screen | Copy / interface | Purpose |
| --- | --- | --- |
| 1 Welcome | “Getting better starts here.” Muted looping field video, Breakaway wordmark, Get started; static poster with Reduce Motion | Existing account-free app entry |
| 2 Before we start | “Serious about your game? Start with a plan.” Photo, three outcomes | Explain the useful result |
| 3 Frequency | Recorded Q1, four numbered options | Optional self-reflection |
| 4 Club | Recorded Q2, four numbered options | Optional playing context |
| 5 Club name | Recorded Q2.5, text field | Optional local note |
| 6 Level | Academy, College, Semi-pro, Professional, Amateur | Optional playing context |
| 7 Commitment | Steady, Serious, All in with recorded descriptions | Optional realistic intention |
| 8 Biggest goal | Recorded Q3, four options | Optional aspiration |
| 9 Tracking | Recorded Q4, four options | Optional reflection |
| 10 Blocker | Recorded Q5, four options | Optional reflection |
| 11 Main goal | Recorded Q6, four options | Optional motivation |
| 12 Technical focus | Four supported Breakaway focus families | Required actual matching input |
| 13 Equipment | Ball only, markers, wall, partner; multiple choice | Required actual eligibility input |
| 14 Position | Recorded Q8, interactive pitch and Exploring | Required position input |
| 15 Position confirmation | Large position abbreviation, full photo | Explain position’s supporting role |
| 16 Playstyle | Four named player photo cards, explicit selection | Kevin De Bruyne, Pedri, Sergio Busquets and Declan Rice; playing-style inspiration |
| 17 Experience | Recorded Q9, four year ranges | Required experience; under one year maps to New, others to Some |
| 18 Height and weight | Metric/imperial columns, blank readouts until tapped | Optional local notes only |
| 19 Training goal | Strength, steady practice, recovery | Optional, replaces calorie/body-weight targeting |
| 20 Plan comparison | Two bars: random practice vs clear focus/days/tracking | Show actual app capabilities |
| 21 Consistency | Recorded Q11, four options | Optional reflection |
| 22 Reminders | Real training-notification preview and opt-in | Permission requested only after final save |
| 23 Routine comparison | Current frequency vs commitment, both from answers | Honest reflection, no fabricated analysis |

## Act 2: make the plan concrete

| Screen | Copy / interface | Purpose |
| --- | --- | --- |
| 24 Plan brief | “Let’s turn your answers into a week.” Purple surface and summary | Bridge to actual setup |
| 25 Identity | Optional nickname, required neutral age range | Personalization and existing age protections |
| 26 Days | Seven day toggles, selected count and day summary | Required training schedule |
| 27 Existing week | Seven expandable activity rows and optional HH:MM | Optional local notes; does not rewrite chosen practice days |
| 28 Duration | 15, 20 or 30 minutes | Required actual session length |
| 29 Space | Small or open space | Required actual eligibility input |
| 30 Aspirations | Seven recorded colored multiple-choice rows | Optional personal goals; technical focus remains authoritative |
| 31 Diet | Six recorded choices | Optional fuel-checklist note |
| 32 Allergies | Eight recorded choices, including None | Optional personal reminder; no meal filtering claim |
| 33 Food source | Recorded Q17 choices | Optional practice-day context |

## Act 3: reflect, then practice

| Screen | Copy / interface | Purpose |
| --- | --- | --- |
| 34 Answer summary | Position, focus, availability and setup on photo | Explicitly self-reported summary |
| 35 Foundation | Chosen style/ambition and actual schedule | Encouragement grounded in choices |
| 36 Starting line | Six real assessment categories, recorded/not assessed | Point to existing Skill profile without inventing ratings |
| 37 Snapshot | Shield card, silhouette, name, position, six real test ratings or dashes, five looks | Onboarding-only visual snapshot, no separate persistent player-card destination |
| 38 Fuel checklist | Water, usual meals, personal ingredient reminder | Practical checklist, no medical nutrition output |
| 39 Starting session | Actual matched drill names, warm-up and durations | Final explicit save, then existing Train screen |

## Reference adaptations

Breakaway keeps its own branding and legitimate bundled imagery. The training-style carousel uses verified reusable photographs of Kevin De Bruyne, Pedri, Sergio Busquets and Declan Rice, with the recorded role descriptions/tags and a compact in-app photo-credit disclosure. Source, creator, license, transformations and hashes are tracked under `assets/player-styles`. No affiliation or endorsement is claimed. Green quiz and photo screens alternate with the recorded purple plan/profile treatment. Headers, pinned CTAs, number-circle rows, pitch choices, wheel columns, week rows, colored goals and snapshot carousel follow the reference interaction vocabulary.

The existing application has no required account, referral validation or Apple Health integration, so those unsupported controls are omitted. Tracking permission is not requested. There is no fabricated algorithm progress, plan-generation delay, 12-week forecast, questionnaire OVR, skill baseline comparison or body-frame judgment. The recorded calorie/body-weight goal and macro prescriptions become a training-routine choice and non-prescriptive checklist. The name is optional and the date-of-birth/sex comparison becomes the existing age-band gate. No paywall or trial is added; none is visible in the supplied recording.

## Data audit and behavior

All drafts, including Replay onboarding, begin `{}`. No age, position, schedule, experience, equipment, metric, card style or reflection answer is selected automatically. Back retains only this draft’s explicit choices. Only reference-verified screens offer Skip. Diet, measurements, allergy notes and other optional private notes can remain blank; single-choice quiz rows require an explicit choice. Core training questions require explicit answers. Cancelling replay leaves saved data unchanged. New optional inputs are not sent to any server.

| Data | Persistence and actual use |
| --- | --- |
| Age range | Existing `Profile.ageBand`; existing under-13 restriction cannot be relaxed by replay |
| Position | Existing `Profile.position`; supporting drill matching. Precise pitch abbreviation is an optional local note |
| Technical focus, experience, days, duration, gear, space | Existing Profile and matching/eligibility behavior; no change to accounting or drill content |
| Frequency, club/name, level, commitment, ambition, tracking, blocker, motivation, years, consistency, playstyle, routine goal | Optional allowlisted `AppData.onboardingAnswers`, used in onboarding reflections; do not produce validated ability claims |
| Nickname, club name | Optional local strings, trimmed and length-bounded |
| Height and weight | Optional local bounded values in cm/kg, converted for display; no caloric calculation or plan adjustment |
| Existing week | Optional allowlisted weekdays/activities and validated HH:MM; notes, not a fixture-aware training engine |
| Aspirations, diet, allergies, food source | Optional local allowlists used for summary/checklist only; no meal generation or allergy-safety promise |
| Snapshot look | Optional local allowlist; onboarding snapshot presentation only |
| Reminder request | Temporary draft flag; only final completion invokes the existing optional OS permission/scheduler workflow |

Optional notes survive local restoration and are excluded from cloud/AI training payload allowlists. Developer cloud restoration retains existing device-only notes. Malformed optional metadata is discarded field by field without forcing onboarding or losing valid history. Notes currently have no separate post-onboarding editor; replay intentionally starts blank. This is a local notebook-style reference adaptation, not a new connected player-profile product.

Completion reuses the existing replay-aware `completeOnboarding` path: valid history, benchmarks, assessments, favorites, active session and other AppData fields remain. Custom plan preservation follows existing equivalent-preference/position-only rules. Recovery backup and read/write fences remain authoritative.

## Verification

TypeScript, all 163 tests, Prettier and production iOS/Android/web exports pass. Added domain tests cover blank required answers, constraints, optional metadata isolation/roundtrip, replay history/custom-plan/age preservation, and exclusion from cloud/AI payloads.

Rendered review covers the entire flow through completion and reopening; blank replay drafts; checked player choices; metric/imperial conversion; the editable week and invalid-time feedback; all five card looks; and replay cancellation. At 320px the day controls remain 44×52 with horizontal scrolling and no page overflow. The onboarding shell owns its safe-area insets; Android system Back returns to the previous question. Physical-device permissions, notification delivery and hardware Back still need device verification.

## Tap-to-continue behavior

Reference-style single-choice quiz screens (3, 4, 8, 9, 10, 11, 12, 14, 17, 19, 21 and 33) now advance after the user taps an answer. Their Continue action is removed; only reference-verified Skip screens retain a secondary Skip. The visible checked state lasts 180 ms; Reduce Motion uses a zero-delay queued transition without animation. All other screens keep their existing explicit primary action. A selected answer is committed before its transition, and rapid taps cannot overwrite it or queue another transition. Back/Cancel, blur, background and unmount cancel pending callbacks without persisting the unfinished draft. Returning to a chosen question does not advance it until another explicit tap.


## Reference secondary actions and question transitions

Secondary controls now appear only where the recording supports them: measurements and training/body goal show “Skip quiz” (reference frames detail/cue_0007 and inventory/cue_0019); plan comparison also shows “Skip quiz”; plan brief shows “Skip” (detail/cue_0010); reminders show “Not right now” (gaps/cue_0010). The reference’s welcome/auth Skip and Apple Health decline have no corresponding connected integration in Breakaway. The welcome stays account-free.

The generic Skip row is removed from frequency, club, club name, level, commitment, ambition, tracking, blocker, main motivation, playstyle, consistency, goals, diet, allergies, food source and weekly notes. Optional private notes remain optional: diet Continue accepts blank; metrics retain Skip; allergy, goal and week notes already allow blank. Core setup validation remains explicit. Notification decline clears the temporary reminder request.

A focused 65.7–66.5 second excerpt was inspected at 10 fps; its equipment-to-Q6 change shows a short horizontal scene handoff. Breakaway uses simultaneous full-width translation over 260 ms with cubic Bézier (0.22, 0.61, 0.36, 1): forward exits left and enters from right; Back reverses that spatial direction. This is a chosen close match, not a claim of precisely measured source duration. The body and footer move together; header, progress, background and welcome video remain outside the animation. Existing 180 ms answer feedback precedes it. Primary motion weighting is native consumer polish (Jakub), with fast, restrained timing (Emil).

Outgoing and incoming scenes retain distinct stable keys, preserving reading position during exit. Both are inert and hidden from accessibility until the handoff ends. No live video is retained in a scene snapshot. Repeated inputs are ignored while moving; Back interrupts to the previous logical question. Backgrounding, focus loss and Reduce Motion settle the chosen destination at zero translation and invalidate stale native animation callbacks. Reduce Motion uses an immediate screen change with no spatial movement. Original recorded question labels, including Question #2.5, remain unchanged at the user’s request.

## Answer feedback overlays

The recording shows floating feedback cards independent of the horizontally moving question. Club and starting-lineup cards are directly visible in `frames/frame_0003.jpg` and `inventory/frames/cue_0007.jpg`; the latter stays visible while Q3 slides to Q4. Focused footer review also reveals “A ball is enough to start” and “Consistent beats intense”. The recorded four-day week callout is “Four days, serious rhythm”. Additional working evidence is in `work/onboarding-popups-review/`; it is not shipped as an app asset.

| Explicit trigger | Feedback heading | Breakaway adaptation |
| --- | --- | --- |
| Professional/pro-academy or grassroots/amateur club answer | Club football is real football | Individual practice alongside club sessions; no fixture-aware scheduling promise |
| Make the starting lineup | Starting spots are earned midweek | A repeatable week; no claim to predict a coach’s decisions |
| Stay consistent and enjoy the game | Consistent beats intense | Enjoyment and making room in the week; no automatic training-load promise |
| Continue after final equipment choice is Ball only | A ball is enough to start | Actual ball-only, space-eligible matching |
| Continue after choosing four distinct training days | Four days, serious rhythm | Acknowledges four chosen days; no unsupported speed/recovery split |

Multi-select equipment and weekday cards are triggered on Continue, rather than temporarily crossing a selection threshold. No feedback appears before an explicit answer, and no unobserved answer variants are fabricated. The separately visible “Consistency is a schedule problem” variant is omitted because its exact hidden-question routing was not independently verified.

The implementation uses a compact dark-green floating card, lime icon circle/border, white heading and muted body. It remains outside the question scene so automatic navigation is never delayed: the existing 180 ms answer feedback and 260 ms question slide run independently. A new matching response replaces the previous card. The card sits above the active measured footer, or above the bottom safe area when no footer exists. It has no dismissal button and never intercepts touches.

Chosen motion is 220 ms fade/rise by 12 points, 2,400 ms hold and 160 ms fade/drop, using cubic Bézier (0.22, 0.61, 0.36, 1). These values approximate the observed brief entrance/persistence/exit, not a frame-exact measurement of source timing. Reduce Motion uses an instant stationary appearance/disappearance while preserving readable hold time. Back, Cancel, focus loss, background and unmount clear the card; timer/animation generations invalidate replaced or interrupted callbacks. Web uses one polite status live region; native uses one explicit accessibility announcement, without a duplicate live region.
