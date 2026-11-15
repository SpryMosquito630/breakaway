import { DEVELOPER_FEATURES } from "../config/features";
import { assertConnectedAccess, connectedAccessAllowed } from "./access";
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import { registerFeatureReset } from "../features/resetRegistry";
import { readConnectionConfig } from "./config";
const config = DEVELOPER_FEATURES
  ? readConnectionConfig(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    )
  : null;
// Web uses the SDK's browser storage. Native tokens stay in the platform keychain.
export const connectedClient = config
  ? createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        ...(Platform.OS === "web"
          ? {}
          : {
              storage: {
                getItem: (key: string) => SecureStore.getItemAsync(key),
                setItem: (key: string, value: string) =>
                  SecureStore.setItemAsync(key, value),
                removeItem: (key: string) => SecureStore.deleteItemAsync(key),
              },
            }),
      },
    })
  : null;
if (connectedClient && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active" && connectedAccessAllowed())
      connectedClient.auth.startAutoRefresh();
    else connectedClient.auth.stopAutoRefresh();
  });
}
export function requireClient() {
  assertConnectedAccess();
  if (!connectedClient) throw Error("Online features are not connected in this build.");
  return connectedClient;
}

if (connectedClient)
  registerFeatureReset("connected-auth", async () => {
    // The current SDK clears this device before attempting refresh-token revocation.
    const { error } = await connectedClient.auth.signOut({ scope: "local" });
    if (error) {
      const remaining = await connectedClient.auth.getSession();
      if (remaining.error || remaining.data.session) throw error;
    }
  });
