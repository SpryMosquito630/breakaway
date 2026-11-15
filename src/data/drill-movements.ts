export type Movement = {
  path: string;
  caption: string;
  equipment?: "wall" | "partner" | "gate" | "slalom";
  footPath?: string;
};
// Top-down schematics of ball travel, not filmed demonstrations. Arrows describe
// direction only; spacing is deliberately not presented as a measured scale.
export const drillMovements: Record<string, Movement> = {
  sole: {
    path: "M95 90 L225 90 M225 105 L95 105",
    caption: "Sole rolls across → opposite foot stops → switch feet.",
  },
  inside: {
    path: "M115 90 L205 90 M205 105 L115 105",
    caption: "Inside of left foot → inside of right foot → repeat.",
  },
  gates: {
    path: "M55 135 L95 70 L185 120 L240 50",
    caption: "Dribble through a gate, scan, then choose another.",
    equipment: "gate",
  },
  turn: {
    path: "M125 145 L125 55 M140 55 L140 120 Q140 145 185 145 L220 135",
    caption: "Forward touches → sole pulls back → turn and follow.",
  },
  wall: {
    path: "M105 145 L140 40 L195 140 M195 130 L180 40 L110 140",
    caption: "Pass to the wall → cushion the return → reset.",
    equipment: "wall",
  },
  partner: {
    path: "M90 135 L230 50 M220 60 L100 140",
    caption: "Pass to your partner’s foot; step sideways after passing.",
    equipment: "partner",
  },
  weak: {
    path: "M90 140 L120 105 L100 75 L145 45",
    caption: "Use only your weaker foot for close inside/outside touches.",
  },
  push: {
    path: "M90 130 L210 65",
    caption: "Inside-foot push → walk after the ball → stop and change feet.",
  },
  "toe-taps": {
    path: "M160 95 L160 95",
    footPath: "M110 130 Q100 60 150 85 M210 130 Q220 60 170 85",
    caption: "Ball stays still. Alternate soles touch its top; land beside it.",
  },
  "v-pull": {
    path: "M105 50 L155 140 L225 50",
    caption: "Sole pulls back → same foot’s inside pushes diagonally.",
  },
  "l-turn": {
    path: "M125 45 L125 125 L225 125",
    caption: "Sole pulls back → tap behind standing leg → turn to collect.",
  },
  "inside-out": {
    path: "M100 90 L210 90 M210 110 L100 110",
    caption: "Inside then outside of the same foot. Reset and switch feet.",
  },
  "foundation-stop": {
    path: "M105 80 L210 80 L105 100 L210 100",
    caption: "Three alternating inside touches → sole stop → balance.",
  },
  "receive-across": {
    path: "M120 145 L120 65 Q150 70 220 110",
    caption: "Roll forward → step alongside → far foot cushions across.",
  },
  "outside-cut": {
    path: "M145 145 L145 70 L235 40",
    caption: "Two forward touches → outside-foot cut → follow the new direction.",
  },
  "inside-cut": {
    path: "M190 145 L190 70 L80 40",
    caption: "Two forward touches → plant beside → inside-foot cut across.",
  },
  "step-over": {
    path: "M160 100 L230 55",
    footPath: "M140 130 C70 60 210 20 205 100",
    caption: "Foot circles inside to outside around the ball; other foot pushes away.",
  },
  "shield-turn": {
    path: "M200 80 Q215 125 160 135 Q110 140 100 90",
    caption: "Keep your body between imaginary defender and ball; sole roll away.",
  },
  "weak-roll": {
    path: "M100 140 L100 60 L215 60 L215 140",
    caption: "Weaker sole guides forward → sideways → back. Reset.",
  },
  "weak-v": {
    path: "M105 50 L155 140 L225 50",
    caption: "Weaker sole pulls back; same foot pushes diagonally. Walk to reset.",
  },
  "weak-cut": {
    path: "M190 145 L190 70 L80 45",
    caption: "Two weaker-foot touches → same foot’s inside cuts across → sole stop.",
  },
  "pass-brake": {
    path: "M90 135 L220 60",
    caption: "Pass softly → walk after it → brake with opposite foot’s inside.",
  },
  "pass-angle": {
    path: "M100 145 L130 110 L235 45",
    caption: "Set the ball out of your feet → diagonal pass → walk to collect.",
  },
  "gate-pass": {
    path: "M160 145 L160 40",
    caption: "Gentle pass through the gate’s middle → collect → alternate feet.",
    equipment: "gate",
  },
  "wall-open": {
    path: "M100 145 L145 40 L205 120 M205 120 L185 40 L100 145",
    caption: "Pass to wall → far foot receives across → other foot passes back.",
    equipment: "wall",
  },
  slalom: {
    path: "M85 150 Q175 135 135 115 Q85 95 175 80 Q225 65 160 40 Q100 20 95 60 L65 145",
    caption: "Weave around four markers → turn at the end → return.",
    equipment: "slalom",
  },
  "carry-scan": {
    path: "M120 145 L120 40 M200 40 L200 145",
    caption: "Dribble down a clear lane. Look up every three touches, stop and return.",
  },
  "partner-first": {
    path: "M225 45 L110 125 L150 145 M150 145 L225 45",
    caption: "Receive to one side → pass back → receive to the other side.",
    equipment: "partner",
  },
};
