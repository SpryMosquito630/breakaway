/** A hosted build never discovers a laptop or accepts a bundled bearer secret. */
export function readHostedAnalysisConfig(enabled?: string, endpoint?: string) {
  if (enabled !== "true" || !endpoint) return null;
  try {
    const url = new URL(endpoint);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.hostname.includes(".") ||
      /^(?:\d+\.){3}\d+$/.test(url.hostname) ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(url.hostname)
    )
      return null;
    return { base: url.href.replace(/\/+$/, "") };
  } catch {
    return null;
  }
}
export const HOSTED_ANALYSIS_CONFIG = readHostedAnalysisConfig(
  process.env.EXPO_PUBLIC_HOSTED_ANALYSIS_ENABLED,
  process.env.EXPO_PUBLIC_HOSTED_ANALYSIS_URL,
);
export const HOSTED_ANALYSIS_REQUESTED =
  process.env.EXPO_PUBLIC_HOSTED_ANALYSIS_ENABLED === "true";
