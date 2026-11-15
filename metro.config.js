const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
// Expo loads .env before this config. Restart Metro after changing this build flag.
const developerFeatures = process.env.EXPO_PUBLIC_DEVELOPER_FEATURES === "true";
const shotPoseAnalysis = process.env.EXPO_PUBLIC_SHOT_POSE_ANALYSIS === "true";
const coachRemote = process.env.EXPO_PUBLIC_COACH_REMOTE_ENABLED === "true";
const coachPairing = coachRemote && process.env.EXPO_PUBLIC_COACH_DEV_ENABLED === "true";
config.cacheVersion = `${config.cacheVersion ?? ""}-developer-${developerFeatures}-shot-pose-${shotPoseAnalysis}-coach-${coachRemote}-local-release-${process.env.NODE_ENV === "production"}`;
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    (process.env.NODE_ENV === "production" || (!coachPairing && !shotPoseAnalysis)) &&
    /(?:^|\/)LocalServiceScreens$/.test(moduleName)
  ) {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "src/screens/LocalServiceScreens.disabled.ts"),
    };
  }
  if (!developerFeatures && /(?:^|\/)DeveloperScreens$/.test(moduleName)) {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "src/screens/DeveloperScreens.disabled.ts"),
    };
  }
  return resolveRequest
    ? resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};
if (developerFeatures || shotPoseAnalysis || coachRemote) {
  const analysisMiddleware = require("./tools/replay_analysis/metro_proxy.cjs");
  const previous = config.server.enhanceMiddleware;
  config.server.enhanceMiddleware = (middleware, server) =>
    analysisMiddleware(previous ? previous(middleware, server) : middleware, __dirname, {
      poseOnly: !developerFeatures,
      coachChat: coachRemote,
      coachPairing,
      shotReview: coachPairing,
    });
}
module.exports = config;
