import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Polygon } from "react-native-svg";
import { useApp } from "../state/AppState";
import { useTheme } from "../theme/ThemeProvider";
import { assessmentProtocols, type AssessmentSkill } from "../domain/assessments";
import { radarPoint, skillProfile } from "../domain/skillProfile";
import { haptic } from "../utils/haptics";

/** Saved, versioned tests only. Missing tests never contribute a radar value. */
export function ProgressSkillProfile({
  onAssess,
}: {
  onAssess: (skill: AssessmentSkill) => void;
}) {
  const { data } = useApp();
  const { C, s } = useTheme();
  const { fontScale } = useWindowDimensions();
  const profile = skillProfile(false, data.assessments);
  const points = (value: number) =>
    profile.skills
      .map((_, i) => {
        const p = radarPoint(i, value, 76);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  // Larger text gets the same six targets in normal flow, without clipped axes.
  const stacked = fontScale > 1.3;
  const skillButtons = profile.skills.map((skill, i) => {
    const raw = skill.latest
      ? `${assessmentProtocols[skill.id].count}: ${skill.latest.value}`
      : null;
    return (
      <Pressable
        key={skill.id}
        accessibilityRole="button"
        accessibilityLabel={`${skill.name}, ${skill.rating === null ? "not tested" : `test score ${skill.rating} out of 100. Latest result ${raw}`}. ${skill.latest ? "Retake" : "Take"} test.`}
        onPress={() => {
          haptic("selection");
          onAssess(skill.id);
        }}
        style={({ pressed }) => [
          styles.skill,
          stacked ? styles.stackedSkill : [styles.axis, axisPositions[i]],
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={[s.h3, { color: C.onDeep, textAlign: "center" }]}>
          {skill.short}
        </Text>
        <Text
          style={[styles.score, { color: skill.rating === null ? C.onDeep : C.lime }]}
        >
          {skill.rating ?? "—"}
        </Text>
      </Pressable>
    );
  });
  return (
    <View style={[styles.surface, { backgroundColor: C.deep }]}>
      <View style={s.row}>
        <Text accessibilityRole="header" style={[s.h2, { color: C.onDeep, flex: 1 }]}>
          Skill profile
        </Text>
        <View
          accessible
          accessibilityLabel={
            profile.overall === null
              ? "Overall unrated. All six tests needed."
              : `Overall test score ${profile.overall} out of 100`
          }
          style={styles.overall}
        >
          <Text style={[s.small, { color: C.onDeep }]}>OVR</Text>
          <Text style={[styles.score, { color: C.lime }]}>{profile.overall ?? "—"}</Text>
        </View>
      </View>
      <View style={styles.radar}>
        <Svg width="100%" height="100%" viewBox="0 0 300 300" accessible={false}>
          {[25, 50, 75, 100].map((level) => (
            <Polygon
              key={level}
              points={points(level)}
              fill="none"
              stroke={C.onDeep}
              strokeOpacity={0.22}
              strokeWidth={1}
            />
          ))}
          {profile.skills.map((skill, i) => {
            const end = radarPoint(i, 100, 76);
            return (
              <Line
                key={skill.id}
                x1={150}
                y1={150}
                x2={end.x}
                y2={end.y}
                stroke={C.onDeep}
                strokeOpacity={0.22}
              />
            );
          })}
          {profile.coverage === 6 ? (
            <Polygon
              points={profile.skills
                .map((skill, i) => {
                  const p = radarPoint(i, skill.rating!, 76);
                  return `${p.x},${p.y}`;
                })
                .join(" ")}
              fill={C.lime}
              fillOpacity={0.18}
              stroke={C.lime}
              strokeWidth={2}
            />
          ) : null}
          {profile.skills.map((skill, i) => {
            if (skill.rating === null) return null;
            const p = radarPoint(i, skill.rating, 76);
            return <Circle key={skill.id} cx={p.x} cy={p.y} r={4} fill={C.lime} />;
          })}
        </Svg>
        {!stacked ? skillButtons : null}
      </View>
      {stacked ? <View style={styles.stacked}>{skillButtons}</View> : null}
      <Text style={[s.small, styles.hint, { color: C.onDeep }]}>
        {profile.coverage}/6 tested · Tap a stat
      </Text>
    </View>
  );
}

const axisPositions = [
  { top: 0, left: "34%", width: "32%" },
  { top: "21%", right: 0 },
  { bottom: "21%", right: 0 },
  { bottom: 0, left: "34%", width: "32%" },
  { bottom: "21%", left: 0 },
  { top: "21%", left: 0 },
] as const;
const styles = StyleSheet.create({
  surface: {
    borderRadius: 24,
    padding: 16,
    gap: 16,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  overall: { flexDirection: "row", alignItems: "center", gap: 8 },
  radar: { width: "100%", aspectRatio: 1, position: "relative", marginVertical: 16 },
  skill: {
    minHeight: 56,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  axis: { position: "absolute", width: "31%" },
  score: { fontFamily: "IBMPlexMono_500Medium", fontSize: 26, lineHeight: 34 },
  stacked: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  stackedSkill: { flexGrow: 1, flexBasis: "40%" },
  hint: { textAlign: "center" },
});
