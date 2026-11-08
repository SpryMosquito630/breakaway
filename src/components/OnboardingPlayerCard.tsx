import { useId } from "react";
import { StyleSheet, Text, View } from "react-native";
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
  { base: "#101110", shade: "#32312A", metal: "#A49358", light: "#E9DCA6" },
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
}: {
  name?: string;
  position: string;
  look?: string;
  ratings: ReturnType<typeof skillProfile>;
}) {
  return (
    <View style={styles.card}>
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
        <Text style={styles.ovrLabel}>TEST OVR</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.position}>
          {position}
        </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: "center", width: 252, height: 328, maxWidth: "100%" },
  brand: {
    position: "absolute",
    top: 29,
    alignSelf: "center",
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: 12,
    letterSpacing: 1,
    color: "#EEEADA",
  },
  rating: {
    position: "absolute",
    left: 25,
    top: 49,
    width: 62,
    alignItems: "flex-start",
  },
  overall: {
    fontFamily: "Archivo_700Bold",
    fontSize: 43,
    lineHeight: 47,
    letterSpacing: -1.5,
    color: "#FCFCF7",
  },
  ovrLabel: {
    fontFamily: "Archivo_500Medium",
    fontSize: 8,
    lineHeight: 11,
    color: "#E0DDCF",
  },
  position: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 18,
    lineHeight: 26,
    color: "#FCFCF7",
    maxWidth: 62,
  },
  portrait: { position: "absolute", top: 101, left: 103, width: 94, height: 107 },
  name: {
    position: "absolute",
    top: 222,
    left: 27,
    right: 27,
    textAlign: "center",
    fontFamily: "Archivo_700Bold",
    fontSize: 19,
    lineHeight: 25,
    color: "#FCFCF7",
  },
  stats: {
    position: "absolute",
    top: 263,
    left: 25,
    right: 25,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stat: { alignItems: "center", minWidth: 26 },
  statLabel: {
    fontFamily: "BarlowCondensed_600SemiBold",
    fontSize: 11,
    lineHeight: 14,
    color: "#D2D0C5",
  },
  statValue: {
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: 18,
    lineHeight: 22,
    color: "#FCFCF7",
  },
});
