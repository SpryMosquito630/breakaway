import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppData,
  initialData,
  pause,
  tick,
  days,
  goals,
  matchPlan,
} from "../domain/model";
import { drills } from "../data/drills";
const KEY = "player-accelerator-v1";
type Store = {
  data: AppData;
  update: (fn: (s: AppData) => AppData) => void;
  loading: boolean;
  error: string | null;
  retry: () => void;
};
const Context = createContext<Store | null>(null);
function restore(raw: string): AppData {
  const p = JSON.parse(raw);
  const profile = p.profile;
  if (
    p.version !== 1 ||
    typeof p.onboarded !== "boolean" ||
    !profile ||
    !goals.includes(profile.goal) ||
    !["New to training", "Some experience"].includes(profile.experience) ||
    ![15, 20, 30].includes(profile.minutes) ||
    !Array.isArray(profile.days) ||
    !profile.days.length ||
    !profile.days.every((d: string) => days.includes(d)) ||
    !Array.isArray(profile.gear) ||
    !profile.gear.every((g: string) =>
      ["markers", "wall", "partner"].includes(g),
    ) ||
    !["Small space", "Open space"].includes(profile.space) ||
    !Array.isArray(p.plan) ||
    !Array.isArray(p.history) ||
    !Array.isArray(p.benchmarks)
  )
    throw Error("Invalid saved preferences");
  const known = (id: string) => drills.some((d) => d.id === id);
  p.plan =
    p.plan.length && p.plan.every(known) ? p.plan : matchPlan(drills, profile);
  if (p.active) {
    const a = p.active;
    if (
      !Array.isArray(a.ids) ||
      !a.ids.length ||
      !a.ids.every(known) ||
      !Number.isInteger(a.index) ||
      a.index < 0 ||
      a.index >= a.ids.length ||
      !["setup", "timer"].includes(a.phase) ||
      !["duration", "remaining", "elapsed", "done", "skipped", "last"].every(
        (k) => Number.isFinite(a[k]) && a[k] >= 0,
      ) ||
      a.duration < 1 ||
      a.remaining > a.duration
    )
      throw Error("Invalid saved session");
    p.active = { ...a, running: false };
  }
  p.history = p.history.filter(
    (h: any) =>
      typeof h.id === "string" &&
      typeof h.date === "string" &&
      Number.isFinite(Date.parse(h.date)) &&
      Number.isFinite(h.seconds) &&
      h.seconds >= 0 &&
      Number.isInteger(h.done) &&
      Number.isInteger(h.total) &&
      h.total > 0 &&
      h.done >= 0 &&
      h.done <= h.total,
  );
  p.benchmarks = p.benchmarks.filter(
    (b: any) =>
      typeof b.id === "string" &&
      Number.isFinite(Date.parse(b.date)) &&
      Number.isInteger(b.count) &&
      b.count >= 0 &&
      b.count <= 999,
  );
  return p;
}
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(data);
  const pending = useRef<AppData | null>(null);
  const writing = useRef(false);
  const ticks = useRef(0);
  const persist = useCallback((next: AppData) => {
    pending.current = next;
    if (writing.current) return;
    writing.current = true;
    void (async () => {
      while (pending.current) {
        const value = pending.current;
        pending.current = null;
        try {
          await AsyncStorage.setItem(KEY, JSON.stringify(value));
          setError(null);
        } catch {
          setError(
            "Changes could not be saved on this device. Keep the app open and try again.",
          );
        }
      }
      writing.current = false;
    })();
  }, []);
  const apply = useCallback(
    (fn: (s: AppData) => AppData, save = true) => {
      const next = fn(latest.current);
      latest.current = next;
      setData(next);
      if (save) persist(next);
    },
    [persist],
  );
  const update = useCallback(
    (fn: (s: AppData) => AppData) => apply(fn),
    [apply],
  );
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!mounted) return;
        if (raw) {
          const restored = restore(raw);
          latest.current = restored;
          setData(restored);
          persist(restored);
        }
      })
      .catch(() => {
        if (mounted)
          setError(
            "Saved data could not be read. A fresh plan is available. Reset in Settings to clear damaged data.",
          );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [persist]);
  useEffect(() => {
    const id = setInterval(() => {
      if (latest.current.active?.running) {
        ticks.current++;
        const checkpoint = ticks.current % 5 === 0;
        apply((s) => ({ ...s, active: tick(s.active!) }), checkpoint);
      }
    }, 1000);
    const sub = AppState.addEventListener("change", (status) => {
      if (status !== "active" && latest.current.active?.running)
        update((s) => ({ ...s, active: pause(s.active!) }));
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [apply, update]);
  return (
    <Context.Provider
      value={{
        data,
        update,
        loading,
        error,
        retry: () => persist(latest.current),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const v = useContext(Context);
  if (!v) throw Error("Missing AppProvider");
  return v;
}
