import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polygon } from "react-native-svg";
import { Button } from "./ui";
import { useApp } from "../state/AppState";
import { assessmentProtocols, type AssessmentSkill } from "../domain/assessments";
import { ChevronRight, Shield } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { haptic } from "../utils/haptics";
import { radarPoint, skillProfile, type ProfileSkill } from "../domain/skillProfile";

export function SkillProfile({ onAssess }: { onAssess: (skill: AssessmentSkill) => void }) {
  const { data } = useApp();
  const { C, s } = useTheme();
  const [sample, setSample] = useState(false);
  const [view, setView] = useState<"Radar" | "Ratings">("Radar");
  const [selected, setSelected] = useState<ProfileSkill["id"] | null>(null);
  const profile = skillProfile(sample, data.assessments);
  const detail = profile.skills.find((skill) => skill.id === selected);
  const selectSkill = (id: ProfileSkill["id"]) => { haptic("selection"); setSelected(selected === id ? null : id); };
  const polygon = (value: number) => profile.skills.map((_, i) => { const p = radarPoint(i, value); return `${p.x},${p.y}`; }).join(" ");
  return <View style={[styles.card, { backgroundColor: C.deep }]}>
    <View style={s.row}>
      <View style={styles.title}>
        <View style={styles.titleRow}><Shield size={17} color={C.lime} /><Text accessibilityRole="header" style={[s.h2, { color: C.onDeep }]}>Skill profile</Text></View>
        <Text style={[s.small, { color: C.onDeep }]}>{sample ? "SAMPLE PROFILE · illustrative" : `${profile.coverage} of 6 tests recorded`}</Text>
      </View>
      <View accessible accessibilityLabel={sample ? `Sample OVR ${profile.overall}, illustrative` : profile.overall === null ? "OVR unrated, all six assessments needed" : `OVR test score ${profile.overall}`} style={styles.overall}>
        <Text style={[s.small, { color: C.onDeep }]}>OVR</Text><Text style={[styles.overallNumber, { color: C.lime }]}>{profile.overall ?? "—"}</Text>
      </View>
    </View>
    <View accessibilityRole="tablist" style={[styles.segments, { borderColor: C.onDeep }]}>
      {(["Radar", "Ratings"] as const).map((label) => <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: label === view }} onPress={() => { if (label !== view) { haptic("selection"); setView(label); } }} style={({ pressed }) => [styles.segment, { backgroundColor: label === view ? C.lime : "transparent", opacity: pressed ? 0.75 : 1 }]}><Text style={[s.h3, { color: label === view ? C.onLime : C.onDeep }]}>{label}</Text></Pressable>)}
    </View>
    {view === "Radar" ? <View style={styles.radar}>
      <Svg width="100%" height="100%" viewBox="0 0 300 300" accessible={false}>
        {[25, 50, 75, 100].map((level) => <Polygon key={level} points={polygon(level)} fill="none" stroke={C.onDeep} strokeOpacity={0.18} strokeWidth={1} />)}
        {profile.skills.map((skill, i) => { const end = radarPoint(i, 100); return <Line key={skill.id} x1={150} y1={150} x2={end.x} y2={end.y} stroke={C.onDeep} strokeOpacity={0.18} />; })}
        {profile.coverage === 6 ? <><Polygon points={profile.skills.map((skill, i) => { const p = radarPoint(i, skill.rating!); return `${p.x},${p.y}`; }).join(" ")} fill={C.lime} fillOpacity={0.24} stroke={C.lime} strokeWidth={2} />{profile.skills.map((skill, i) => { const p = radarPoint(i, skill.rating!); return <Circle key={skill.id} cx={p.x} cy={p.y} r={3} fill={C.lime} />; })}</> : <>{profile.skills.map((skill, i) => { if (skill.rating === null) return null; const p = radarPoint(i, skill.rating); return <Circle key={skill.id} cx={p.x} cy={p.y} r={4} fill={C.lime} />; })}</>}
      </Svg>
      {profile.skills.map((skill, i) => <Pressable key={skill.id} accessibilityRole="button" accessibilityLabel={`${skill.name}, ${sample ? `sample rating ${skill.rating}` : skill.rating === null ? "not assessed" : `test score ${skill.rating}`}. Show breakdown.`} accessibilityState={{ expanded: selected === skill.id }} onPress={() => selectSkill(skill.id)} style={({ pressed }) => [styles.axisLabel, axisPositions[i], { opacity: pressed ? 0.65 : 1 }]}><Text style={[s.small, { color: selected === skill.id ? C.lime : C.onDeep, textAlign: "center" }]}>{skill.name}</Text><Text style={[styles.axisValue, { color: C.onDeep }]}>{skill.rating ?? "—"}</Text></Pressable>)}
    </View> : <View>{profile.skills.map((skill) => <Pressable key={skill.id} accessibilityRole="button" accessibilityState={{ expanded: selected === skill.id }} accessibilityLabel={`${skill.name}, ${sample ? `sample rating ${skill.rating}` : skill.rating === null ? "not assessed" : `test score ${skill.rating}`}. Show breakdown.`} onPress={() => selectSkill(skill.id)} style={({ pressed }) => [styles.ratingRow, { borderColor: C.onDeep, opacity: pressed ? 0.65 : 1 }]}><Text style={[s.h3, { color: C.onDeep, flex: 1 }]}>{skill.name}</Text><Text style={[s.h3, { color: C.lime }]}>{skill.rating ?? "—"}</Text><ChevronRight size={17} color={C.onDeep} /></Pressable>)}</View>}
    {detail ? <View accessibilityLiveRegion="polite" style={[styles.detail, { borderColor: C.onDeep }]}>
      <Text style={[s.h3, { color: C.lime }]}>{detail.name} · {detail.rating === null ? "Not assessed" : `${detail.rating} / 100 · ${sample ? "example" : "test score"}`}</Text>
      <Text style={[s.small, { color: C.onDeep }]}>{sample ? "Illustrative value only. It is not saved to your profile." : assessmentProtocols[detail.id].proxy}</Text>
      {!sample ? <>
        {detail.latest ? <Text style={[s.small, { color: C.onDeep }]}>{detail.latest.value}{assessmentProtocols[detail.id].measure === "seconds" ? " sec" : " hits / reps"} · {new Date(detail.latest.date).toLocaleDateString()}{detail.delta === null ? "" : ` · ${detail.delta > 0 ? "+" : ""}${detail.delta} since last`}</Text> : null}
        <Button label={detail.latest ? `Retest ${detail.name.toLowerCase()}` : `Assess ${detail.name.toLowerCase()}`} kind="lime" onPress={() => onAssess(detail.id)} />
        {detail.history.length > 1 ? detail.history.slice(-3).reverse().map((test, i) => <View key={test.id + i} style={s.row}><Text style={[s.small, { color: C.onDeep }]}>{new Date(test.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {test.value}{assessmentProtocols[detail.id].measure === "seconds" ? " s" : " reps"}</Text><Text style={[s.h3, { color: C.lime }]}>{test.score}</Text></View>) : null}
      </> : null}
    </View> : <Text style={[s.small, { color: C.onDeep, textAlign: "center" }]}>{sample ? "Sample values · tap a skill for details" : "Tap a skill to assess or see your results"}</Text>}
    {!sample ? <Text style={[s.small, { color: C.onDeep }]}>{profile.coverage === 6 ? "OVR = mean of your six latest test scores." : "Complete all six tests to unlock OVR."} App-defined targets, not validated player ratings.</Text> : null}
    <Pressable accessibilityRole="button" accessibilityLabel={sample ? "Return to my profile" : "Preview an illustrative example profile"} onPress={() => { haptic("selection"); setSample(!sample); }} style={({ pressed }) => [styles.preview, { borderColor: C.onDeep, opacity: pressed ? 0.65 : 1 }]}><Text style={[s.h3, { color: C.lime }]}>{sample ? "Back to my profile" : "Preview example"}</Text><ChevronRight size={17} color={C.lime} /></Pressable>
  </View>;
}
const axisPositions = [
  { top: 0, left: "34%", width: "32%" },
  { top: "23%", right: 0 },
  { bottom: "23%", right: 0 },
  { bottom: 0, left: "34%", width: "32%" },
  { bottom: "23%", left: 0 },
  { top: "23%", left: 0 },
] as const;
const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 16, borderCurve: "continuous", gap: 16 },
  title: { gap: 6, flex: 1 }, titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  overall: { alignItems: "center", gap: 0 }, overallNumber: { fontFamily: "IBMPlexMono_500Medium", fontSize: 38, lineHeight: 48 },
  segments: { flexDirection: "row", borderWidth: 1, borderRadius: 12, padding: 3, gap: 4 },
  segment: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  radar: { width: "100%", aspectRatio: 1, position: "relative" },
  axisLabel: { position: "absolute", width: 80, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 2 },
  axisValue: { fontFamily: "IBMPlexMono_500Medium", fontSize: 18, lineHeight: 24 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth },
  detail: { gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  preview: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
});
