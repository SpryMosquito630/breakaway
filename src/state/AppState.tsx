import { combinedCatalog } from "../domain/training";
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
import { AppData, initialData, pause } from "../domain/model";
import { restoreAppData } from "../domain/storage";
import { Active } from "../domain/model";
import { drills } from "../data/drills";
const KEY = "player-accelerator-v1";
type Store = {
  data: AppData;
  catalog: import("../domain/model").Drill[];
  update: (fn: (s: AppData) => AppData) => void;
  loading: boolean;
  error: string | null;
  retry: () => void;
  checkpointActive: (active: Active) => void;
};
const Context = createContext<Store | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(data);
  const pending = useRef<AppData | null>(null);
  const writing = useRef(false);
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
          const restored = restoreAppData(raw, drills);
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
    const sub = AppState.addEventListener("change", (status) => {
      if (status !== "active" && latest.current.active?.running)
        update((s) => ({ ...s, active: pause(s.active!) }));
    });
    return () => {
      sub.remove();
    };
  }, [apply, update]);
  const checkpointActive = useCallback(
    (active: Active) => {
      const current = latest.current.active;
      if (
        !current ||
        current.id !== active.id ||
        current.index !== active.index ||
        current.ids[current.index] !== active.ids[active.index] ||
        !current.running
      )
        return;
      const next = { ...latest.current, active };
      latest.current = next;
      persist(next);
    },
    [persist],
  );
  return (
    <Context.Provider
      value={{
        data,
        catalog: combinedCatalog(drills, data),
        update,
        loading,
        error,
        retry: () => persist(latest.current),
        checkpointActive,
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
