import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { drills } from "../data/drills";
import { drillMovements } from "../data/drill-movements";
import { createMovementGuide, type GuideFrame } from "../domain/movement-guide";
import { DrillMovement } from "./DrillMovement";
import { useTheme } from "../theme/ThemeProvider";

const DURATION = 6500;

function MovingMarker({
  frames,
  progress,
  width,
  foot = false,
}: {
  frames: GuideFrame[];
  progress: Animated.Value;
  width: number;
  foot?: boolean;
}) {
  const { C } = useTheme();
  // SVG uses xMidYMid meet in a 320×180 viewbox at height 170.
  const scale = Math.min(width / 320, 170 / 180);
  const offsetX = (width - 320 * scale) / 2;
  const offsetY = (170 - 180 * scale) / 2;
  const size = foot ? 20 : 16;
  const inputRange = frames.map((p) => p.time);
  const interpolate = (outputRange: number[]) =>
    progress.interpolate({ inputRange, outputRange, extrapolate: "clamp" });
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      {...(Platform.OS === "web"
        ? { "aria-hidden": true }
        : {
            accessibilityElementsHidden: true,
            importantForAccessibility: "no-hide-descendants" as const,
          })}
      style={[
        styles.marker,
        {
          width: size,
          height: foot ? 12 : size,
          borderRadius: foot ? 4 : 10,
          backgroundColor: foot ? C.green : C.white,
          borderColor: foot ? C.ink : C.green,
          opacity: interpolate(frames.map((p) => p.opacity)),
          transform: [
            {
              translateX: interpolate(
                frames.map((p) => offsetX + p.x * scale - size / 2),
              ),
            },
            {
              translateY: interpolate(
                frames.map((p) => offsetY + p.y * scale - (foot ? 6 : size / 2)),
              ),
            },
          ],
        },
      ]}
    />
  );
}

/** An opt-in schematic. It illustrates authored paths, not human technique. */
export function AnimatedDrillGuide({
  drillId,
  active = true,
  compact = false,
  autoPlay = false,
}: {
  drillId: string;
  active?: boolean;
  compact?: boolean;
  /** Set only after the user explicitly chooses the movement guide. */
  autoPlay?: boolean;
}) {
  const { C, s } = useTheme();
  const drill = drills.find((item) => item.id === drillId);
  const movement = drillMovements[drillId];
  const tracks = useMemo(
    () => (movement ? createMovementGuide(movement, drillId) : null),
    [movement, drillId],
  );
  const progress = useRef(new Animated.Value(0)).current;
  const position = useRef(0);
  const running = useRef(false);
  const autoStarted = useRef(false);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const [playing, setPlaying] = useState(false);
  const [complete, setComplete] = useState(false);
  // Keep the static guide while the system preference is being read.
  const [reduceMotion, setReduceMotion] = useState(true);
  const [foreground, setForeground] = useState(
    AppState.currentState !== "background" && AppState.currentState !== "inactive",
  );
  const [width, setWidth] = useState(0);
  const pause = useCallback(() => {
    running.current = false;
    animation.current?.stop();
    progress.stopAnimation((value) => {
      position.current = value;
    });
    setPlaying(false);
  }, [progress]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduceMotion(value);
      })
      .catch(() => {});
    const preference = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    const appState = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    // React Native Web supports change only; blur is Android-specific.
    const appBlur =
      Platform.OS === "android" ? AppState.addEventListener("blur", pause) : undefined;
    return () => {
      mounted = false;
      preference.remove();
      appState.remove();
      appBlur?.remove();
      running.current = false;
      animation.current?.stop();
      progress.stopAnimation();
    };
  }, [progress, pause]);

  useEffect(() => {
    pause();
    progress.setValue(0);
    position.current = 0;
    setComplete(false);
    autoStarted.current = false;
  }, [drillId, pause, progress]);

  useEffect(() => {
    if (!active || !foreground || reduceMotion) pause();
  }, [active, foreground, reduceMotion, pause]);

  const play = () => {
    if (running.current) {
      pause();
      return;
    }
    if (!active || !foreground || reduceMotion || !width) return;
    if (position.current >= 0.999) {
      progress.setValue(0);
      position.current = 0;
    }
    running.current = true;
    setPlaying(true);
    setComplete(false);
    animation.current = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION * (1 - position.current),
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    });
    animation.current.start(({ finished }) => {
      if (!finished || !running.current) return;
      position.current = 1;
      running.current = false;
      setPlaying(false);
      setComplete(true);
    });
  };
  useEffect(() => {
    if (
      autoPlay &&
      !autoStarted.current &&
      width > 0 &&
      !reduceMotion &&
      active &&
      foreground
    ) {
      autoStarted.current = true;
      play();
    }
  }, [autoPlay, width, reduceMotion, active, foreground]);

  if (!drill || !movement || !tracks) return null;
  return (
    <View style={{ gap: 10 }}>
      <Text style={[s.small, { color: C.ink, fontWeight: "700" }]}>
        Animated movement guide
      </Text>
      <DrillMovement
        drill={drill}
        compact={compact}
        hideLegend
        hideBall={!reduceMotion && width > 0}
        onDiagramLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        overlay={
          !reduceMotion && width > 0 ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <MovingMarker frames={tracks.ball} progress={progress} width={width} />
              {tracks.foot ? (
                <MovingMarker
                  frames={tracks.foot}
                  progress={progress}
                  width={width}
                  foot
                />
              ) : null}
            </View>
          ) : null
        }
      />
      {reduceMotion ? (
        <Text style={s.small}>
          Reduced motion is on. Follow the arrows and written steps.
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            playing
              ? "Pause movement guide"
              : complete
                ? "Replay movement guide"
                : "Play movement guide"
          }
          disabled={!active || !foreground || !width}
          onPress={play}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 10,
            backgroundColor: C.pitchSoft,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={[s.body, { color: C.green, fontWeight: "700" }]}>
            {playing
              ? "Pause guide"
              : complete
                ? "Replay guide"
                : position.current > 0
                  ? "Resume guide"
                  : "Play movement guide"}
          </Text>
        </Pressable>
      )}
      <Text style={s.small}>
        {tracks.foot
          ? "Top view · Circle: ball · Bar: foot · Not to scale · Arrows reset"
          : "Top view · Circle: ball · Not to scale · Arrows reset"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  marker: { position: "absolute", left: 0, top: 0, borderWidth: 2 },
});
