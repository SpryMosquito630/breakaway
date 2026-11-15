const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
// Expo loads .env before this config. Restart Metro after changing this build flag.
const developerFeatures = process.env.EXPO_PUBLIC_DEVELOPER_FEATURES === "true";
config.cacheVersion = `${config.cacheVersion ?? ""}-developer-${developerFeatures}`;
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
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
if (developerFeatures) {
  const analysisMiddleware = require("./tools/replay_analysis/metro_proxy.cjs");
  const previous = config.server.enhanceMiddleware;
  config.server.enhanceMiddleware = (middleware, server) =>
    analysisMiddleware(previous ? previous(middleware, server) : middleware, __dirname);
}
module.exports = config;
