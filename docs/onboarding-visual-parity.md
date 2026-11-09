# Onboarding visual refinement

The supplied screen recording guided a 39-step review of spacing, typography, question rows, selected states, photo crops, purple surfaces, feedback cards and player-card materials. The implementation keeps Breakaway branding, explicit answers, optional private measurements and real test ratings.

## Changes

- Numbered quiz rows use compact gutters, a leading selected check, lime outline and restrained local glow.
- Editorial photo screens, inline position confirmation, reminder preview and purple setup screens have individual layouts rather than one repeated template.
- Player cards use a smaller metallic silhouette with foil detail and legible real ratings or unassessed dashes.
- Nineteen visible player inspirations use bundled, credited action photos with a football in frame. Portrait crops protect heads and balls at normal and narrow widths. Haaland remains in saved-data compatibility only.
- The regular Train, Drills, Practice, Progress and Settings screens share the onboarding's forest palette, heading family and rounded controls. Existing explicit appearance preferences remain respected.

## Verification

- All 39 steps were walked in an isolated browser profile through successful plan creation, with required, optional and selected states checked.
- Narrow 320-point player layouts, role-specific rosters, search, drill detail, timer start/pause, progress and appearance persistence were checked.
- Native Expo Go on an iPhone 17 simulator was checked for safe areas, intro-to-question entry, unselected answers, tap-to-advance, selected styling and Back persistence. Replay was cancelled without saving over the existing profile.
- Typecheck, formatting, 193 tests and web/iOS/Android production exports passed.

The compressed recording cannot establish exact font identity, native shadow kernels or easing constants. This is a reference-guided visual match, not a claim of pixel-identical rendering. The complete local audit and private reference frames are excluded from the public repository. Full native large-text and every-step native screenshot comparison remain outside this verification.

## Footer, wheel and comparison repair — November 8, 2026

The shared pinned action area now leaves the screen background visible. Editorial photos, green atmospheric questions and purple setup scenes continue behind the button through the bottom safe area, including level, commitment, assessment, strengths, growth, snapshot, fuel and final plan.

Height/weight wheel edges fade the numerals themselves instead of placing an opaque green-black SVG over the atmospheric background. An `Animated.ScrollView` drives the fade with the native animation driver on iOS/Android; existing selection, snapping, cancellation and unanswered behavior stay intact.

The plan comparison uses shared 228-point stages so its short red and tall green bars share a baseline and captions align. Both comparison screens use flexible columns capped at 140 points, with smaller readable answer text and captions outside the bars. At 320/390/430-point widths the columns retain 124/140/140 points respectively, using 24-point page gutters and a 24-point gap. Large text can expand the bars and scroll above the pinned action.

The onboarding card now rises and makes one 1,400 ms turn around its vertical axis: readable front, foil reverse, then readable front. Changing the finish does not replay it. Reduced Motion shows the final front; focus, background and unmount cancel safely. Ratings remain saved test values or dashes.

The combined repair passes typecheck, formatting and all 193 tests. Browser review walks all 39 steps, checks the affected photo/green/purple footers, both comparisons at narrow phone widths, explicit measurement selection, card reverse/front rendering and a finish change without a repeated spin. Replay is cancelled without replacing the profile. Native iPhone 17 review confirms unanswered measurements, explicit tap and drag selection, aligned snapping and numeral-only fades without a runtime error. These checks do not establish measured frame rates or full large-text parity.

### Native follow-up QA

CUA inspection on the iPhone 17 simulator (iOS 27) walked an unsaved synthetic replay through the card step. Measurement entry showed unanswered dashes; tapping the centered height selected 160 cm, and dragging the weight wheel changed 107 to 108 kg and snapped to the matching centered row. Numeral fades retained the atmospheric background, with no first-touch jump or native-driver error observed.

Re-entering the card step visibly showed an edge view, foil-only back and readable front. The settled front restored its accessibility text. Selecting Forest changed the material while retaining the readable front. Cancelling replay returned to Settings with the original Ball control / Position not set profile, Dark appearance and reminders off. The synthetic measurements, midfield position and practice day were not saved. Screenshots were inspected directly in the CUA tool output; standalone native image files were not saved.

## Player sizing and goal background — November 9, 2026

Playstyle proportions now follow the clean 444×960 recording using one width scale: card 310×669, photo 390 high, x67/y182, title y84. The reference's single-line heading and original subtitle replace the extra Back row and displaced layout. Playstyle and position confirmation omit Back; replay Cancel remains. Credits stay available below the carousel with vertical scrolling on shorter or larger-text displays.

Per the user's updated instruction, playstyle alone selects its first relevant card on entry and updates selection to the nearest centered card while scrolling. Taps center their card. Prior compatible choices restore at their own offset. Position/roster changes select the new first card if needed; other questions retain explicit unanswered defaults. Stable initial offsets prevent selection changes from moving a gesture.

Position confirmation has a dedicated silent, bundled penalty video with visible ball/net impact, reviewed frame by frame in the final portrait crop. Provenance and Free License verification are in `assets/position-confirmation`. It shares welcome's safe playback lifecycle and static reduced-motion/error poster. Welcome retains its existing clip.

