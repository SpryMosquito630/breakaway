import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPalette, ThemeMode } from "./palette";
import { createStyles } from "./styles";
const KEY = "breakaway-appearance-v1";
function useThemeState() {
  const system = useColorScheme();
  const [mode, setValue] = useState<ThemeMode>("system");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((value) => {
        if (
          mounted &&
          (value === "light" || value === "dark" || value === "system")
        )
          setValue(value);
      })
      .catch(() => {
        if (mounted) setError("Appearance could not be loaded.");
      });
    return () => {
      mounted = false;
    };
  }, []);
  const setMode = useCallback((next: ThemeMode) => {
    setValue(next);
    void AsyncStorage.setItem(KEY, next)
      .then(() => setError(null))
      .catch(() => setError("Appearance could not be saved."));
  }, []);
  const isDark = mode === "dark" || (mode === "system" && system === "dark");
  const C = useMemo(() => getPalette(isDark ? "dark" : "light"), [isDark]);
  const s = useMemo(() => createStyles(C), [C]);
  return { C, s, mode, setMode, isDark, error };
}
const Context = createContext<ReturnType<typeof useThemeState> | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useThemeState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTheme() {
  const theme = useContext(Context);
  if (!theme) throw Error("Missing ThemeProvider");
  return theme;
}
