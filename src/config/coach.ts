/** Remote Coach is a separate opt-in; never enables unfinished developer tools. */
export const COACH_REMOTE_ENABLED =
  process.env.EXPO_PUBLIC_COACH_REMOTE_ENABLED === "true";
/** Accountless tests require a debug build and explicit opt-in on both client and server. */
export const COACH_DEV_ENABLED =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_COACH_DEV_ENABLED === "true";
