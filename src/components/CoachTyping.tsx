import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";

/** Mount only while an actual AI request is waiting for its response. */
export function CoachTyping({ color }: { color: string }) {
  const dots = useRef([
    new Animated.Value(0.55),
    new Animated.Value(0.55),
    new Animated.Value(0.55),
  ]).current;
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    dots.forEach((dot) => dot.setValue(0.55));
    if (reduced) return;
    const animation = Animated.loop(
      Animated.stagger(
        120,
        dots.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 240,
              easing: Easing.bezier(0.2, 0, 0, 1),
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.35,
              duration: 240,
              easing: Easing.bezier(0.2, 0, 0, 1),
              useNativeDriver: true,
            }),
          ]),
        ),
      ),
    );
    animation.start();
    return () => animation.stop();
  }, [dots, reduced]);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Waiting for AI reply"
      style={styles.dots}
    >
      {dots.map((opacity, index) => (
        <Animated.View
          key={index}
          style={[styles.dot, { backgroundColor: color, opacity }]}
        />
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  dots: { flexDirection: "row", gap: 5, paddingVertical: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
