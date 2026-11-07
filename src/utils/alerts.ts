import { Alert, Platform, type AlertButton, type AlertOptions } from "react-native";

/** React Native Alert has no browser implementation; keep confirmations functional there. */
export const AppAlert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      Alert.alert(title, message, buttons, options);
      return;
    }
    const body = [title, message].filter(Boolean).join("\n\n");
    const action = buttons?.filter(button => button.style !== "cancel").at(-1);
    const cancel = buttons?.find(button => button.style === "cancel");
    if (buttons && buttons.length > 1 && action) {
      if (window.confirm(`${body}\n\nOK: ${action.text ?? "Continue"}`)) action.onPress?.();
      else { cancel?.onPress?.(); options?.onDismiss?.(); }
    } else {
      window.alert(body);
      action?.onPress?.();
    }
  },
};
