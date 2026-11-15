// Explicit build-time opt-in. Production/default builds expose local training only.
export const DEVELOPER_FEATURES = process.env.EXPO_PUBLIC_DEVELOPER_FEATURES === "true";
