import { useLayoutEffect, useMemo } from "react";
import {
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  View,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

type OnboardingHeadingProps = Pick<
  TextProps,
  | "style"
  | "testID"
  | "onLayout"
  | "allowFontScaling"
  | "maxFontSizeMultiplier"
  | "accessibilityLabel"
> & {
  text: string;
  focused: boolean;
  reducedMotion: boolean;
  animationKey?: string | number;
};

// Layout belongs to the paragraph; typography belongs to each native word view.
const typographyKeys = new Set([
  "color",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "fontVariant",
  "fontFeatureSettings",
  "fontVariationSettings",
  "includeFontPadding",
  "letterSpacing",
  "lineHeight",
  "textAlign",
  "textAlignVertical",
  "textDecorationColor",
  "textDecorationLine",
  "textDecorationStyle",
  "textShadowColor",
  "textShadowOffset",
  "textShadowRadius",
  "textTransform",
  "writingDirection",
  "userSelect",
  "verticalAlign",
]);

/**
 * Skillers' 00:01.6–00:02.3 title reveals words in place while its page slides.
 * Each word owns a real native Text view: inline virtual Text cannot receive
 * native-driver view opacity updates on iOS. Flex wrapping keeps layout static
 * throughout the reveal, including when font scaling makes a word wrap itself.
 * The overlapping fades are tuned, not recovered source animation constants.
 */
export function OnboardingHeading({
  text,
  focused,
  reducedMotion,
  animationKey,
  accessibilityLabel,
  style,
  testID,
  onLayout,
  allowFontScaling,
  maxFontSizeMultiplier,
}: OnboardingHeadingProps) {
  // Keep spaces with their preceding word, and explicit newlines as separate rows.
  const lines = useMemo(
    () => text.split("\n").map((line) => line.match(/\S+[^\S\n]*|[^\S\n]+/g) ?? [""]),
    [text],
  );
  const wordCount = lines.reduce((count, line) => count + line.length, 0);
  const flattened = StyleSheet.flatten(style) ?? {};
  const typography: TextStyle = {};
  const layout: ViewStyle = {};
  for (const [key, value] of Object.entries(flattened)) {
    Object.assign(typographyKeys.has(key) ? typography : layout, { [key]: value });
  }
  const values = useMemo(
    () =>
      Array.from(
        { length: wordCount },
        () => new Animated.Value(reducedMotion || !focused ? 1 : 0),
      ),
    // A new scene needs independent values when navigating back mid-animation.
    [text, animationKey, wordCount],
  );

  useLayoutEffect(() => {
    const settle = () => {
      values.forEach((value) => {
        value.stopAnimation();
        value.setValue(1);
      });
    };
    const backgrounded =
      AppState.currentState === "background" || AppState.currentState === "inactive";
    if (reducedMotion || !focused || backgrounded) {
      settle();
      return;
    }
    values.forEach((value) => {
      value.stopAnimation();
      value.setValue(0);
    });
    // Longer headings reveal within the same short window instead of adding wait.
    const stagger = Math.min(120, 360 / Math.max(values.length - 1, 1));
    const animation = Animated.parallel(
      values.map((value, index) =>
        Animated.timing(value, {
          toValue: 1,
          delay: index * stagger,
          duration: 220,
          easing: Easing.bezier(0.22, 0.61, 0.36, 1),
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
      ),
    );
    animation.start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "inactive" || state === "background") {
        animation.stop();
        settle();
      }
    });
    return () => {
      subscription.remove();
      animation.stop();
    };
  }, [values, focused, reducedMotion]);

  let wordIndex = 0;
  return (
    <View
      style={layout}
      testID={testID}
      onLayout={onLayout}
      accessible
      accessibilityRole="header"
      accessibilityLabel={accessibilityLabel ?? text}
    >
      {lines.map((line, lineIndex) => (
        <View
          key={lineIndex}
          style={[
            styles.line,
            {
              justifyContent:
                typography.textAlign === "center"
                  ? "center"
                  : typography.textAlign === "right"
                    ? "flex-end"
                    : "flex-start",
            },
          ]}
        >
          {line.map((word, index) => (
            <Animated.Text
              key={index}
              accessible={false}
              {...(Platform.OS === "web"
                ? { "aria-hidden": true }
                : {
                    accessibilityElementsHidden: true,
                    importantForAccessibility: "no-hide-descendants" as const,
                  })}
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              style={[typography, styles.word, { opacity: values[wordIndex++] }]}
            >
              {word || "\u200b"}
            </Animated.Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" },
  word: { maxWidth: "100%", flexShrink: 1 },
});
