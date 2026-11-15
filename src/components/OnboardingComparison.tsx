import { useLayoutEffect, useMemo } from "react";
import {
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { OnboardingHeading } from "./OnboardingHeading";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const lime = "#B6FF3B";
const muted = "#ADB7A8";

/** One-shot editorial motion. Leaving/backgrounding always settles the complete illustration. */
export function OnboardingComparison({
  kind,
  focused,
  reducedMotion,
}: {
  kind: "bars" | "journey";
  focused: boolean;
  reducedMotion: boolean;
}) {
  const [reveal, labels] = useMemo(
    () => [
      new Animated.Value(reducedMotion ? 1 : 0),
      new Animated.Value(reducedMotion ? 1 : 0),
    ],
    [kind],
  );
  useLayoutEffect(() => {
    const settle = () => {
      reveal.stopAnimation();
      labels.stopAnimation();
      reveal.setValue(1);
      labels.setValue(1);
    };
    if (reducedMotion || !focused || AppState.currentState !== "active") {
      settle();
      return;
    }
    reveal.setValue(0);
    labels.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(reveal, {
        toValue: 1,
        delay: 200,
        duration: kind === "bars" ? 1400 : 1200,
        easing: Easing.bezier(0.22, 0.61, 0.36, 1),
        // SVG dash offsets require the JS driver; bar transforms use the native driver.
        useNativeDriver: kind === "bars" && Platform.OS !== "web",
        isInteraction: false,
      }),
      Animated.timing(labels, {
        toValue: 1,
        delay: kind === "bars" ? 300 : 1300,
        duration: 300,
        easing: Easing.bezier(0.22, 0.61, 0.36, 1),
        useNativeDriver: kind === "bars" && Platform.OS !== "web",
        isInteraction: false,
      }),
    ]);
    animation.start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        animation.stop();
        settle();
      }
    });
    return () => {
      subscription.remove();
      animation.stop();
    };
  }, [kind, focused, reducedMotion, reveal, labels]);

  return (
    <View style={styles.page}>
      <OnboardingHeading
        text={
          kind === "bars" ? "Make every session count." : "Build a week you can repeat."
        }
        focused={focused}
        reducedMotion={reducedMotion}
        animationKey={kind}
        style={styles.heading}
      />
      <Text style={styles.helper}>
        {kind === "bars"
          ? "Less guesswork. A clear focus."
          : "Your focus. Your days. A clear next step."}
      </Text>
      {kind === "bars" ? (
        <View
          accessibilityLabel="Illustration: random drills without a plan; a clear focus, suitable drills and chosen days with your Breakaway plan."
          style={styles.bars}
        >
          {[
            {
              label: "Without a plan",
              detail: "Random drills",
              height: 112,
              active: false,
            },
            {
              label: "Your Breakaway plan",
              detail: "Focus · Drills · Routine",
              height: 230,
              active: true,
            },
          ].map((bar) => (
            <View key={bar.label} style={styles.column}>
              <View style={styles.stage}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      height: bar.height,
                      backgroundColor: bar.active ? lime : "#29342B",
                      transformOrigin: "center bottom",
                      transform: [{ scaleY: reveal }],
                      opacity: reveal,
                    },
                  ]}
                >
                  {bar.active ? (
                    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                      <Defs>
                        <LinearGradient id="plan-bar" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor="#CBFF83" />
                          <Stop offset="1" stopColor="#71BA24" />
                        </LinearGradient>
                      </Defs>
                      <Path d="M0 0 H400 V400 H0 Z" fill="url(#plan-bar)" />
                    </Svg>
                  ) : null}
                </Animated.View>
              </View>
              <Animated.View style={{ opacity: labels, gap: 7 }}>
                <Text style={[styles.label, bar.active && { color: lime }]}>
                  {bar.label}
                </Text>
                <Text style={styles.detail}>{bar.detail}</Text>
              </Animated.View>
            </View>
          ))}
        </View>
      ) : (
        <View
          accessibilityLabel="Illustrative training journey: a scattered routine without Breakaway and a planned routine with Breakaway. This is not a forecast."
          style={styles.chart}
        >
          <Text style={styles.chartTitle}>YOUR TRAINING JOURNEY</Text>
          <Svg width="100%" height={240} viewBox="0 0 320 240" accessible={false}>
            {[60, 110, 160, 210].map((y) => (
              <Path key={y} d={`M12 ${y} H308`} stroke="#FFFFFF09" />
            ))}
            <AnimatedPath
              d="M16 204 C55 201 69 175 105 184 S164 155 198 165 S255 135 304 142"
              stroke="#667260"
              strokeWidth={2}
              fill="none"
              strokeDasharray="5 6"
              opacity={reveal}
            />
            <AnimatedPath
              d="M16 204 C52 204 59 180 103 180 C143 180 151 121 196 121 C247 121 262 40 304 30"
              stroke={lime}
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
              strokeDasharray="420 420"
              strokeDashoffset={reveal.interpolate({
                inputRange: [0, 1],
                outputRange: [420, 0],
              })}
            />
            {[
              [103, 180],
              [196, 121],
              [304, 30],
            ].map(([cx, cy]) => (
              <AnimatedCircle
                key={cx}
                cx={cx}
                cy={cy}
                r={5}
                stroke={lime}
                strokeWidth={2}
                fill="#131714"
                opacity={labels}
              />
            ))}
          </Svg>
          <Animated.View style={[styles.legend, { opacity: labels }]}>
            <Text style={[styles.legendText, { color: lime }]}>● With Breakaway</Text>
            <Text style={styles.legendText}>┄ Without Breakaway</Text>
          </Animated.View>
          <View style={styles.axis}>
            <Text style={styles.detail}>Getting started</Text>
            <Text style={styles.detail}>Building a routine</Text>
          </View>
        </View>
      )}
      <Text style={styles.caption}>
        {kind === "bars"
          ? "Illustrative comparison · A clearer routine."
          : "Illustrative journey · Progress is personal."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 18, gap: 16, flex: 1, justifyContent: "center", paddingBottom: 24 },
  heading: {
    fontFamily: "Archivo_700Bold",
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: "#F7FAF2",
    textAlign: "center",
  },
  helper: {
    fontFamily: "Archivo_400Regular",
    color: muted,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
  bars: { flexDirection: "row", gap: 20, marginTop: 20 },
  column: { flex: 1, gap: 16 },
  stage: { height: 250, justifyContent: "flex-end" },
  bar: {
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FFFFFF15",
  },
  label: {
    fontFamily: "Archivo_600SemiBold",
    color: "#F7FAF2",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 21,
  },
  detail: {
    fontFamily: "Archivo_400Regular",
    color: muted,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
  chart: {
    marginTop: 18,
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#131714",
    borderWidth: 1,
    borderColor: "#35432F",
    gap: 14,
  },
  chartTitle: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 10,
    letterSpacing: 2,
    color: muted,
    textAlign: "center",
  },
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14 },
  legendText: {
    fontFamily: "Archivo_600SemiBold",
    color: muted,
    fontSize: 11,
    lineHeight: 18,
  },
  axis: { flexDirection: "row", justifyContent: "space-between" },
  caption: {
    fontFamily: "Archivo_400Regular",
    color: muted,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
});
