import { useEffect, useLayoutEffect, useState } from "react";
import {
  AccessibilityInfo,
  AppState,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CalendarDays,
  CircleDot,
  Heart,
  UsersRound,
  UserRoundCheck,
} from "lucide-react-native";
import {
  createFeedbackLifecycle,
  type OnboardingFeedback,
} from "../domain/onboardingFeedback";

const icons = {
  club: UsersRound,
  lineup: UserRoundCheck,
  ball: CircleDot,
  routine: Heart,
  calendar: CalendarDays,
};
export function OnboardingFeedbackToast({
  message,
  bottom,
  reducedMotion,
  onHidden,
}: {
  message: OnboardingFeedback;
  bottom: number;
  reducedMotion: boolean;
  onHidden: () => void;
}) {
  const [visibility] = useState(() => new Animated.Value(0));
  const [lifetime] = useState(() => createFeedbackLifecycle());
  useLayoutEffect(() => {
    visibility.setValue(0);
    const animate = (toValue: number, duration: number) => (complete: () => void) => {
      if (reducedMotion) {
        visibility.setValue(toValue);
        complete();
        return () => {};
      }
      const motion = Animated.timing(visibility, {
        toValue,
        duration,
        easing: Easing.bezier(0.22, 0.61, 0.36, 1),
        useNativeDriver: Platform.OS !== "web",
      });
      motion.start(({ finished }) => {
        if (finished) complete();
      });
      return () => motion.stop();
    };
    lifetime.start(animate(1, 220), animate(0, 160), onHidden);
    const state = AppState.addEventListener("change", (value) => {
      if (value !== "active") {
        lifetime.cancel();
        visibility.setValue(0);
      }
    });
    return () => {
      state.remove();
      lifetime.cancel();
    };
  }, [message, reducedMotion, lifetime, visibility]);
  useEffect(() => {
    if (Platform.OS !== "web")
      AccessibilityInfo.announceForAccessibility(`${message.title}. ${message.body}`);
  }, [message]);
  const Icon = icons[message.icon];
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.position,
        {
          bottom,
          opacity: visibility,
          transform: [
            {
              translateY: reducedMotion
                ? 0
                : visibility.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
            },
          ],
        },
      ]}
    >
      <View
        accessible
        accessibilityLabel={`${message.title}. ${message.body}`}
        role={Platform.OS === "web" ? "status" : undefined}
        aria-live={Platform.OS === "web" ? "polite" : undefined}
        aria-atomic={Platform.OS === "web" ? true : undefined}
        style={styles.card}
      >
        <View style={styles.icon}>
          <Icon size={19} strokeWidth={2} color="#B6FF3B" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.title}>{message.title}</Text>
          <Text style={styles.body}>{message.body}</Text>
        </View>
      </View>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  position: { position: "absolute", left: 24, right: 24 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#46592B",
    backgroundColor: "#172016FA",
    shadowColor: "#B6FF3B",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  icon: {
    height: 34,
    width: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#26391D",
  },
  title: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 14,
    lineHeight: 19,
    color: "#F7FAF2",
  },
  body: {
    fontFamily: "Archivo_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: "#B6C0AD",
  },
});
