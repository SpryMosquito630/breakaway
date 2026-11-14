import { test } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  poseHasBody,
  poseMatchesVideo,
  shotPoseAt,
  validShotPose,
  visibleJoint,
} from "../src/domain/shotPose";
import type { JointResult } from "../src/coachAi/service";
const joints: JointResult["frames"][number]["joints"] = Array.from(
  { length: 33 },
  () => null,
);
joints[11] = { x: 0.3, y: 0.2, visibility: 0.9 };
joints[13] = { x: 0.2, y: 0.4, visibility: 0.8 };
const pose: JointResult = {
  durationSeconds: 2,
  width: 720,
  height: 1280,
  sampleFps: 5,
  fullBodyVisible: false,
  visibleFrameFraction: 0.5,
  limitations: "Estimated landmarks",
  frames: [
    { timestampSeconds: 0, joints },
    { timestampSeconds: 0.2, joints },
    { timestampSeconds: 1, joints: Array.from({ length: 33 }, () => null) },
  ],
};
test("pose sampling uses nearest actual timestamp and never extends through long gaps", () => {
  assert.equal(shotPoseAt(pose, 0.17), pose.frames[1]);
  assert.equal(shotPoseAt(pose, 0.55), null);
  assert.equal(shotPoseAt(pose, 1), pose.frames[2]);
  assert.equal(shotPoseAt(pose, 1.3), null);
  assert.equal(shotPoseAt(pose, Number.NaN), null);
});
test("confidence and viewport bounds gate every drawable point", () => {
  assert.equal(visibleJoint(joints[11]), true);
  assert.equal(visibleJoint({ x: 0.4, y: 0.5, visibility: 0.64 }), false);
  assert.equal(visibleJoint({ x: -0.02, y: 0.5, visibility: 0.99 }), false);
  assert.equal(visibleJoint({ x: 0.4, y: 1.01, visibility: 0.99 }), false);
  assert.equal(visibleJoint(null), false);
});
test("malformed or reordered tracking cannot render as a valid pose", () => {
  assert.equal(validShotPose(pose), true);
  assert.equal(validShotPose({ ...pose, frames: [...pose.frames].reverse() }), false);
  assert.equal(
    validShotPose({ ...pose, frames: [{ timestampSeconds: 0, joints: [] }] }),
    false,
  );
  assert.equal(validShotPose({ ...pose, width: 0 }), false);
  assert.equal(
    validShotPose({
      ...pose,
      frames: [
        {
          timestampSeconds: 0,
          joints: [...joints.slice(0, 32), { x: Number.NaN, y: 0, visibility: 1 }],
        },
      ],
    }),
    false,
  );
});
test("pose cannot align to a differently oriented or unrelated video", () => {
  assert.equal(poseMatchesVideo(pose, 360, 640, 2.05), true);
  assert.equal(poseMatchesVideo(pose, 1280, 720, 2), false);
  assert.equal(poseMatchesVideo(pose, 720, 1280, 8), false);
});
test("a genuine visible body edge is required; isolated points never imply a limb", () => {
  assert.equal(poseHasBody(pose), true);
  const isolated = joints.map((point, index) => (index === 11 ? point : null));
  assert.equal(
    poseHasBody({ ...pose, frames: [{ timestampSeconds: 0, joints: isolated }] }),
    false,
  );
});

// Three unmodified genuine samples from the current HTTP /pose response for
// public Pexels video 13189490; no user recording or inferred coordinates.
test("actual MediaPipe HTTP samples validate and align at the start of a video", () => {
  const detected = JSON.parse(
    readFileSync(
      new URL("./fixtures/shot-pose-public-video.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(validShotPose(detected), true);
  assert.equal(poseHasBody(detected), true);
  assert.equal(detected.frames[0].timestampSeconds, 0);
  assert.equal(shotPoseAt(detected, 0), detected.frames[0]);
  assert.equal(poseMatchesVideo(detected, 720, 1280, 18.451767), true);
  assert.equal(
    validShotPose({
      ...detected,
      frames: [
        { ...detected.frames[0], timestampSeconds: -0.0334 },
        ...detected.frames.slice(1),
      ],
    }),
    false,
  );
});
