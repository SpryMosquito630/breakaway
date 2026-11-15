import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Button, Link } from "./ui";
import { personalRating } from "../domain/rating";
import type { Benchmark } from "../domain/model";
import { useTheme } from "../theme/ThemeProvider";

export function PersonalRating({
  results,
  onTest,
}: {
  results: Benchmark[];
  onTest: () => void;
}) {
  const { C, s } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const rating = personalRating(results);
  const points = rating.history.filter((p) => p.index !== null).slice(-8);
  const values = points.map((p) => p.index!);
  const low = Math.min(100, ...values) - 10;
  const high = Math.max(100, ...values) + 10;
  const y = (value: number) => 62 - ((value - low) / (high - low)) * 48;
  const x = (i: number) =>
    points.length === 1 ? 150 : 10 + (i / (points.length - 1)) * 280;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.index!)}`).join(" ");
  const growth =
    rating.delta === null
      ? "No baseline yet"
      : rating.ratedCount === 1
        ? "Baseline set"
        : rating.delta === 0
          ? "Level with baseline"
          : `${rating.delta > 0 ? "+" : "−"}${Math.abs(rating.delta)} from baseline`;
  return (
    <View style={styles.section}>
      <View style={[styles.card, { backgroundColor: C.white }]}>
        <View style={s.row}>
          <Text accessibilityRole="header" style={[s.h2, { color: C.ink }]}>
            Touch-test growth
          </Text>
          <Text style={[s.small, { color: C.ink }]}>Baseline 100</Text>
        </View>
        <View style={styles.scoreRow}>
          <Text
            accessibilityLabel={
              rating.index === null
                ? "Touch-test index unset"
                : `Touch-test growth ${rating.index}`
            }
            style={[styles.score, { color: C.green }]}
          >
            {rating.index ?? "—"}
          </Text>
          <View style={styles.scoreCopy}>
            <Text style={[s.h3, { color: C.ink }]}>{growth}</Text>
            <Text style={[s.small, { color: C.ink }]}>
              {rating.ratedCount
                ? `${rating.ratedCount} touch ${rating.ratedCount === 1 ? "test" : "tests"}`
                : "Start with a touch test"}
            </Text>
          </View>
        </View>
        <Text style={[s.small, { color: C.ink }]}>
          Your touch-test growth. First positive result = 100.
        </Text>
        {points.length > 1 ? (
          <View
            accessible
            accessibilityLabel={`Recent touch-test growth trend: ${values.join(", ")}. Baseline 100.`}
          >
            <Svg width="100%" height={76} viewBox="0 0 300 76" accessible={false}>
              <Line
                x1={10}
                y1={y(100)}
                x2={290}
                y2={y(100)}
                stroke={C.muted}
                strokeOpacity={0.4}
                strokeDasharray="3 5"
              />
              <Path d={path} stroke={C.green} strokeWidth={2.5} fill="none" />
              {points.map((p, i) => (
                <Circle
                  key={p.id + i}
                  cx={x(i)}
                  cy={y(p.index!)}
                  r={3.5}
                  fill={C.green}
                />
              ))}
            </Svg>
            <View style={s.row}>
              <Text style={[s.small, { color: C.ink }]}>Earlier</Text>
              <Text style={[s.small, { color: C.ink }]}>Latest</Text>
            </View>
          </View>
        ) : null}
        {rating.index === null ? (
          <Button label="Set your baseline" kind="lime" onPress={onTest} />
        ) : (
          <Button label="Retest touch control" kind="lime" onPress={onTest} />
        )}
      </View>
      <View style={styles.skills}>
        <Link
          label={expanded ? "Hide rating details" : "How it works & history"}
          onPress={() => setExpanded(!expanded)}
        />
        {expanded ? (
          <View style={styles.details}>
            <Text style={s.body}>
              Index = latest touches ÷ first positive result × 100. It can fall below or
              rise above 100. Use the same technique and space each time. Sessions do not
              change it.
            </Text>
            {rating.baseline ? (
              <Text style={s.small}>
                Baseline: {rating.baseline.count} touches ·{" "}
                {new Date(rating.baseline.date).toLocaleDateString()}
              </Text>
            ) : (
              <Text style={s.small}>
                Zero-touch results are kept. A positive result is needed to set the
                baseline.
              </Text>
            )}
            {rating.history
              .slice(-5)
              .reverse()
              .map((point, i) => (
                <View key={point.id + i} style={s.row}>
                  <Text style={s.small}>
                    {new Date(point.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {point.count} touches
                  </Text>
                  <Text style={s.h3}>
                    {point.index === null ? "Unrated" : `${point.index} index`}
                  </Text>
                </View>
              ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 16 },
  card: { padding: 20, borderRadius: 16, borderCurve: "continuous", gap: 14 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 20, flexWrap: "wrap" },
  score: { fontFamily: "IBMPlexMono_500Medium", fontSize: 40, lineHeight: 52 },
  scoreCopy: { gap: 4, flexShrink: 1 },
  skills: { gap: 12 },
  details: { gap: 12 },
});
