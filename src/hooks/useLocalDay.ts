import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { millisecondsUntilTomorrow } from "../domain/sessionTime";

/** Refresh at calendar boundaries and on return; never tick the whole app. */
export function useLocalDay() {
  const [now, setNow] = useState(() => new Date());
  const refresh = useCallback(() => { setNow(new Date()); }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const timer = setTimeout(refresh, millisecondsUntilTomorrow(new Date()) + 50);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [now, refresh]);
  return now;
}
