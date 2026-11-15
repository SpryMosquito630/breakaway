// Local-only builds do not link Firebase or require Google service configuration.
const hosted = process.env.EXPO_PUBLIC_HOSTED_ANALYSIS_ENABLED === "true";
module.exports = {
  dependencies: hosted
    ? {}
    : Object.fromEntries(
        ["app", "auth", "app-check"].map((name) => [
          `@react-native-firebase/${name}`,
          { platforms: { ios: null, android: null } },
        ]),
      ),
};
