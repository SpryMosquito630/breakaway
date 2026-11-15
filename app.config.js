module.exports = ({ config = require("./app.json").expo } = {}) => {
  const base = config;
  const hosted = process.env.EXPO_PUBLIC_HOSTED_ANALYSIS_ENABLED === "true";
  const firebaseModules = [
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "@react-native-firebase/app-check",
  ];
  if (!hosted) return base;
  const googleServicesFile = process.env.BREAKAWAY_FIREBASE_IOS_CONFIG;
  if (!googleServicesFile)
    throw Error(
      "Hosted analysis builds require BREAKAWAY_FIREBASE_IOS_CONFIG (GoogleService-Info.plist).",
    );
  let endpoint;
  try {
    endpoint = new URL(process.env.EXPO_PUBLIC_HOSTED_ANALYSIS_URL);
  } catch {}
  if (
    !endpoint ||
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  )
    throw Error("Hosted analysis builds require EXPO_PUBLIC_HOSTED_ANALYSIS_URL.");
  return {
    ...base,
    ios: {
      ...base.ios,
      googleServicesFile,
      entitlements: {
        ...base.ios.entitlements,
        "com.apple.developer.devicecheck.appattest-environment": "production",
      },
    },
    plugins: [
      ...base.plugins.map((plugin) => {
        const [name, options = {}] = Array.isArray(plugin) ? plugin : [plugin];
        return ["expo-camera", "expo-audio"].includes(name)
          ? [
              name,
              {
                ...options,
                microphonePermission: "Record audio with your practice video.",
              },
            ]
          : plugin;
      }),
      ...firebaseModules,
      ["expo-build-properties", { ios: { useFrameworks: "dynamic" } }],
    ],
  };
};
