export type DrillInstruction = {
  /** Something the player can deliberately observe; never an assessed result. */
  watch: string;
  mistake: string;
};

// Authored practice prompts based on the catalog's written steps. These are
// self-checks, not automated feedback or coach-reviewed technique assessments.
export const drillInstructions: Record<string, DrillInstruction> = {
  "keeper-hold": {
    watch:
      "Catch a gentle face-height self-toss with relaxed arms and both feet grounded.",
    mistake:
      "Tossing above your reach. Lower the next toss; keep both feet on the ground.",
  },
  "keeper-roll": {
    watch:
      "Roll close to the ground, then stop the return with your foot before picking it up.",
    mistake: "Reaching down for a moving return. Let your foot stop the ball first.",
  },
  sole: {
    watch: "Roll with the sole, then stop the ball with the opposite foot.",
    mistake:
      "Pushing too far to stop comfortably. Shorten the roll before switching feet.",
  },
  inside: {
    watch: "Keep each inside touch between your feet.",
    mistake: "Chasing the ball sideways. Use a lighter touch and reset your stance.",
  },
  gates: {
    watch: "Look for the next gate while the ball stays within a step.",
    mistake: "Rushing into the next gate. Slow down and choose a clear route first.",
  },
  turn: {
    watch: "Pull back with your sole, then turn and follow the ball.",
    mistake: "Turning before the pull is controlled. Stop and reset before trying again.",
  },
  wall: {
    watch: "Cushion the return so your next pass is within a step.",
    mistake: "Passing harder than you can receive. Reduce the pass strength.",
  },
  partner: {
    watch: "Pass to your partner’s foot, then take a sideways step.",
    mistake: "Moving before the pass is directed. Finish the pass before stepping.",
  },
  weak: {
    watch: "Use your weaker foot for both inside and outside touches.",
    mistake:
      "Rescuing every touch with your stronger foot. Stop and restart more slowly.",
  },
  push: {
    watch: "Push gently enough to walk after the ball and stop it.",
    mistake: "Kicking the ball out of reach. Make the next push shorter.",
  },
  "toe-taps": {
    watch: "Alternate soles on top while the ball stays still.",
    mistake: "Putting weight onto the ball. Touch lightly and land beside it.",
  },
  "v-pull": {
    watch: "Use the same foot for the pull back and diagonal push.",
    mistake:
      "Pushing straight ahead after the pull. Reset and make a short diagonal exit.",
  },
  "l-turn": {
    watch: "Pull back, tap behind your standing leg, then turn to collect.",
    mistake:
      "Reaching behind your leg while off balance. Shorten the pull and reset your feet.",
  },
  "inside-out": {
    watch: "Use the inside, then outside, of the same foot.",
    mistake:
      "Changing feet between the two touches. Stop and repeat the pair on one foot.",
  },
  "foundation-stop": {
    watch: "After three inside touches, stop the ball and hold your balance.",
    mistake: "Starting again while the ball is still rolling. Wait for a quiet stop.",
  },
  "receive-across": {
    watch: "Let the far foot cushion the ball across your body within a step.",
    mistake:
      "Knocking the ball away with a stiff foot. Roll it more gently and soften the contact.",
  },
  "outside-cut": {
    watch: "Change direction with the outside of your foot, then follow.",
    mistake: "Cutting farther than you can follow at walking pace. Use a smaller touch.",
  },
  "inside-cut": {
    watch: "Plant beside the ball before the other foot cuts it across.",
    mistake: "Planting in the ball’s path. Stop and leave room beside it for the cut.",
  },
  "step-over": {
    watch: "Circle one foot around the ball; exit with the other foot’s outside.",
    mistake:
      "Moving the ball during the circle. Start stationary and slow the step-over.",
  },
  "shield-turn": {
    watch: "Keep the ball beside your far foot as you roll away and turn.",
    mistake: "Crossing your feet during the turn. Stop and take smaller steps.",
  },
  "weak-roll": {
    watch: "Use your weaker sole for the forward, sideways and backward path.",
    mistake:
      "Locking your standing knee while reaching. Shorten the path and keep the knee soft.",
  },
  "weak-v": {
    watch: "Pull and push diagonally with the same weaker foot.",
    mistake: "Using the stronger foot for the exit. Reset and make a shorter V.",
  },
  "weak-cut": {
    watch: "Use your weaker foot for the approach, inside cut and sole stop.",
    mistake: "Letting the cut run beyond your stop. Reduce the touch before repeating.",
  },
  "pass-brake": {
    watch: "Walk after the pass and brake with the opposite foot’s inside.",
    mistake: "Passing so hard you need to chase it. Aim only a couple of steps away.",
  },
  "pass-angle": {
    watch: "Set the ball clear of your feet before the diagonal pass.",
    mistake:
      "Passing while the ball is trapped underneath you. Reset the setup touch first.",
  },
  "gate-pass": {
    watch: "Send a gentle ground pass through the middle of the gate.",
    mistake: "Adding power when the pass misses. Slow down and aim through the centre.",
  },
  "wall-open": {
    watch: "Receive across with the far foot, then pass back with the other foot.",
    mistake:
      "Stopping the return underneath you. Soften the touch toward your next pass.",
  },
  slalom: {
    watch: "Use small touches around each marker and turn before returning.",
    mistake:
      "Taking a large touch past a marker. Walk the route and widen the spacing if needed.",
  },
  "carry-scan": {
    watch: "Look up every three touches while keeping the ball within one stride.",
    mistake: "Looking up after a heavy touch. Slow the dribble before lifting your eyes.",
  },
  "partner-first": {
    watch: "Receive into clear space on one side before passing back.",
    mistake:
      "Sending the first touch too far to pass comfortably. Ask for a gentler return.",
  },
};
