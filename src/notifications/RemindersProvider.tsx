import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import { PRACTICE_NOTIFICATION_ID } from "./practiceSchedule";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../state/AppState";
import {
  defaultReminders,
  desiredReminders,
  normalizeReminders,
  reconcileReminders,
  ReminderPreferences,
  ReminderScheduler,
} from "./schedule";

const KEY = "breakaway-reminders-v1";
const CHANNEL = "training-reminders";
const supported = Platform.OS === "ios" || Platform.OS === "android";
type Notifications = typeof import("expo-notifications");
// Load native notification code only on supported platforms; the web preview remains usable.
let notifications: Promise<Notifications> | undefined;
function native() {
  return (notifications ??= import("expo-notifications").then((n) => {
    // Match SDK 58's foreground presentation defaults, including our training reminders.
    n.setNotificationHandler({
      handleNotification: async (notification) => {
        const practiceInForeground = notification.request.identifier === PRACTICE_NOTIFICATION_ID && AppState.currentState === "active";
        return {
          shouldShowBanner: !practiceInForeground,
          shouldShowList: !practiceInForeground,
          shouldPlaySound: !practiceInForeground,
          shouldSetBadge: false,
        };
      },
    });
    return n;
  }));
}
let pending = Promise.resolve();
function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const next = pending.then(operation, operation);
  pending = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
function scheduler(n: Notifications): ReminderScheduler {
  return {
    list: () => n.getAllScheduledNotificationsAsync(),
    cancel: (identifier) => n.cancelScheduledNotificationAsync(identifier),
    schedule: async (reminder) => {
      await n.scheduleNotificationAsync({
        identifier: reminder.identifier,
        content: {
          title: "Time for your next touch",
          body: "Your Breakaway training plan is ready.",
          sound: "default",
          data: { reminderSignature: reminder.signature },
        },
        trigger: {
          type: n.SchedulableTriggerInputTypes.DATE,
          date: reminder.date,
          channelId: CHANNEL,
        },
      });
    },
  };
}
async function channel(n: Notifications) {
  if (Platform.OS === "android")
    await n.setNotificationChannelAsync(CHANNEL, {
      name: "Training reminders",
      importance: n.AndroidImportance.DEFAULT,
      sound: "default",
    });
}
function permitted(
  p: Awaited<ReturnType<Notifications["getPermissionsAsync"]>>,
  n: Notifications,
) {
  return p.granted || p.ios?.status === n.IosAuthorizationStatus.PROVISIONAL;
}
type Store = {
  preferences: ReminderPreferences;
  busy: boolean;
  ready: boolean;
  supported: boolean;
  message: string;
  setEnabled: (enabled: boolean) => Promise<void>;
  setTime: (hour: number, minute: number) => Promise<void>;
  reset: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const { data, loading } = useApp();
  const [preferences, setPreferences] = useState(defaultReminders);
  const prefs = useRef(preferences);
  const days = useRef(data.profile.days);
  days.current = data.profile.days;
  const history = useRef(data.history);
  history.current = data.history;
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyCount = useRef(0);
  const [message, setMessage] = useState(
    supported ? "" : "Reminders work in the iOS and Android app.",
  );
  const sync = useCallback(async () => {
    if (!supported) return;
    const n = await native();
    const api = scheduler(n);
    if (!prefs.current.enabled) {
      await reconcileReminders(api, []);
      setMessage("");
      return;
    }
    const permission = await n.getPermissionsAsync();
    if (!permitted(permission, n)) {
      await reconcileReminders(api, []);
      setMessage(
        "Notifications are blocked. Allow them in device Settings, or turn reminders off.",
      );
      return;
    }
    await channel(n);
    await reconcileReminders(
      api,
      desiredReminders(days.current, prefs.current, history.current),
    );
    setMessage(
      "Scheduled for untrained days in the next 7 days. Open the app each week to refresh. Device settings may delay delivery.",
    );
  }, []);
  const run = useCallback(async (operation: () => Promise<void>) => {
    busyCount.current += 1;
    setBusy(true);
    try {
      await serialized(operation);
    } catch {
      setMessage(
        "Reminders could not be updated. Existing reminders may still be scheduled. Try saving again on your device.",
      );
    } finally {
      busyCount.current -= 1;
      if (!busyCount.current) setBusy(false);
    }
  }, []);
  const commit = useCallback(
    async (next: ReminderPreferences) => {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      prefs.current = next;
      setPreferences(next);
      await sync();
    },
    [sync],
  );
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!mounted) return;
        const restored = raw
          ? normalizeReminders(JSON.parse(raw))
          : defaultReminders();
        prefs.current = restored;
        setPreferences(restored);
      })
      .catch(() => {
        if (mounted)
          setMessage(
            "Saved reminder settings could not be read. Set them again below.",
          );
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const dayKey = data.profile.days.join(",");
  const historyKey = data.history.map((h) => `${h.date}:${h.seconds}`).join(",");
  useEffect(() => {
    if (ready && !loading) void run(sync);
  }, [ready, loading, dayKey, historyKey, run, sync]);
  useEffect(() => {
    // Refresh at local midnight even when the app stays open overnight.
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => {
        if (AppState.currentState === "active" && ready && !loading) void run(sync);
        refresh();
      }, midnight.getTime() - now.getTime() + 1000);
    };
    refresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && ready && !loading) void run(sync);
    });
    return () => { clearTimeout(timer); sub.remove(); };
  }, [ready, loading, run, sync]);
  const setEnabled = (enabled: boolean) =>
    run(async () => {
      if (!supported) return;
      if (enabled) {
        const n = await native();
        // Android must have a channel before its notification permission prompt.
        await channel(n);
        let permission = await n.getPermissionsAsync();
        if (!permitted(permission, n) && permission.canAskAgain)
          permission = await n.requestPermissionsAsync({
            ios: { allowAlert: true, allowSound: true, allowBadge: false },
          });
        if (!permitted(permission, n)) {
          setMessage(
            "Notifications are blocked. Allow them in device Settings to enable reminders.",
          );
          return;
        }
      }
      await commit({ ...prefs.current, enabled });
    });
  return (
    <Context.Provider
      value={{
        preferences,
        busy,
        ready,
        supported,
        message,
        setEnabled,
        setTime: (hour, minute) =>
          run(() =>
            commit(normalizeReminders({ ...prefs.current, hour, minute })),
          ),
        reset: () => run(() => commit(defaultReminders())),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useReminders() {
  const value = useContext(Context);
  if (!value) throw Error("Missing RemindersProvider");
  return value;
}
