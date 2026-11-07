import { AppState, Platform } from "react-native";
import * as Haptics from "expo-haptics";

export type HapticFeedback =
  | "selection"
  | "light"
  | "medium"
  | "success"
  | "warning"
  | "error"
  | "toggle-on"
  | "toggle-off"
  | false;

/** User-action feedback. Native settings retain control; unsupported platforms fail silently. */
export function haptic(feedback: HapticFeedback = "selection"): void {
  if (!feedback || Platform.OS === "web" || AppState.currentState !== "active") return;
  try {
    let request: Promise<void>;
    if (Platform.OS === "android") {
      const effect =
        feedback === "selection"
          ? Haptics.AndroidHaptics.Segment_Tick
          : feedback === "toggle-on"
            ? Haptics.AndroidHaptics.Toggle_On
            : feedback === "toggle-off"
              ? Haptics.AndroidHaptics.Toggle_Off
              : feedback === "success"
                ? Haptics.AndroidHaptics.Confirm
                : feedback === "warning" || feedback === "error"
                  ? Haptics.AndroidHaptics.Reject
                  : feedback === "medium"
                    ? Haptics.AndroidHaptics.Context_Click
                    : Haptics.AndroidHaptics.Virtual_Key;
      request = Haptics.performAndroidHapticsAsync(effect);
    } else if (
      feedback === "selection" ||
      feedback === "toggle-on" ||
      feedback === "toggle-off"
    ) {
      request = Haptics.selectionAsync();
    } else if (feedback === "light" || feedback === "medium") {
      request = Haptics.impactAsync(
        feedback === "medium"
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      );
    } else {
      request = Haptics.notificationAsync(
        feedback === "success"
          ? Haptics.NotificationFeedbackType.Success
          : feedback === "warning"
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Error,
      );
    }
    void request.catch(() => {});
  } catch {
    // A missing native capability must never block an action or override OS preferences.
  }
}
