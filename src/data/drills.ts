import { Drill } from "../domain/model";
const originals: Drill[] = [
  {
    id: "sole",
    name: "Sole rolls",
    skill: "Ball control",
    gear: [],
    space: "Small space",
    level: "New to training",
    cue: "Soft touch. Stay over the ball.",
    steps: [
      "Stand with the ball just in front of you and knees slightly bent.",
      "Roll the ball across your body with the sole of one foot. Stop it with the other.",
      "Alternate slowly. Keep the ball within one step and look up between touches.",
    ],
    tip: "Start at walking pace. Control comes before speed.",
  },
  {
    id: "inside",
    name: "Inside touches",
    skill: "Ball control",
    gear: [],
    space: "Small space",
    level: "New to training",
    cue: "Little touches, lighter feet.",
    steps: [
      "Place the ball between your feet with your knees relaxed.",
      "Tap it gently from the inside of one foot to the other.",
      "Keep the touches close. Reset your position whenever the ball runs away.",
    ],
    tip: "Aim for quiet, balanced touches rather than a high score.",
  },
  {
    id: "gates",
    name: "Gate dribble",
    skill: "Dribbling",
    gear: ["markers"],
    space: "Open space",
    level: "Some experience",
    cue: "Find the next gate early.",
    steps: [
      "Set four pairs of safe markers about a big step apart, with room between gates.",
      "Dribble through a gate, then change direction toward another.",
      "Use both feet and lift your eyes before choosing your next gate.",
    ],
    tip: "Shoes or flat markers work. Leave clear space around the course.",
  },
  {
    id: "turn",
    name: "Pull-back turns",
    skill: "Dribbling",
    gear: [],
    space: "Small space",
    level: "New to training",
    cue: "Pull. Turn. Take it with you.",
    steps: [
      "Dribble forward slowly for two or three steps.",
      "Put your sole gently on top of the ball and pull it back.",
      "Turn with the ball, move in the opposite direction, and switch feet next time.",
    ],
    tip: "Leave enough space to turn without stepping on the ball.",
  },
  {
    id: "wall",
    name: "Wall pass & receive",
    skill: "Passing",
    gear: ["wall"],
    space: "Small space",
    level: "Some experience",
    cue: "A soft first touch sets up the pass.",
    steps: [
      "Find a safe, permitted wall and stand a few steps away.",
      "Pass against it with the inside of your foot.",
      "Cushion the returning ball, set it up, then pass again. Alternate feet.",
    ],
    tip: "Use a gentle pass and check that the wall and area are safe.",
  },
  {
    id: "partner",
    name: "Partner passing",
    skill: "Passing",
    gear: ["partner"],
    space: "Open space",
    level: "Some experience",
    cue: "Pass to the foot, then move.",
    steps: [
      "Face your partner a few steps apart in a clear area.",
      "Pass with the inside of your foot and receive with a soft touch.",
      "After each pass, take one small step sideways to create a new angle.",
    ],
    tip: "Agree a comfortable pace with your partner.",
  },
  {
    id: "weak",
    name: "Weaker-foot touches",
    skill: "Weaker foot",
    gear: [],
    space: "Small space",
    level: "New to training",
    cue: "Give your other foot the ball.",
    steps: [
      "Use only your less comfortable foot for gentle inside and outside touches.",
      "Travel slowly across a clear patch of space.",
      "Stop the ball under your sole, reset, and repeat in the other direction.",
    ],
    tip: "It is okay to go slowly. Make each touch deliberate.",
  },
  {
    id: "push",
    name: "Push & follow",
    skill: "Passing",
    gear: [],
    space: "Small space",
    level: "New to training",
    cue: "Pick a spot. Pass with purpose.",
    steps: [
      "Choose a clear spot a few steps away as your target.",
      "Gently push the ball toward it with the inside of your foot.",
      "Walk after the ball, stop it, and repeat with the other foot.",
    ],
    tip: "Use a light push so the ball stays in your safe area.",
  },
];

