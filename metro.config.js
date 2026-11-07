const { getDefaultConfig } = require('expo/metro-config');
const analysisMiddleware = require('./tools/replay_analysis/metro_proxy.cjs');
const config = getDefaultConfig(__dirname);
const previous = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) =>
  analysisMiddleware(previous ? previous(middleware, server) : middleware, __dirname);
module.exports = config;
