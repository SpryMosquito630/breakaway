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
