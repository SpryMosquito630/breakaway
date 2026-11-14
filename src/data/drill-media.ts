import type { Drill } from "../domain/model";
import { drillDemos } from "./drill-demos";

export type DrillPhoto = {
  source: number;
  description: string;
  credit: string;
  page: string;
  license: string;
};

// Every built-in drill has a distinct genuine photograph or authentic film poster.
// Prefer professional action where it fits; retain precise real setup/contact photos.
// A still never implies a full demo. Custom drills inherit no starter media.
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
      "Alphonso Davies carrying a grounded ball for Bayern Munich in real match action. Player, face, boots and full ball are retained. A still cannot establish the timing of each scan; use the written carry-and-scan steps.",
    credit: "Sven Mandel · CC BY-SA 4.0 · cropped/resized",
    page: "https://commons.wikimedia.org/wiki/File:2019147193617_2019-05-27_Fussball_1.FC_Kaiserslautern_vs_FC_Bayern_M%C3%BCnchen_-_Sven_-_1D_X_MK_II_-_1548_-_B70I9847.jpg",
    license: "https://creativecommons.org/licenses/by-sa/4.0",
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
      "Virgil van Dijk controlling the ball under pressure in real Liverpool match action. This shows close-control contact and body balance, not the complete repeated inside–outside sequence; practise without an opponent.",
    credit: "Mehdi Bolourian / Fars Media Corporation · CC BY4.0 · cropped/resized",
    page: "https://commons.wikimedia.org/wiki/File:Liverpool_vs._Chelsea,_UEFA_Super_Cup_2019-08-14_33.jpg",
    license: "https://creativecommons.org/licenses/by/4.0",
  },
  "inside-cut": {
    source: require("../../assets/drill-photos/inside-cut.webp"),
    description:
      "Declan Rice changing direction with a grounded ball for England in real match action. This is a close-control and body-position reference; follow the slow, controlled inside-cut steps rather than the match pace.",
    credit: "YantsImages · CC BY-SA 4.0 · cropped/resized",
    page: "https://commons.wikimedia.org/wiki/File:Declan_Rice_4_England_v_Ghana_at_2026_Fifa_World_Cup_by_YantsImages_03.jpg",
    license: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "outside-cut": {
    source: require("../../assets/drill-photos/outside-cut.webp"),
    description:
      "Mohamed Salah carrying a grounded ball for Egypt in real match action. Close-control and direction-change context; the still does not establish a complete outside-cut repetition.",
    credit: "Bryan Berlin / WikiPortraits · CC BY-SA 4.0 · cropped/resized",
    page: "https://commons.wikimedia.org/wiki/File:Mohamed_Salah_Argentina_v_Egypt_7_July_2026-191.jpg",
    license: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  partner: {
    source: require("../../assets/drill-photos/partner.webp"),
    description:
      "Sergio Busquets preparing to pass a grounded ball for Spain in real match action. Professional passing/body-position reference; the receiving partner and the drill’s sideways step are outside this still.",
    credit: "Meghdad Madadi / Tasnim News Agency · CC BY 4.0 · cropped/resized",
    page: "https://commons.wikimedia.org/wiki/File:Iran_and_Spain_match_at_the_FIFA_World_Cup_(2018-06-20)_35.jpg",
    license: "https://creativecommons.org/licenses/by/4.0",
  },
  "gate-pass": {
    source: require("../../assets/drill-photos/gate-pass.webp"),
    description:
      "Footballs and cones arranged on grass for practice. Equipment context; this is not the exact two-marker gate layout.",
    credit: "MESSALA CIULLA",
    page: "https://www.pexels.com/photo/photograph-of-soccer-balls-near-training-cones-6658150/",
    license: "https://www.pexels.com/license/",
  },
  inside: {
    source: require("../../assets/drill-photos/inside.webp"),
    description:
      "A real match photograph of close ball control between the feet. This illustrates inside-foot contact context; one still does not demonstrate repeated alternating touches.",
    credit:
      "© Jethrude Hipolito / https://www.jethrude.com / CC BY-SA4.0 · cropped/resized",
    page: "https://commons.wikimedia.org/wiki/File:Carli_de_Murga_Dribbling_the_Ball_-_PHI_vs_AFG,_September_12,_2023.png",
    license: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  turn: {
    source: require("../../assets/drill-photos/turn.webp"),
    description:
      "A real match photograph of a player controlling the ball while changing direction. Close turning/contact context; the complete pull-back-turn sequence is not shown.",
    credit: "https://vilfortpark.dk · CC BY-SA 4.0 · cropped/resized",
    page: "https://commons.wikimedia.org/wiki/File:Marko_Divkovic_dribbling.jpg",
    license: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  weak: {
    source: require("../../assets/drill-photos/weak.webp"),
    description:
      "A real match photograph of close foot-to-ball control. Use your own less comfortable foot for this drill; the pictured player’s foot dominance is not inferred.",
    credit: "Javid Nikpour · CC BY 4.0 · cropped/resized",
    page: "https://commons.wikimedia.org/wiki/File:Ali_Karimi_on_the_dribble_against_Esteghlal_FC.jpg",
    license: "https://creativecommons.org/licenses/by/4.0",
  },
  "weak-cut": {
    source: require("../../assets/drill-photos/weak-cut.webp"),
    description:
      "Gervinho turning with the ball in real Arsenal match action. Cut/contact and balance reference; the photographed player’s less comfortable foot is not inferred. Follow your own weaker-foot steps at walking pace.",
    credit:
      "Ronnie Macdonald from Chelmsford, United Kingdom · CC BY 2.0 · cropped/resized",
    page: "https://commons.wikimedia.org/wiki/File:Gervinho_dribbling_(7013686289).jpg",
    license: "https://creativecommons.org/licenses/by/2.0",
  },
  "shield-turn": {
    source: require("../../assets/drill-photos/shield-turn.webp"),
    description:
      "A real match photograph showing a player placing their body between the ball and a defender. Shielding context; practise the written drill without contact or an actual defender.",
    credit: "Happiraphael · CC BY-SA 4.0 · cropped/resized",
    page: "https://commons.wikimedia.org/wiki/File:Dribble_au_football.jpg",
    license: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "pass-brake": {
    source: require("../../assets/drill-photos/pass-brake.webp"),
    description:
      "A real partner-practice photograph with close foot control of a grounded ball. Controlled receive/stop context; it does not show the complete pass-and-brake sequence.",
    credit: "Kmreykjavik · CC BY-SA 4.0 · cropped/resized",
    page: "https://commons.wikimedia.org/wiki/File:Entrenamiento_KM.jpg",
    license: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "pass-angle": {
    source: require("../../assets/drill-photos/pass-angle.webp"),
    description:
      "A real match photograph of the inside foot approaching the ball on an angle. Foot/contact setup context; use a gentle ground pass toward your own clear diagonal target.",
    credit:
      "© Jethrude Hipolito / https://www.jethrude.com / CC BY-SA4.0 · cropped/resized",
    page: "https://commons.wikimedia.org/wiki/File:OJ_Porteria_Dribbling_Toward_the_Goal_-_PHI_vs_AFG,_September_12,_2023.png",
    license: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "weak-roll": {
    source: require("../../assets/drill-photos/weak-roll.webp"),
    description:
      "A real indoor-football photograph of a sole resting on the ball. Sole-contact setup for a controlled roll; the player’s foot dominance and the full sole path are not established by this still.",
    credit: "Alfonso Scarpa",
    page: "https://unsplash.com/photos/player-with-foot-on-a-soccer-ball-indoors-O8p7DUgZ1KA",
    license: "https://unsplash.com/license",
  },
  "partner-first": {
    source: require("../../assets/drill-photos/partner-first.webp"),
    description:
      "A genuine filmed first touch: player receives a ground pass and redirects it to the side. Other participants are outside this camera crop; source is group passing practice rather than a staged one-partner drill.",
    credit: "Kampus Production",
    page: "https://www.pexels.com/video/children-passing-around-a-soccer-ball-8813013/",
    license: "https://www.pexels.com/license/",
  },
  "keeper-hold": {
    source: require("../../assets/drill-photos/keeper-hold.webp"),
    description:
      "Real filmed ball handling at face height on grass in front of a small goal, both hands on ball. Source action is lifting ball after collecting a low incoming pass; not a self-toss demonstration. Feet are outside source camera frame at this moment.",
    credit: "Kampus Production",
    page: "https://www.pexels.com/video/a-boy-catching-a-football-8813016/",
    license: "https://www.pexels.com/license/",
  },
  "v-pull": {
    source: require("../../assets/drill-photos/v-pull.webp"),
    description:
      "Real sole-to-ball contact: the boot rests diagonally across the front/top of the ball, the contact used to begin a pull-back. Follow the written steps for the diagonal inside-foot push that completes the V; one photograph does not show the full V movement.",
    credit: "Olumide Adekunle",
    page: "https://unsplash.com/photos/soccer-players-foot-on-a-dirty-ball-in-green-grass-QCQHKvUNvl0",
    license: "https://unsplash.com/license",
  },
  "weak-v": {
    source: require("../../assets/drill-photos/weak-v.webp"),
    description:
      "Real sole-on-ball setup on grass, with the standing foot grounded beside the ball. Use your own less comfortable foot to pull back and push diagonally; the photographed player’s foot dominance and the completed V are not inferred.",
    credit: "KaroGraphix Photography",
    page: "https://unsplash.com/photos/child-in-neon-jersey-playing-soccer-TNac8WmZgpI",
    license: "https://unsplash.com/license",
  },
  "keeper-roll": {
    source: require("../../assets/drill-photos/keeper-roll.webp"),
    description:
      "Low ball-handling reference: goalkeeper crouches with gloved hand controlling a football at grass level as he rises after a save. This shows low grip/collection position, not a completed rolling distribution.",
    credit:
      "Real Madrid — Train like a Real Madrid goalkeeper! | Courtois, Lunin & Altube (2021), CC BY 3.0. Frame extracted at00:18.20, cropped and encoded WebP.",
    page: "https://commons.wikimedia.org/wiki/File:Train_like_a_Real_Madrid_goalkeeper!_-_Courtois,_Lunin_%26_Altube.webm",
    license: "https://creativecommons.org/licenses/by/3.0/",
  },
  "l-turn": {
    source: require("../../assets/drill-photos/l-turn.webp"),
    description:
      "Real macro photograph of the front outsole contacting the top of the ball. This is the sole-contact component before a pull; the behind-the-standing-leg tap and completed L turn are described in the written steps, not shown by this close-up.",
    credit: "Kafeel Ahmed",
    page: "https://www.pexels.com/photo/unrecognizable-player-standing-with-leg-on-soccer-ball-4785486/",
    license: "https://www.pexels.com/license/",
  },
  "receive-across": {
    source: require("../../assets/drill-photos/receive-across.webp"),
    description:
      "Real match photograph with open hips and the inside foot beside a grounded ball. Foot-orientation/contact setup for an across-body touch; this still does not establish an incoming pass or the full across-body trajectory.",
    credit: "https://vilfortpark.dk · CC BY-SA 4.0 · cropped/resized",
    page: "https://commons.wikimedia.org/wiki/File:Marko_Divkovic_dribbling_against_Copenhagen.jpg",
    license: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "step-over": {
    source: require("../../assets/drill-photos/step-over.webp"),
    description:
      "Real footwork photograph: one boot is beside a grounded ball and the other is lifted behind. Balanced foot-position setup for beginning a step-over; this still does not establish the complete circling action or exit.",
    credit: "Aryan K",
    page: "https://unsplash.com/photos/_0z5SDOStsE",
    license: "https://unsplash.com/license",
  },
  wall: {
    source: require("../../assets/drill-photos/wall.webp"),
    description:
      "Actual filmed inside-foot wall passing reference: player and grounded ball face the rebound wall; wall, ball and feet are visible.",
    credit:
      "Yael Averbuch West — Soccer Wall Work Combo | YFutbol (2015), CC BY3.0. Automatic video preview frame extracted and cropped; encoded WebP.",
    page: "https://www.youtube.com/watch?v=DBvVBIyV7Ck",
    license: "https://creativecommons.org/licenses/by/3.0/",
  },
  "wall-open": {
    source: require("../../assets/drill-photos/wall-open.webp"),
    description:
      "Actual filmed wall-work first-touch reference: player opens body and controls grounded ball beside a low brick rebound wall. Single moment illustrates receiving/turning position; the full alternating-foot sequence remains in authored steps.",
    credit:
      "Yael Averbuch West — Wall Work Soccer Challenge | YFutbol (2014), CC BY3.0. Automatic video preview frame extracted and cropped; encoded WebP.",
    page: "https://www.youtube.com/watch?v=TC9PN9zf_60",
    license: "https://creativecommons.org/licenses/by/3.0/",
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
