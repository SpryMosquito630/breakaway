import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { haptic } from "../utils/haptics";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { TimerSignal } from "../domain/model";
export function useKeepTimerAwake(running: boolean, tag: string) {
  useEffect(() => {
    if (!running) return;
    let disposed = false;
    void activateKeepAwakeAsync(tag)
      .then(() => {
        if (disposed) void deactivateKeepAwake(tag).catch(() => {});
      })
      .catch(() => {});
    return () => {
      disposed = true;
      void deactivateKeepAwake(tag).catch(() => {});
    };
  }, [running, tag]);
}
export function useTimerFeedback() {
  const warning = useAudioPlayer(require("../../assets/audio/warning.wav"));
  const finish = useAudioPlayer(require("../../assets/audio/finish.wav"));
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    void setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      allowsRecording: false,
    }).catch(() => {});
    return () => {
      mounted.current = false;
    };
  }, [warning, finish]);
  return useCallback(
    (signal: TimerSignal | "start" | "countdown") => {
      if (!mounted.current || AppState.currentState !== "active") return;
      haptic(
        signal === "countdown"
          ? "light"
          : signal === "finish" || signal === "start"
            ? "success"
            : "warning",
      );
      const player = signal === "finish" ? finish : warning;
      void player
        .seekTo(0)
        .then(() => {
          if (mounted.current && AppState.currentState === "active")
            player.play();
        })
        .catch(() => {});
    },
    [finish, warning],
  );
}
