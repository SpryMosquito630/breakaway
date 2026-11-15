import { combinedCatalog } from "../domain/training";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { practiceLifecycle } from "../domain/practiceClock";
import {
  allowBackgroundPractice,
  backgroundPracticeAllowed,
  onPracticeNotificationFailure,
  practiceNotifications,
} from "../notifications/practiceNative";
import { drills } from "../data/drills";
import { createAppStoreCore } from "./appStoreCore";

type Store = ReturnType<typeof createAppStoreCore>;
type ContextValue = ReturnType<Store["getSnapshot"]> & {
  catalog: import("../domain/model").Drill[];
  update: Store["update"];
  retry: () => void;
  checkpointActive: Store["checkpointActive"];
  backgroundClockMessage: string;
  backgroundClockBusy: boolean;
  setBackgroundPractice: (enabled: boolean) => Promise<void>;
};
const Context = createContext<ContextValue | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createAppStoreCore(AsyncStorage));
  const [backgroundClockMessage, setBackgroundClockMessage] = useState("");
  const [backgroundClockBusy, setBackgroundClockBusy] = useState(false);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  useEffect(() => {
    void store.load();
  }, [store]);
  useEffect(() => {
    const verifyPermission = async () => {
      if (!store.getData().backgroundPractice && !store.getData().active?.backgroundClock)
        return;
      let allowed = false;
      try {
        allowed = await backgroundPracticeAllowed();
      } catch {
        /* Foreground fallback. */
      }
      if (!allowed) {
        store.update((s) => ({
          ...s,
          backgroundPractice: false,
          active: s.active
            ? {
                ...practiceLifecycle(s.active, false),
                backgroundClock: false,
                running: false,
              }
            : null,
        }));
        setBackgroundClockMessage(
          "Notifications are unavailable. Practice pauses when you leave the app. Allow notifications in device Settings to enable background practice.",
        );
      }
    };
    if (!snapshot.loading && !snapshot.recovery) void verifyPermission();
    const sub = AppState.addEventListener("change", (status) => {
      if (store.getData().active?.running)
        store.update((s) => ({
          ...s,
          active: s.active ? practiceLifecycle(s.active, status === "active") : null,
        }));
      if (status === "active") void verifyPermission();
    });
    return () => sub.remove();
  }, [store, snapshot.loading, snapshot.recovery]);
  useEffect(() => {
    const stopListening = onPracticeNotificationFailure(() => {
      setBackgroundClockMessage(
        "The end alert could not be updated. Practice is paused and background practice is off. An older alert may remain; check device notification settings before trying again.",
      );
      const data = store.getData();
      // A failing cancellation during fallback must not publish another identical update forever.
      if (data.backgroundPractice || data.active?.backgroundClock)
        store.update((s) => ({
          ...s,
          backgroundPractice: false,
          active: s.active
            ? {
                ...practiceLifecycle(s.active, false),
                backgroundClock: false,
                running: false,
              }
            : null,
        }));
    });
    const sync = () => {
      const state = store.getSnapshot();
      if (!state.loading && !state.recovery)
        void practiceNotifications.sync(store.getData().active);
    };
    sync();
    const unsubscribe = store.subscribe(sync);
    return () => {
      unsubscribe();
      stopListening();
    };
  }, [store]);
  const setBackgroundPractice = async (enabled: boolean) => {
    if (backgroundClockBusy) return;
    const sessionId = store.getData().active?.id;
    setBackgroundClockBusy(true);
    try {
      if (enabled && !(await allowBackgroundPractice())) {
        setBackgroundClockMessage(
          "Notifications are unavailable. Practice pauses when you leave the app. Allow notifications in device Settings to enable background practice.",
        );
        return;
      }
      if (store.getData().active?.id !== sessionId) return;
      store.update((s) => ({ ...s, backgroundPractice: enabled }));
      setBackgroundClockMessage("");
    } catch {
      setBackgroundClockMessage(
        "Background practice could not be enabled. Practice will pause when you leave the app.",
      );
    } finally {
      setBackgroundClockBusy(false);
    }
  };
  return (
    <Context.Provider
      value={{
        ...snapshot,
        catalog: combinedCatalog(drills, snapshot.data),
        backgroundClockMessage,
        backgroundClockBusy,
        setBackgroundPractice,
        update: store.update,
        retry: () => {
          void store.retry();
        },
        checkpointActive: store.checkpointActive,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw Error("Missing AppProvider");
  return value;
}
