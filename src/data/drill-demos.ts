export type DrillDemoAsset = {
  source: number;
  poster: number;
  limit: string;
  title: string;
  credit: string;
  page: string;
  cue: string;
  description: string;
};
// Only map footage whose visible movement matches this drill. A demo is a
// movement example, not evidence that the entire training program was vetted.
export const drillDemos: Record<string, DrillDemoAsset> = {
  sole: {
    source: require("../../assets/drill-demos/sole-contact.mp4"),
    poster: require("../../assets/drill-demos/sole-contact-poster.jpg"),
    limit: "One-foot example · Alternate feet in this drill.",
    title: "Sole roll: foot contact",
    credit: "Videas Cl / Pexels 19216281",
    page: "https://www.pexels.com/video/two-men-in-red-and-black-soccer-uniforms-playing-soccer-19216281/",
    cue: "Guide the ball gently with your sole.",
    description:
      "One-foot sole-control example. Stop with the other foot and alternate using the steps below.",
  },
  slalom: {
    title: "Marker slalom: weave and return",
    source: require("../../assets/drill-demos/marker-slalom.mp4"),
    poster: require("../../assets/drill-demos/marker-slalom-poster.jpg"),
    limit: "Cone example · Use flat markers at your stage’s spacing and pace.",
    credit: "RDNE Stock project / Pexels 7187061",
    page: "https://www.pexels.com/download/video/7187061/",
    cue: "Small touches around each marker. Turn at the end and return.",
    description:
      "Filmed movement example: weaving between cones, turning and returning. Use flat markers spaced for your own walking pace; follow your selected stage’s steps and target.",
  },
};
