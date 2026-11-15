import { Platform } from "react-native";
import Constants from "expo-constants";
import { waitForShotTask } from "./shotReviewPreparation";
import type { HostedIdentity } from "./hostedIdentityCore";

export async function hostedIdentity(signal: AbortSignal): Promise<HostedIdentity> {
  if (Platform.OS !== "ios" || Constants.appOwnership === "expo")
    throw new Error("Hosted analysis requires the updated Breakaway iPhone app.");
  try {
    return await waitForShotTask(signal, async () => {
      // Expo Go and local training never initialize or require Firebase modules.
      const native = await import("./hostedIdentityNative");
      return native.getHostedIdentity();
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      "Analysis could not verify this iPhone. Use the latest Breakaway app on a supported iPhone and retry.",
    );
  }
}
