import { useLayoutEffect, useMemo } from "react";
import { Animated, AppState, Easing, Platform } from "react-native";
import type { FlowStep } from "../domain/onboardingFlow";

// Observed ordering, with tuned durations rather than recovered source constants.
const entrances: Partial<Record<FlowStep, readonly number[]>> = {
  planComparison: [0, 120, 120, 280],
  comparison: [0, 120, 120, 280],
  assessment: [0, 350, 650, 950, 1250, 1550, 1850, 2150, 2750],
  strengths: [0, 350, 850, 1350],
  growth: [0, 350, 850, 1350, 1850],
  fuel: [0, 250, 450, 650, 850, 1050],
};

/** Each scene owns its values; outgoing scenes keep their frozen entrance frame. */
export function useOnboardingEntrance(
  step: FlowStep,
  focused: boolean,
  reducedMotion: boolean,
) {
  const delays = entrances[step];
  const values = useMemo(
    () =>
      Array.from(
        { length: 10 },
        () => new Animated.Value(delays && !reducedMotion ? 0 : 1),
      ),
    [step],
  );
  useLayoutEffect(() => {
    const settle = () =>
      values.forEach((value) => {
        value.stopAnimation();
        value.setValue(1);
      });
    if (!delays || reducedMotion || !focused || AppState.currentState !== "active") {
      settle();
      return;
    }
    const bars = step === "planComparison" || step === "comparison";
    const animation = Animated.parallel(
      values.map((value, index) =>
        Animated.timing(value, {
          toValue: 1,
          delay: delays[index] ?? delays.at(-1) ?? 0,
          duration: bars && (index === 1 || index === 2) ? 750 : 450,
          easing: Easing.bezier(0.22, 0.61, 0.36, 1),
          useNativeDriver: Platform.OS !== "web",
        }),
      ),
    );
    animation.start();
    const state = AppState.addEventListener("change", (next) => {
      if (next !== "active") {
        animation.stop();
        settle();
      }
    });
    return () => {
      state.remove();
      animation.stop();
    };
  }, [step, values, delays, focused, reducedMotion]);
  return values;
}

export function entranceStyle(value: Animated.Value, distance = 14) {
  return {
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }),
      },
    ],
  };
}

export function growingBarStyle(value: Animated.Value) {
  return {
    opacity: value.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
      { scaleY: value.interpolate({ inputRange: [0, 1], outputRange: [0.04, 1] }) },
    ],
  };
}

/** Labels travel with the rising top edge without inheriting the fill's scale. */
export function barLabelStyle(value: Animated.Value, height: number) {
  return {
    opacity: value.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [height / 2 + 10, 0],
        }),
      },
    ],
  };
}
