import { useEffect } from "react";
import { Linking, Platform } from "react-native";
import { COACH_DEV_ENABLED } from "../config/coach";
import { saveCoachPair } from "./pairStore";
import { createCoachInviteCapture } from "./previewInvite";

/** Mounted before fonts/navigation: no private link is lost while the app starts. */
export function useCoachInviteCapture() {
  useEffect(() => {
    if (!COACH_DEV_ENABLED) return;
    const capture = createCoachInviteCapture((pair) => {
      void saveCoachPair(pair);
    });
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const consume = (warm: boolean) => {
        const url = window.location.href;
        if (warm) capture.warm(url);
        else capture.cold(url);
        if (new URLSearchParams(window.location.hash.slice(1)).has("coachInvite")) {
          window.history.replaceState(
            window.history.state,
            "",
            window.location.pathname + window.location.search,
          );
        }
      };
      consume(false);
      const warm = () => consume(true);
      window.addEventListener("hashchange", warm);
      return () => {
        capture.dispose();
        window.removeEventListener("hashchange", warm);
      };
    }
    const subscription = Linking.addEventListener("url", ({ url }) => {
      capture.warm(url);
    });
    void Linking.getInitialURL()
      .then((url) => capture.cold(url))
      .catch(() => {});
    return () => {
      capture.dispose();
      subscription.remove();
    };
  }, []);
}
