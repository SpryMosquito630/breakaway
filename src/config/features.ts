// Explicit build-time opt-in. Production/default builds expose local training only.
export const DEVELOPER_FEATURES = process.env.EXPO_PUBLIC_DEVELOPER_FEATURES === "true";

/** Laptop-backed screens are preview tools, never release destinations. */
export function localServicePreviewAllowed(debug: boolean, optedIn: boolean) {
  return debug && optedIn;
}
export const LOCAL_SERVICE_PREVIEW = localServicePreviewAllowed(
  typeof __DEV__ !== "undefined" && __DEV__,
  (process.env.EXPO_PUBLIC_COACH_REMOTE_ENABLED === "true" &&
    process.env.EXPO_PUBLIC_COACH_DEV_ENABLED === "true") ||
    process.env.EXPO_PUBLIC_SHOT_POSE_ANALYSIS === "true",
);
