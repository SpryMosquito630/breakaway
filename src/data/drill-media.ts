import type { Drill } from "../domain/model";
import { drillDemos } from "./drill-demos";

export type DrillPhoto = {
  source: number;
  description: string;
  credit: string;
  page: string;
  license: string;
};

// Each mapped drill owns a distinct original photograph, never another crop of
// a shared source. Unmapped drills use their authored movement diagram/icon.
// Context photographs are separate from verified films; custom drills inherit none.
export const drillPhotos: Record<string, DrillPhoto> = {
  "foundation-stop": {
    source: require("../../assets/drill-photos/sole-control.webp"),
    description:
      "Boot resting on a grounded football. Sole-control context, not a moving roll demonstration.",
    credit: "Justin Hofer",
    page: "https://www.pexels.com/photo/person-stepping-on-soccer-ball-13422993/",
    license: "https://www.pexels.com/license/",
  },
  push: {
    source: require("../../assets/drill-photos/ground-ball-training.webp"),
    description:
      "Player training with a grounded ball. General ground-ball / passing context; no wall or partner pass is pictured.",
    credit: "Володимир Король",
    page: "https://www.pexels.com/photo/man-playing-in-soccer-16543163/",
    license: "https://www.pexels.com/license/",
  },
  "carry-scan": {
    source: require("../../assets/drill-photos/dribbling.webp"),
    description:
      "Player carrying a football on grass during training. Dribbling context, not an exact cut or turn demonstration.",
    credit: "Franco Monsalvo",
    page: "https://www.pexels.com/photo/professional-soccer-player-in-training-session-37926571/",
    license: "https://www.pexels.com/license/",
  },
  gates: {
    source: require("../../assets/drill-photos/gate-setup.webp"),
    description:
      "Football and flat cones on a training pitch. Equipment/setup context; the pictured cones are not the exact gate or slalom layout.",
    credit: "Itiel Cd",
    page: "https://www.pexels.com/photo/soccer-training-field-with-cones-and-ball-29485141/",
    license: "https://www.pexels.com/license/",
  },
  "toe-taps": {
    source: require("../../assets/drill-photos/toe-taps.webp"),
    description:
      "A player rests a boot on a football during outdoor practice. Static sole-contact context; not a demonstration of alternating toe taps.",
    credit: "Kampus Production",
    page: "https://www.pexels.com/photo/a-person-stepping-on-the-ball-while-wearing-cleats-8941645/",
    license: "https://www.pexels.com/license/",
  },
  "inside-out": {
    source: require("../../assets/drill-photos/inside-out.webp"),
    description:
      "A player keeps a grounded football close during practice. Dribbling context; the photograph does not show the full inside–outside sequence.",
    credit: "Laura Rincón",
    page: "https://www.pexels.com/photo/a-girl-during-a-soccer-training-16248865/",
    license: "https://www.pexels.com/license/",
  },
  "inside-cut": {
    source: require("../../assets/drill-photos/inside-cut.webp"),
    description:
      "Lower legs and a grounded football during outdoor practice. Close-control context, not an exact inside-cut demonstration.",
    credit: "DIALO Photography",
    page: "https://www.pexels.com/photo/boy-playing-football-9263797/",
    license: "https://www.pexels.com/license/",
  },
  "outside-cut": {
    source: require("../../assets/drill-photos/outside-cut.webp"),
    description:
      "Lower legs approaching a grounded football on a training field. Dribbling context, not an exact outside-cut demonstration.",
    credit: "Franco Monsalvo",
    page: "https://www.pexels.com/photo/soccer-training-session-showing-multiple-players-30585009/",
    license: "https://www.pexels.com/license/",
  },
  partner: {
    source: require("../../assets/drill-photos/partner.webp"),
    description:
      "Two players and a football during outdoor practice. Partner-practice context, not a complete passing demonstration.",
    credit: "Florian Thomschke",
    page: "https://www.pexels.com/photo/boy-in-soccer-training-19793237/",
    license: "https://www.pexels.com/license/",
  },
  "gate-pass": {
    source: require("../../assets/drill-photos/gate-pass.webp"),
    description:
      "Footballs and cones arranged on grass for practice. Equipment context; this is not the exact two-marker gate layout.",
    credit: "MESSALA CIULLA",
    page: "https://www.pexels.com/photo/photograph-of-soccer-balls-near-training-cones-6658150/",
    license: "https://www.pexels.com/license/",
  },
};

export function drillMedia(drill: Pick<Drill, "id" | "skill">) {
  const demo = drillDemos[drill.id];
  if (demo) return { source: demo.poster, description: demo.description, video: true };
  const photo = drillPhotos[drill.id];
  if (photo)
    return { source: photo.source, description: photo.description, video: false };
  return undefined;
}
