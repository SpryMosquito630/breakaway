import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  getIdToken,
  onAuthStateChanged,
  signInAnonymously,
} from "@react-native-firebase/auth";
import { initializeAppCheck, getToken } from "@react-native-firebase/app-check";
import { createHostedIdentityProvider } from "./hostedIdentityCore";

// App Attest needs the real provisioned iOS app; no debug provider or shared grant.
const appCheck = initializeAppCheck(getApp(), {
  provider: { providerOptions: { apple: { provider: "appAttest" } } },
  isTokenAutoRefreshEnabled: true,
});
const auth = getAuth();
const ready = new Promise<void>((resolve) => {
  let stop: (() => void) | undefined;
  stop = onAuthStateChanged(auth, () => {
    // Native callbacks are asynchronous; queueing also tolerates a synchronous SDK.
    queueMicrotask(() => stop?.());
    resolve();
  });
});
export const getHostedIdentity = createHostedIdentityProvider({
  ready: () => ready,
  currentUser: () => auth.currentUser,
  signIn: async () => (await signInAnonymously(auth)).user,
  idToken: (user) => getIdToken(user),
  appCheckToken: async () => (await getToken(appCheck)).token,
});
