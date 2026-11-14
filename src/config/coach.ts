/** Remote Coach is a separate opt-in; never enables unfinished developer tools. */
export const COACH_REMOTE_ENABLED =
  process.env.EXPO_PUBLIC_COACH_REMOTE_ENABLED === "true";