// Targets describe controlled repetitions, never a race against the clock.
type Entry = [string, string, string, string, string[], string, string, string, string, string];
const additions: Entry[] = [
  ["toe-taps", "Toe taps", "Ball control", "New to training", [], "Small space", "Stay light over the ball.", "Touch the top of the stationary ball with alternate soles.", "Land beside the ball with soft knees; reset if it moves.", "12 / 24 / 36 balanced taps"],
  ["v-pull", "V pulls", "Ball control", "Some experience", [], "Small space", "Pull back, push across.", "Pull the ball back with your sole, then push diagonally with the inside of the same foot.", "Switch feet after each V and keep the ball within a step.", "6 / 12 / 18 clean V shapes"],
  ["l-turn", "L turns", "Dribbling", "Some experience", [], "Small space", "Pull back and slip it sideways.", "Pull the ball back with your sole, then tap it behind your standing leg.", "Turn to collect it; alternate the turning foot.", "4 / 8 / 12 controlled turns"],
  ["inside-out", "Inside–outside", "Dribbling", "Some experience", [], "Small space", "Two surfaces, one foot.", "Move the ball sideways with the inside, then outside, of one foot.", "After four touches, stop under your sole and change feet.", "8 / 16 / 24 touch pairs"],
  ["foundation-stop", "Touch and freeze", "Ball control", "New to training", [], "Small space", "Three touches, one quiet stop.", "Make three inside touches between your feet, then stop the ball with a sole.", "Hold your balance briefly before repeating with the other stopping foot.", "6 / 10 / 16 quiet stops"],
  ["receive-across", "Receive across the body", "Ball control", "Some experience", [], "Small space", "Open your hips to the next touch.", "Roll the ball gently forward, step alongside it, and cushion it across your body with the far foot.", "Collect it within a step and repeat on the other side.", "6 / 12 / 18 soft receptions"],
  ["outside-cut", "Outside cuts", "Dribbling", "New to training", [], "Small space", "Cut close, then turn with it.", "Take two gentle forward touches, then use the outside of your foot to change direction.", "Follow the ball at walking pace and alternate feet.", "6 / 12 / 18 clean cuts"],
  ["inside-cut", "Inside cuts", "Dribbling", "New to training", [], "Small space", "Plant beside it, cut across.", "Take two slow touches forward, plant beside the ball and cut it across with your other foot.", "Follow the new direction and repeat on both sides.", "6 / 12 / 18 controlled cuts"],
  ["step-over", "Step-over and exit", "Dribbling", "Some experience", [], "Small space", "Sell the move with your shoulders.", "Circle one foot around the front of the stationary ball, from inside to outside.", "Push away gently with the outside of the other foot; stop and switch sides.", "4 / 8 / 12 balanced exits"],
  ["shield-turn", "Shield and turn", "Ball control", "Some experience", [], "Small space", "Keep your body between ball and space.", "Stand side-on to an imaginary defender with the ball beside your far foot.", "Roll it away with your sole and turn to follow without crossing your feet.", "6 / 12 / 18 protected turns"],
  ["weak-roll", "Weaker-foot sole path", "Weaker foot", "New to training", [], "Small space", "Guide the ball with your sole.", "Use your weaker sole to roll the ball forward, sideways, then back.", "Keep your standing knee soft and reset before repeating the path.", "4 / 8 / 12 controlled paths"],
  ["weak-v", "Weaker-foot V pull", "Weaker foot", "Some experience", [], "Small space", "Trust the less familiar side.", "With your weaker sole, pull the ball back and push it diagonally with that foot’s inside.", "Walk around to reset; keep each V short and controlled.", "6 / 12 / 18 clean V shapes"],
  ["weak-cut", "Weaker-foot cuts", "Weaker foot", "Some experience", [], "Small space", "Change direction with one foot.", "Use two weaker-foot touches, then cut the ball across with the same foot’s inside.", "Stop under that sole before changing direction again.", "6 / 12 / 18 clean cuts"],
  ["pass-brake", "Pass and brake", "Passing", "New to training", [], "Small space", "Weight the pass so you can catch it.", "Pass softly into a clear patch a couple of steps away.", "Walk after it and stop with the inside of the opposite foot. Alternate passing feet.", "6 / 12 / 18 accurate passes"],
  ["pass-angle", "Angled pass and collect", "Passing", "Some experience", [], "Small space", "Set the angle before you pass.", "Set the ball out of your feet with one touch, then pass gently to a clear diagonal spot.", "Walk to collect it; alternate sides and keep the ball inside your area.", "6 / 12 / 18 set-and-pass pairs"],
  ["gate-pass", "Pass through a gate", "Passing", "Some experience", ["markers"], "Small space", "Aim through the middle.", "Place two flat markers a step apart with clear space beyond them.", "Pass gently through the gate from a few steps away; collect and alternate feet.", "5 / 10 / 15 passes through the gate"],
  ["wall-open", "Wall pass, open out", "Passing", "Some experience", ["wall"], "Small space", "Receive toward your next pass.", "Pass gently to a safe wall, receive across your body with the far foot.", "Pass back with the other foot and alternate the direction of your first touch.", "6 / 12 / 18 controlled receptions"],
  ["slalom", "Marker slalom", "Dribbling", "Some experience", ["markers"], "Open space", "Look one marker ahead.", "Space four flat markers at least two walking steps apart.", "Weave between them with small touches, turn at the end and return with the other foot leading.", "2 / 4 / 6 controlled runs"],
  ["carry-scan", "Carry and scan", "Dribbling", "Some experience", [], "Open space", "Look up between touches.", "Pick a clear lane and dribble slowly with the ball within one stride.", "Every three touches, lift your eyes to check the space, then stop and return.", "4 / 8 / 12 scans with close control"],
  ["partner-first", "Partner first touch", "Ball control", "Some experience", ["partner"], "Open space", "First touch into clear space.", "Ask your partner for gentle ground passes from a few steps away.", "Receive to one side, pass back, then receive to the other side. Swap roles often.", "6 / 12 / 18 controlled first touches"],
];
const extra: Drill[] = additions.map(([id,name,skill,level,gear,space,cue,step,finish]) => ({
  id,name,skill,level,gear,space,cue,steps: ["Check a clear, level area around you.",step,finish],
  tip: "Keep each repetition controlled. Pause and reset whenever you need.",
}));
const targets: Record<string, string> = {
  sole: "10 / 20 / 30 rolls kept within a step", inside: "16 / 32 / 48 quiet touches",
  gates: "4 / 8 / 12 gates with close control", turn: "4 / 8 / 12 balanced turns",
  wall: "6 / 12 / 18 soft receptions", partner: "6 / 12 / 18 passes to your partner’s foot",
  weak: "10 / 20 / 30 weaker-foot touches", push: "6 / 12 / 18 accurate gentle passes",
};
export const drills: Drill[] = [...originals, ...extra].map((d) => {
  const raw = targets[d.id] ?? additions.find((a) => a[0] === d.id)![9];
  const parts = raw.split(" / ");
  const suffix = parts[2].replace(/^\d+/, "");
  const numbers = parts.map((v) => v.match(/^\d+/)![0]);
  return { ...d, version: 1, difficulty: 1,
    variants: ([1, 2, 3] as const).map((difficulty, i) => ({
      difficulty, label: ["Easier", "Build", "Harder"][i],
      target: `${numbers[i]}${suffix} per block. Reset between sets.`,
      cue: d.cue, steps: [...d.steps, [
        "Work slowly. Stop the ball and reset between repetitions.",
        "Link two repetitions before a reset; use both sides where possible.",
        "Link four repetitions before a reset. Lift your eyes between repetitions; keep your touches close.",
      ][i]], tip: d.tip,
    })),
  };
});
