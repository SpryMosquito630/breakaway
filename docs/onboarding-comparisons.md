# Animated onboarding comparisons

The active flow is welcome → focus → position → player inspiration → experience → equipment → plan comparison → days → identity → measurements → training journey → first session. Position still leads directly to its filtered player carousel; height/weight remain explicit and optional. Both comparison pages use Continue without waiting for an animation.

The plan comparison uses qualitative labels: Without a plan / Your Breakaway plan. Bars scale from the bottom over1400ms after200ms entry delay, with overlapping300ms label fades. The training journey uses With Breakaway / Without Breakaway labels, a1200ms SVG stroke reveal after200ms, then300ms marker/legend reveals. The graphics illustrate structure and routine; they contain no invented baseline, rating, productive-minutes number, guaranteed date or measured performance forecast.

The reusable component owns its animation values. Leaving/unmounting stops animations; backgrounding or reduced motion settles to the completed illustration. Bars use the native transform driver on native platforms; SVG dash updates use the JS driver. Existing420ms word fades/140ms maximum staggering/520ms stagger window remain unchanged.

Browser QA walked the full setup through both pages into the real first-session preview, then cancelled without saving changes. The partially drawn path and completed illustration were observed; height/weight and the immediate position-to-player sequence were retained. Screens fit390×844; the journey was additionally checked at320×740 without document horizontal overflow. Photos and the legacy starting-line CTA were removed from the journey so both comparisons share the clean dark surface and Continue action. Evidence: output/screenshots/breakaway-plan-comparison.jpg and breakaway-journey-comparison.jpg.

All227 project tests, TypeScript and formatting pass, and production iOS export passes. A native visual/Reduce Motion check remains necessary before claiming physical-device animation fidelity.
