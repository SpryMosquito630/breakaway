import type { Drill } from "../domain/model";
import { drillDemos } from "./drill-demos";

export type DrillPhoto = {
  source: number;
  description: string;
  credit: string;
  page: string;
  license: string;
};

// Context photographs are deliberately separate from verified movement demos.
// Custom drills do not inherit starter media or an implied demonstration.
const contextPhotos: Record<string, DrillPhoto> = {
  "sole-control": {
    source: require("../../assets/drill-photos/sole-control.webp"),
    description:
      "Boot resting on a grounded football. Sole-control context, not a moving roll demonstration.",
    credit: "Justin Hofer",
    page: "https://www.pexels.com/photo/person-stepping-on-soccer-ball-13422993/",
    license: "https://www.pexels.com/license/",
  },
  "ball-mastery": {
    source: require("../../assets/drill-photos/ball-mastery.webp"),
    description:
      "Player feet and several footballs during training. General grounded ball-mastery context.",
    credit: "Franco Monsalvo",
    page: "https://www.pexels.com/photo/soccer-training-session-on-green-field-30585239/",
    license: "https://www.pexels.com/license/",
  },
  "ground-ball-training": {
    source: require("../../assets/drill-photos/ground-ball-training.webp"),
    description:
      "Player training with a grounded ball. General ground-ball / passing context; no wall or partner pass is pictured.",
    credit:
      "\u0412\u043e\u043b\u043e\u0434\u0438\u043c\u0438\u0440 \u041a\u043e\u0440\u043e\u043b\u044c",
    page: "https://www.pexels.com/photo/man-playing-in-soccer-16543163/",
    license: "https://www.pexels.com/license/",
  },
  dribbling: {
    source: require("../../assets/drill-photos/dribbling.webp"),
    description:
      "Player carrying a football on grass during training. Dribbling context, not an exact cut or turn demonstration.",
    credit: "Franco Monsalvo",
    page: "https://www.pexels.com/photo/professional-soccer-player-in-training-session-37926571/",
    license: "https://www.pexels.com/license/",
  },
  "gate-setup": {
    source: require("../../assets/drill-photos/gate-setup.webp"),
    description:
      "Football and flat cones on a training pitch. Equipment/setup context; the pictured cones are not the exact gate or slalom layout.",
    credit: "Itiel Cd",
    page: "https://www.pexels.com/photo/soccer-training-field-with-cones-and-ball-29485141/",
    license: "https://www.pexels.com/license/",
  },
};

export const drillPhotos: Record<string, DrillPhoto> = {
  sole: contextPhotos["sole-control"],
  turn: contextPhotos["sole-control"],
  "toe-taps": contextPhotos["sole-control"],
  "foundation-stop": contextPhotos["sole-control"],
  "weak-roll": contextPhotos["sole-control"],
  "weak-v": contextPhotos["sole-control"],
  "v-pull": contextPhotos["sole-control"],
  inside: contextPhotos["ball-mastery"],
  weak: contextPhotos["ball-mastery"],
  "receive-across": contextPhotos["ball-mastery"],
  "shield-turn": contextPhotos["ball-mastery"],
  push: contextPhotos["ground-ball-training"],
  "pass-brake": contextPhotos["ground-ball-training"],
  "pass-angle": contextPhotos["ground-ball-training"],
  wall: contextPhotos["ground-ball-training"],
  "wall-open": contextPhotos["ground-ball-training"],
  partner: contextPhotos["ground-ball-training"],
  "partner-first": contextPhotos["ground-ball-training"],
  "l-turn": contextPhotos["dribbling"],
  "inside-out": contextPhotos["dribbling"],
  "outside-cut": contextPhotos["dribbling"],
  "inside-cut": contextPhotos["dribbling"],
  "step-over": contextPhotos["dribbling"],
  "weak-cut": contextPhotos["dribbling"],
  "carry-scan": contextPhotos["dribbling"],
  gates: contextPhotos["gate-setup"],
  slalom: contextPhotos["gate-setup"],
  "gate-pass": contextPhotos["gate-setup"],
};

export function drillMedia(drill: Pick<Drill, "id" | "skill">) {
  const demo = drillDemos[drill.id];
  if (demo) return { source: demo.poster, description: demo.description, video: true };
  const photo = drillPhotos[drill.id];
  if (photo)
    return { source: photo.source, description: photo.description, video: false };
  return undefined;
}
