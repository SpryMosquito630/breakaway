import type { Joint, JointResult } from "../coachAi/service";

export const BODY_EDGES = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 29],
  [29, 31],
  [27, 31],
  [28, 30],
  [30, 32],
  [28, 32],
] as const;
export function visibleJoint(point: Joint | null | undefined): point is Joint {
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= 0 &&
    point.x <= 1 &&
    point.y >= 0 &&
    point.y <= 1 &&
    Number.isFinite(point.visibility) &&
    point.visibility >= 0.65 &&
    point.visibility <= 1
  );
}
export function validShotPose(value: unknown): value is JointResult {
  if (!value || typeof value !== "object") return false;
  const pose = value as JointResult;
  return (
    Number.isFinite(pose.width) &&
    pose.width > 0 &&
    Number.isFinite(pose.height) &&
    pose.height > 0 &&
    Number.isFinite(pose.durationSeconds) &&
    pose.durationSeconds > 0 &&
    pose.durationSeconds <= 31 &&
    Number.isFinite(pose.sampleFps) &&
    pose.sampleFps > 0 &&
    pose.sampleFps <= 30 &&
    Array.isArray(pose.frames) &&
    pose.frames.length > 0 &&
    pose.frames.length <= 1000 &&
    pose.frames.every(
      (frame, index) =>
        frame &&
        Number.isFinite(frame.timestampSeconds) &&
        frame.timestampSeconds >= 0 &&
        frame.timestampSeconds <= pose.durationSeconds &&
        (index === 0 ||
          frame.timestampSeconds >= pose.frames[index - 1].timestampSeconds) &&
        Array.isArray(frame.joints) &&
        frame.joints.length === 33 &&
        frame.joints.every(
          (point) =>
            point === null ||
            (Number.isFinite(point.x) &&
              Number.isFinite(point.y) &&
              Number.isFinite(point.visibility) &&
              point.visibility >= 0 &&
              point.visibility <= 1),
        ),
    )
  );
}
/** Never interpolate or extend a detected pose through a missing interval. */
export function shotPoseAt(pose: JointResult, time: number) {
  if (!Number.isFinite(time)) return null;
  let closest: JointResult["frames"][number] | null = null;
  for (const frame of pose.frames) {
    if (
      !closest ||
      Math.abs(frame.timestampSeconds - time) < Math.abs(closest.timestampSeconds - time)
    )
      closest = frame;
    if (frame.timestampSeconds > time) break;
  }
  return closest &&
    Math.abs(closest.timestampSeconds - time) <= Math.min(0.16, 0.75 / pose.sampleFps)
    ? closest
    : null;
}
export function poseHasBody(pose: JointResult) {
  return pose.frames.some((frame) =>
    BODY_EDGES.some(
      ([a, b]) => visibleJoint(frame.joints[a]) && visibleJoint(frame.joints[b]),
    ),
  );
}
export function poseMatchesVideo(
  pose: JointResult,
  width: number,
  height: number,
  duration: number,
) {
  return (
    Math.abs(pose.durationSeconds - duration) <= 0.6 &&
    Math.abs(Math.log(pose.width / pose.height / (width / height))) < 0.08
  );
}