Focused validation: TypeScript, formatting and 23 tests covering carousel midpoint/overscroll, role compatibility, draft safety, scene cancellation and video lifecycle passed. Final browser review at 444×960 measured the card at x67/y182, exactly 310×669; at 390×844 it measured x58.625/y159.86, 272.3×587.63. The subtitle uses 14 points at the reference scale to retain its single line and the measured card position.

The isolated browser walkthrough confirmed no Back arrow on either changed screen, Kevin selected with Continue enabled on first entry, rightward centered selection of Pedri then Rice, reverse selection of Pedri, and restoration of Pedri after Continue and Back. The next question remained entirely unanswered. The dedicated goal video was loaded and playing muted at 4.6296 seconds; its chronological portrait review shows net impact. Browser evidence: `externaloutputs/breakaway-player-carousel-390.png` and `externaloutputs/position-goal-video.png`. No new native-device QA was performed for this follow-up; prior native results above describe the earlier implementation only.

## Full-flow CTA audit and reference measurement defaults — November 9, 2026

The complete 258-second recording was reviewed at 1 fps; the four editorial action appearances were inspected at exact 0.5-second intervals. The evidence distinguishes absent quiz buttons, temporary staged reveals and manual CTAs; it does not support timed editorial advancement. Full local evidence/map: `work/onboarding-cta-audit/cta-map.md` and `work/onboarding-cta-audit/timing/`.

| Current steps | Recorded primary action and implementation |
| --- | --- |
| frequency, club, ambition, tracking, blocker, motivation, focus, position, experience, bodyGoal, consistency, foodSource | No primary CTA; selection advances. Body goal retains Skip quiz. The adapted focus corresponds to recovered Q7 at 77–79 seconds. |
| welcome, intro, clubName, level, commitment | Manual Get started / I’m ready / Continue / Continue / Lock it in. |
| equipment, positionConfirm, playstyle, measurements, planComparison | Manual Next / internal Continue / Continue / Continue / Continue. Measurements and plan comparison retain Skip quiz. |
| notifications, comparison, brief, identity, days, schedule | Manual reminder setup / white Next / Yes, let’s go! / Continue / Continue / Save my week. Supported secondary decline/skip stays. |
| duration, space, aspirations, diet, allergies | Manual Continue / Continue / Confirm / Next / Next. Duration and space are required Breakaway additions without a recorded counterpart. |
| assessment, strengths, growth, fuel | Initially no primary CTA; then manual Show me / Now the harder part / adapted growth action / adapted fuel action after approximately 3.5 / 2 / 2.5 / 1.5 seconds. No automatic advance. |
| snapshot, plan | Manual Continue / Start my plan. Final plan is a real app completion step beyond the captured reference. |

The source's analysis/generating spinner, referral and Health states remain omitted unsupported features. Growth/fuel wording and the deferred reminder setup remain truthful adaptations rather than promises of generated calorie prescriptions or immediate system permission. Timed footer actions are unmounted while hidden, reserve their final space, settle immediately under Reduce Motion, and cancel on step/blur/background/unmount.

Measurement entry now defaults to Metric 175 cm / 70 kg, explicitly requested by the user, matching the first settled reference appearance at 101–106 seconds. Imperial conversion is 5′9″ / 154 lbs. Later 5′11″ frames show wheel manipulation. Existing edited values survive reopening; Skip clears both optional notes. No profile is saved merely by entering the screen.

The identified “A week that works for you” comparison keeps its heading and uses compact truthful cadence labels with narrow 114×268 reference-scale bars and a 42-point gap. Full questionnaire sentences no longer crowd the bar interiors. The weekly editor is a separate later slide.

Validation for this follow-up: TypeScript, Prettier, whitespace checks and the complete 200-test suite passed, including new reference-default, edit-preservation and Skip-clearing coverage. Final browser walkthrough is owned by the main agent; no new native-device or App Store build is included in these checks.

First-mount correction: the measurement content mounts only after its entry initialization has seeded the draft values and imperial height parts. This prevents native wheel initial offsets from using their unanswered fallback while readouts already show 175/70. Readiness resets on leaving, so Skip then Back uses the same correct initial mount. The gate tracks entry, never the live height/weight value; intentional partial imperial edits remain mounted and editable. Typecheck, formatting, whitespace checks and all 200 tests passed again after this correction.

### Final browser verification

The main agent walked a freshly reloaded isolated 390×844 browser from welcome through “Ready when you are,” without pressing Start my plan or saving/replacing a profile. First-entry readouts and wheel centers both showed 175 cm / 70 kg. Edited 176 cm / 71 kg survived Back; Skip followed by Back reseeded 175/70. Every early buttonless choice advanced correctly. The week comparison retained compact columns and readable dark value/cadence text on its lime bar; evidence: `externaloutputs/breakaway-week-comparison.png`.

Assessment, strengths, growth and fuel initially had no primary action in the incoming scene DOM. Their manual Show me / Now the harder part / Set my starting line / Let’s build it actions appeared after the reveal delay. None advanced while being read; all routes reached the final plan. The distinct goal asset was also fetched through the public development tunnel and its hash matched the bundled asset, verifying that the media is available to the cellular development connection. This browser pass does not establish native first-entry wheel behavior or a native frame rate. Production export validation is separate from native interaction QA; no App Store build or submission is represented by this verification.
