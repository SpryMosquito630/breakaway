import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { snapshotStyles } from "../domain/onboardingFlow";
import type { skillProfile } from "../domain/skillProfile";

// The card is an onboarding keepsake. Ratings come only from saved skill tests.
const finishes = [
  { base: "#071F1B", shade: "#123F32", metal: "#7DC9A4", light: "#D2FBE3" },
  { base: "#18210B", shade: "#3D5118", metal: "#B6E45C", light: "#ECFFA5" },
  { base: "#080909", shade: "#1D1D19", metal: "#B8A265", light: "#E3D69C" },
  { base: "#1C0B2D", shade: "#49265E", metal: "#BE93D0", light: "#F1D5FF" },
  { base: "#071A35", shade: "#173E70", metal: "#719AD5", light: "#C1DFFF" },
];
const outline =
  "M18 53 C52 50 89 16 121 14 C128 31 140 27 150 9 C160 27 172 31 179 14 C211 16 248 50 282 53 L282 288 L288 297 L288 327 C288 359 265 365 226 368 C193 370 170 378 150 385 C130 378 107 370 74 368 C35 365 12 359 12 327 L12 297 L18 288 Z";

export function PlayerCardFinish({ look }: { look?: string }) {
  const id = useId().replace(/:/g, "");
  const theme =
    finishes[snapshotStyles.indexOf(look ?? "") < 0 ? 2 : snapshotStyles.indexOf(look!)];
  const url = (part: string) => `url(#${id}${part})`;
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 300 390"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <ClipPath id={`${id}clip`}>
          <Path d={outline} />
        </ClipPath>
        <LinearGradient id={`${id}base`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={theme.base} />
          <Stop offset=".48" stopColor={theme.shade} />
          <Stop offset="1" stopColor="#030607" />
        </LinearGradient>
        <LinearGradient id={`${id}metal`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={theme.metal} />
          <Stop offset=".27" stopColor={theme.light} />
          <Stop offset=".43" stopColor={theme.metal} />
          <Stop offset=".7" stopColor="#655936" />
          <Stop offset="1" stopColor={theme.light} />
        </LinearGradient>
        <LinearGradient id={`${id}foil`} x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor={theme.metal} stopOpacity="0" />
          <Stop offset=".48" stopColor={theme.metal} stopOpacity=".12" />
          <Stop offset=".58" stopColor={theme.light} stopOpacity=".6" />
          <Stop offset=".65" stopColor={theme.metal} stopOpacity=".15" />
          <Stop offset="1" stopColor={theme.light} stopOpacity=".03" />
        </LinearGradient>
        <LinearGradient id={`${id}fade`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#050607" stopOpacity="0" />
          <Stop offset=".45" stopColor="#050607" stopOpacity=".85" />
          <Stop offset="1" stopColor="#050607" stopOpacity=".35" />
        </LinearGradient>
      </Defs>
      <Path d={outline} fill={url("base")} stroke={url("metal")} strokeWidth="2.5" />
      <G clipPath={url("clip")}>
        {/* Broad folded foil planes converge at the upper right, like the reference. */}
        <Path d="M-30 195 L292 48 L73 245 L292 335 L-10 247 Z" fill={url("foil")} />
        <Path d="M-30 175 L291 42 L54 201 L285 341 L24 226 Z" fill={url("foil")} />
        <Path d="M46 170 L282 51 L176 277 L112 237 Z" fill="#030506" opacity=".65" />
        <Path d="M54 174 L282 51 L92 203 L237 278 L66 207 Z" fill={url("foil")} />
        <Path
          d="M282 51 L242 269 L253 283 Z M282 51 L212 262 L224 273 Z M282 51 L181 246 L197 257 Z"
          fill={url("foil")}
        />
        <Path
          d="M20 183 L278 57 M44 199 L278 57 M66 208 L278 57 M67 214 L240 308"
          stroke={theme.light}
          strokeWidth=".8"
          opacity=".38"
        />
        {/* Fine etched facets stay within the collectible, never behind app controls. */}
        {Array.from({ length: 22 }, (_, i) => (
          <Path
            key={i}
            d={`M18 ${82 + i * 7} L282 ${35 + i * 2.4}`}
            stroke={theme.light}
            strokeWidth=".45"
            opacity={i % 3 === 0 ? 0.13 : 0.05}
          />
        ))}
        {/* The recorded black/gold finish has a narrow folded edge and curved
            engraving, rather than a broad luminous stripe across the portrait. */}
        <Path
          d="M20 170 L282 51 L73 187 L236 269 L45 185 Z"
          fill="#020403"
          opacity=".62"
        />
        <Path
          d="M20 170 L282 51 L52 178 L208 260 L36 181 Z"
          fill={url("metal")}
          opacity=".7"
        />
        <Path
          d="M33 173 L282 51 M50 182 L282 51 M57 192 L241 286"
          fill="none"
          stroke={theme.light}
          strokeWidth=".65"
          opacity=".76"
        />
        {Array.from({ length: 12 }, (_, i) => (
          <Path
            key={`curve${i}`}
            d={`M282 53 Q${182 + i * 7} ${130 + i * 4} ${177 + i * 8} 251`}
            fill="none"
            stroke={theme.light}
            strokeWidth={i % 4 === 0 ? ".8" : ".4"}
            opacity={i % 4 === 0 ? ".17" : ".08"}
          />
        ))}
        <Rect x="16" y="237" width="270" height="143" fill={url("fade")} />
        <Path
          d="M25 252 Q150 246 275 252"
          stroke={theme.light}
          strokeWidth=".8"
          opacity=".26"
        />
        <Path d="M25 254 Q150 248 275 254" stroke="#000" strokeWidth="3" opacity=".6" />
      </G>
      {/* Nested contours preserve the shallow crown and rounded, rippled foot. */}
      <Path
        d={outline}
        transform="translate(6 6) scale(.96 .97)"
        fill="none"
        stroke={url("metal")}
        strokeWidth="1.5"
      />
      <Path
        d={outline}
        transform="translate(12 12) scale(.92 .94)"
        fill="none"
        stroke={url("metal")}
        strokeWidth=".8"
        opacity=".8"
      />
      <Path
        d="M11 68 L11 286 L5 294 L5 329 C5 367 34 373 73 376 M289 68 L289 286 L295 294 L295 329 C295 367 266 373 227 376"
        fill="none"
        stroke={url("metal")}
        strokeWidth="1.8"
      />
    </Svg>
  );
}

export function OnboardingPlayerCard({
  name,
  position,
  look,
  ratings,
  active = true,
}: {
  name?: string;
  position: string;
  look?: string;
  ratings: ReturnType<typeof skillProfile>;
  /** False for an outgoing step or an unfocused onboarding screen. */
  active?: boolean;
}) {
  const { width } = useWindowDimensions();
  // Source frame: a ~230-point visible outline in a 444-point viewport.
  const scale = Math.min(width * 0.54, 252) / 252;
  const styles = useMemo(() => createStyles(scale), [scale]);
  const reveal = useRef(new Animated.Value(0)).current;
  const played = useRef(false);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [foreground, setForeground] = useState(AppState.currentState === "active");

  useEffect(() => {
    let mounted = true;
    // A preference event can arrive before the initial async read resolves.
    let preferenceChanged = false;
    const preference = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        preferenceChanged = true;
        setReduceMotion(enabled);
      },
    );
    AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (mounted && !preferenceChanged) setReduceMotion(enabled);
      },
      () => {
        if (mounted && !preferenceChanged) setReduceMotion(true);
      },
    );
    const appState = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => {
      mounted = false;
      preference.remove();
      appState.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;
    if (!active || !foreground || reduceMotion || played.current) {
      reveal.stopAnimation();
      reveal.setValue(1);
      return;
    }
    played.current = true;
    reveal.setValue(0);
    // Reference 247.25–248.65s: rise, show the reverse, then finish one Y turn.
    // No idle spin, delayed timer, or replay when the app returns to foreground.
    const animation = Animated.timing(reveal, {
      toValue: 1,
      duration: 1400,
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [active, foreground, reduceMotion, reveal]);

  const rotation = (reverse: boolean) =>
    reveal.interpolate({
      inputRange: [0, 0.36, 0.52, 1],
      outputRange: reverse
        ? ["180deg", "360deg", "360deg", "540deg"]
        : ["0deg", "180deg", "180deg", "360deg"],
    });
  const faceOpacity = (reverse: boolean) =>
    reveal.interpolate({
      inputRange: [0, 0.1799, 0.18, 0.7599, 0.76, 1],
      outputRange: reverse ? [0, 0, 1, 1, 0, 0] : [1, 1, 0, 0, 1, 1],
    });
  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity:
            reduceMotion === null && active
              ? 0
              : reveal.interpolate({
                  inputRange: [0, 0.1, 1],
                  outputRange: [0, 1, 1],
                }),
          transform: [
            {
              translateY: reveal.interpolate({
                inputRange: [0, 0.18, 0.36, 0.52, 1],
                outputRange: [160 * scale, 60 * scale, 8 * scale, 0, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.face,
          {
            opacity: faceOpacity(true),
            transform: [{ perspective: 900 }, { rotateY: rotation(true) }],
          },
        ]}
      >
        <PlayerCardFinish look={look} />
      </Animated.View>
      <Animated.View
        style={[
          styles.face,
          {
            opacity: faceOpacity(false),
            transform: [{ perspective: 900 }, { rotateY: rotation(false) }],
          },
        ]}
      >
        <PlayerCardFinish look={look} />
        <Text style={styles.brand}>BREAKAWAY</Text>
        <View style={styles.rating}>
          <Text
            accessibilityLabel={
              ratings.overall === null
                ? "Overall test rating not yet assessed"
                : `Overall test rating ${ratings.overall}`
            }
            style={styles.overall}
          >
            {ratings.overall ?? "—"}
          </Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.position}>
            {position}
          </Text>
          <Text style={styles.ovrLabel}>OVR</Text>
        </View>
        <View
          pointerEvents="none"
          style={styles.portrait}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Svg width="100%" height="100%" viewBox="0 0 110 124">
            <Circle cx="55" cy="34" r="21" fill="#D8D7CB" opacity=".62" />
            <Path
              d="M11 112 C11 86 30 69 55 69 C80 69 99 86 99 112 Q99 117 94 117 L16 117 Q11 117 11 112Z"
              fill="#D8D7CB"
              opacity=".62"
            />
          </Svg>
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.name}>
          {name?.trim() || "Your game"}
        </Text>
        <View style={styles.stats}>
          {ratings.skills.map((skill) => (
            <View
              key={skill.id}
              accessibilityLabel={`${skill.name}, ${skill.rating === null ? "not assessed" : `test rating ${skill.rating}`}`}
              style={styles.stat}
            >
              <Text style={styles.statLabel}>{skill.short}</Text>
              <Text style={styles.statValue}>{skill.rating ?? "—"}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = (scale: number) =>
  StyleSheet.create({
    card: {
      alignSelf: "center",
      width: 252 * scale,
      height: 328 * scale,
      maxWidth: "100%",
    },
    face: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backfaceVisibility: "hidden",
    },
    brand: {
      position: "absolute",
      top: 29 * scale,
      alignSelf: "center",
      fontFamily: "BarlowCondensed_700Bold",
      fontSize: Math.max(11, 12 * scale),
      letterSpacing: 1 * scale,
      color: "#EEEADA",
    },
    rating: {
      position: "absolute",
      left: 25 * scale,
      top: 49 * scale,
      width: 62 * scale,
      alignItems: "flex-start",
    },
    overall: {
      fontFamily: "Archivo_700Bold",
      fontSize: 43 * scale,
      lineHeight: 47 * scale,
      letterSpacing: -1.5 * scale,
      color: "#FCFCF7",
    },
    ovrLabel: {
      fontFamily: "Archivo_500Medium",
      fontSize: 11,
      lineHeight: 14,
      color: "#E0DDCF",
    },
    position: {
      fontFamily: "Archivo_600SemiBold",
      fontSize: 18 * scale,
      lineHeight: 26 * scale,
      color: "#FCFCF7",
      maxWidth: 62 * scale,
    },
    portrait: {
      position: "absolute",
      top: 85 * scale,
      left: 106 * scale,
      width: 86 * scale,
      height: 96 * scale,
    },
    name: {
      position: "absolute",
      top: 222 * scale,
      left: 27 * scale,
      right: 27 * scale,
      textAlign: "center",
      fontFamily: "Archivo_700Bold",
      fontSize: 19 * scale,
      lineHeight: 25 * scale,
      color: "#FCFCF7",
    },
    stats: {
      position: "absolute",
      top: 263 * scale,
      left: 25 * scale,
      right: 25 * scale,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    stat: { alignItems: "center", minWidth: 26 * scale },
    statLabel: {
      fontFamily: "BarlowCondensed_600SemiBold",
      fontSize: Math.max(11, 11 * scale),
      lineHeight: Math.max(14, 14 * scale),
      color: "#D2D0C5",
    },
    statValue: {
      fontFamily: "BarlowCondensed_700Bold",
      fontSize: 18 * scale,
      lineHeight: 22 * scale,
      color: "#FCFCF7",
    },
  });
