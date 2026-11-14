import type { DirectDrillDemo } from "../domain/directDrillVideo";

// Rights-cleared core-action examples; existing sole/slalom assets remain authoritative.
export const additionalDrillDemos: Record<string, DirectDrillDemo> = {
  "partner-first": {
    kind: "local",
    source: require("../../assets/drill-clips/receive-side-pass.mp4"),
    poster: require("../../assets/drill-clips/receive-side-pass-poster.jpg"),
    title: "Receive and pass",
    credit: "Kampus Production",
    page: "https://www.pexels.com/video/children-passing-around-a-soccer-ball-8813013/",
    cue: "First touch into space",
    description: "A real first touch followed by a grounded pass.",
    limit: "Group-practice example. Use your partner and alternate sides as written.",
    license: {
      name: "Pexels License",
      url: "https://www.pexels.com/license/",
      changes:
        "Source 8.2–11.5 seconds; resized to 960×540; muted and H.264 encoded. No generative edits.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  wall: {
    kind: "local",
    source: require("../../assets/drill-clips/wall-pass-receive.mp4"),
    poster: require("../../assets/drill-clips/wall-pass-receive-poster.jpg"),
    title: "Wall pass and receive",
    credit:
      "SOCCER PASSING - EASY WALL DRILLS TO IMPROVE YOUR SKILLS — Michael Lappas The Athletes Gym",
    page: "https://www.youtube.com/watch?v=HESOZuRJ9CA",
    cue: "Soften the first touch",
    description: "Inside-foot wall passes and controlled returning touches.",
    limit:
      "Training example at a faster pace. Use gentle passes and alternate feet as written.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt 33.6–37.7 seconds, resized to 960×540, muted and H.264 encoded; no generative edits.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  sole: {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-sole.mp4"),
    poster: require("../../assets/drill-clips/ballwork-sole-poster.jpg"),
    title: "Sole roll and opposite-foot stop",
    credit: "10 Best Ball Mastery Skills ⚽️ — The Coaching Manual",
    page: "https://www.youtube.com/watch?v=K8eGjOk4gSY",
    cue: "Roll, then stop with the other sole.",
    description: "Sole rolls across body; opposite sole catches, repeated on both sides.",
    limit:
      "The source travels slowly around a marker; follow the app stationary practice instructions.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  "outside-cut": {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-outside-cut.mp4"),
    poster: require("../../assets/drill-clips/ballwork-outside-cut-poster.jpg"),
    title: "Outside cut and follow",
    credit: "10 Best Ball Mastery Skills ⚽️ — The Coaching Manual",
    page: "https://www.youtube.com/watch?v=K8eGjOk4gSY",
    cue: "Cut with the outside of your foot.",
    description: "Approach, outside-foot cut at cone, body turns and follows ball.",
    limit:
      "Source uses a cone and a quicker approach; app uses walking pace and no marker.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  "step-over": {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-step-over.mp4"),
    poster: require("../../assets/drill-clips/ballwork-step-over-poster.jpg"),
    title: "Scissors and outside-foot exit",
    credit: "10 Best Ball Mastery Skills ⚽️ — The Coaching Manual",
    page: "https://www.youtube.com/watch?v=K8eGjOk4gSY",
    cue: "Circle the ball, then push away.",
    description:
      "Inside-to-outside foot circle around ball followed by opposite-foot outside push.",
    limit:
      "Source calls this scissors and starts from a moving dribble; app starts from a stationary ball.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  "v-pull": {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-v-pull.mp4"),
    poster: require("../../assets/drill-clips/ballwork-v-pull-poster.jpg"),
    title: "Sole pull and inside push",
    credit: "10 Best Ball Mastery Skills ⚽️ — The Coaching Manual",
    page: "https://www.youtube.com/watch?v=K8eGjOk4gSY",
    cue: "Pull back, push diagonally.",
    description:
      "Sole pulls ball back; same foot inside pushes it diagonally out; repeats alternate side.",
    limit:
      "Source demonstrates both feet, without the learner walk-around reset. For weaker-foot practice use your less comfortable foot; demonstrator dominance is unknown.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  "weak-v": {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-v-pull.mp4"),
    poster: require("../../assets/drill-clips/ballwork-v-pull-poster.jpg"),
    title: "Sole pull and inside push",
    credit: "10 Best Ball Mastery Skills ⚽️ — The Coaching Manual",
    page: "https://www.youtube.com/watch?v=K8eGjOk4gSY",
    cue: "Pull back, push diagonally.",
    description:
      "Sole pulls ball back; same foot inside pushes it diagonally out; repeats alternate side.",
    limit:
      "Source demonstrates both feet, without the learner walk-around reset. For weaker-foot practice use your less comfortable foot; demonstrator dominance is unknown.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  "inside-out": {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-inside-out.mp4"),
    poster: require("../../assets/drill-clips/ballwork-inside-out-poster.jpg"),
    title: "Inside and outside of one foot",
    credit: "10 Ball Mastery Soccer Drills for Kids U6 U8 U10 U12 — Progressive Soccer",
    page: "https://www.youtube.com/watch?v=CosG13seo3o",
    cue: "Inside touch, outside touch.",
    description: "Close view of same-foot inside/outside pairs; changes feet, repeats.",
    limit:
      "Source switches feet freely and omits the prescribed four touches then sole-stop reset. For weaker-foot practice use your less comfortable foot; demonstrator dominance is unknown.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  weak: {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-inside-out.mp4"),
    poster: require("../../assets/drill-clips/ballwork-inside-out-poster.jpg"),
    title: "Inside and outside of one foot",
    credit: "10 Ball Mastery Soccer Drills for Kids U6 U8 U10 U12 — Progressive Soccer",
    page: "https://www.youtube.com/watch?v=CosG13seo3o",
    cue: "Inside touch, outside touch.",
    description: "Close view of same-foot inside/outside pairs; changes feet, repeats.",
    limit:
      "Source switches feet freely and omits the prescribed four touches then sole-stop reset. For weaker-foot practice use your less comfortable foot; demonstrator dominance is unknown.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  "l-turn": {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-l-turn.mp4"),
    poster: require("../../assets/drill-clips/ballwork-l-turn-poster.jpg"),
    title: "L pull behind standing leg",
    credit: "10 Ball Mastery Soccer Drills for Kids U6 U8 U10 U12 — Progressive Soccer",
    page: "https://www.youtube.com/watch?v=CosG13seo3o",
    cue: "Pull back, then across.",
    description:
      "Sole draws ball backwards, foot taps it sideways behind standing leg, repeats opposite side.",
    limit:
      "Source repeats the footwork in a compact stance; app asks you to turn and collect after each L.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  "toe-taps": {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-toe-taps.mp4"),
    poster: require("../../assets/drill-clips/ballwork-toe-taps-poster.jpg"),
    title: "Alternate toe taps",
    credit: "Toe Taps Tutorial on TopTekkers ⚽️📱 — The Coaching Manual",
    page: "https://www.youtube.com/watch?v=VT8KF3_ssqU",
    cue: "Light touches on top.",
    description:
      "Alternating soles touch the top of the stationary ball with balanced support-leg hops.",
    limit:
      "Source uses surrounding markers and original orange coaching highlights; no markers required in app.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  "inside-cut": {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-inside-cut.mp4"),
    poster: require("../../assets/drill-clips/ballwork-inside-cut-poster.jpg"),
    title: "Inside hook and follow",
    credit: "Inside Hook Turn Tutorial on TopTekkers ⚽️📱 — The Coaching Manual",
    page: "https://www.youtube.com/watch?v=e48Lpw_W6DI",
    cue: "Hook across and turn.",
    description:
      "Inside of foot hooks ball across and back; player pivots and follows outgoing ball.",
    limit:
      "Short core turn excerpt begins at setup contact; source uses a quicker pace and markers. For weaker-foot practice use your less comfortable foot; no actor dominance or exact two-touch plus sole-stop reset is claimed.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  "weak-cut": {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-inside-cut.mp4"),
    poster: require("../../assets/drill-clips/ballwork-inside-cut-poster.jpg"),
    title: "Inside hook and follow",
    credit: "Inside Hook Turn Tutorial on TopTekkers ⚽️📱 — The Coaching Manual",
    page: "https://www.youtube.com/watch?v=e48Lpw_W6DI",
    cue: "Hook across and turn.",
    description:
      "Inside of foot hooks ball across and back; player pivots and follows outgoing ball.",
    limit:
      "Short core turn excerpt begins at setup contact; source uses a quicker pace and markers. For weaker-foot practice use your less comfortable foot; no actor dominance or exact two-touch plus sole-stop reset is claimed.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  inside: {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-inside.mp4"),
    poster: require("../../assets/drill-clips/ballwork-inside-poster.jpg"),
    title: "Inside touches between feet",
    credit: "Ball Boxing Tutorial on TopTekkers ⚽️📱 — The Coaching Manual",
    page: "https://www.youtube.com/watch?v=ybElh46hdo0",
    cue: "Keep the ball between your feet.",
    description:
      "Stationary inside-foot touches alternately move ball between left and right feet.",
    limit:
      "Original coaching highlight briefly marks head-up posture; app asks gentle controlled touches.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  partner: {
    kind: "local",
    source: require("../../assets/drill-clips/partner-two-touch.mp4"),
    poster: require("../../assets/drill-clips/partner-two-touch-poster.jpg"),
    title: "Two-touch partner passing",
    credit:
      "I tried 17 Partner Soccer Drills For 2 Players with my friend (FULL PRACTICE PLAN) — Progressive Soccer",
    page: "https://www.youtube.com/watch?v=6NoEqnwEoCk",
    cue: "Cushion, then pass",
    description: "Two players control and return inside-foot passes.",
    limit:
      "The players are farther apart. Start a few steps apart and move sideways as written.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt from passing chapter, approximately 427–436.5 seconds; resized to 1280×720, muted and H.264 encoded. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  turn: {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-turn.mp4"),
    poster: require("../../assets/drill-clips/ballwork-turn-poster.jpg"),
    title: "Sole pull-back and turn",
    credit:
      "Train and Master the Drag Back in 5 Minutes a day: Quick Turns in Soccer! ⚽🔥 — State Soccer TV - For Parents & Children",
    page: "https://www.youtube.com/watch?v=6q-BUDweNHY",
    cue: "Pull back and turn.",
    description:
      "Instructor places sole on ball, pulls it behind his standing line and pivots to follow in the opposite direction.",
    limit:
      "A short standing-start teaching demonstration; app adds two or three approach touches and alternates feet. Portrait source letterboxed without distortion; original captions retained.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained. Portrait preserved with black side padding.",
    },
    rightsReviewedOn: "2026-11-14",
  },
  "receive-across": {
    kind: "local",
    source: require("../../assets/drill-clips/ballwork-receive-across.mp4"),
    poster: require("../../assets/drill-clips/ballwork-receive-across-poster.jpg"),
    title: "Receive on the back foot",
    credit:
      "1to 1 Coaching - Receiving on the  back foot to play forward — The Coaching Manual",
    page: "https://www.youtube.com/watch?v=kaLe2YWsd9w",
    cue: "Open your hips to receive.",
    description:
      "Incoming ground ball, far inside foot cushions ball across the body, hips open, then outgoing pass.",
    limit:
      "Uses a wall return with a coach and marker setup instead of the app self-roll; extra return pass follows the core reception.",
    license: {
      name: "CC BY 3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Excerpt trimmed; audio removed; resized/compressed to 1280×720 H.264 24 fps. Original source overlays retained.",
    },
    rightsReviewedOn: "2026-11-14",
  },
};
