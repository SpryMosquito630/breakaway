import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { Button, Field, Link, Page, Title } from "../components/ui";
import { assessmentProtocols, assessmentScore, isAssessmentSkill, validAssessmentValue } from "../domain/assessments";
import { profileSkills } from "../domain/skillProfile";
import { useApp } from "../state/AppState";
import { useTheme } from "../theme/ThemeProvider";
import { useAssessmentClock } from "../hooks/useAssessmentClock";
import { haptic } from "../utils/haptics";
import { time } from "../domain/model";

export function Assessment({ navigation, route }: { navigation: any; route: any }) {
  const requested = route.params?.skill;
  const skill = isAssessmentSkill(requested) ? requested : null;
  if (!skill) return <Page><Title title="Assessment unavailable" /><Button label="Back to Progress" onPress={() => navigation.goBack()} /></Page>;
  return <AssessmentTest key={skill} skill={skill} navigation={navigation} />;
}
function AssessmentTest({ skill, navigation }: { skill: keyof typeof assessmentProtocols; navigation: any }) {
  const protocol = assessmentProtocols[skill];
  const { C, s } = useTheme();
  const { update } = useApp();
  const { run, start, cancel, finish, timedOut } = useAssessmentClock(protocol.duration, protocol.measure === "seconds" ? protocol.max : undefined);
  const [count, setCount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const saved = useRef(false);
  const live = run.phase === "running" || run.phase === "countdown";
  const timed = protocol.measure === "seconds";
  const captured = Math.round(run.elapsed * 100) / 100;
  const raw = timed ? captured : /^\d{1,3}$/.test(count) ? Number(count) : NaN;
  const valid = run.phase === "entry" && validAssessmentValue(skill, raw);
  const score = valid ? assessmentScore(skill, raw) : null;
  useEffect(() => navigation.addListener("blur", cancel), [navigation, cancel]);
  const begin = () => { saved.current = false; setCount(""); start(); };
  const label = profileSkills.find((item) => item.id === skill)!.name;
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={100}>
    <Page footer={run.phase === "entry" ? <Button label="Save test score" disabled={!valid} feedback={false} onPress={() => {
      if (!valid || saved.current) return;
      saved.current = true;
      const now = Date.now();
      update((state) => ({ ...state, assessments: [...(state.assessments ?? []), { id: String(now), date: new Date(now).toISOString(), skill, protocolVersion: 1, value: raw }] }));
      haptic("success"); navigation.goBack();
    }} /> : run.phase === "running" && protocol.duration === null ? <View style={styles.actions}><Button label={timed ? "Finish · helper taps" : "All attempts complete"} feedback={false} onPress={finish} /><Button label="Cancel test" kind="secondary" onPress={cancel} /></View> : <Button label={live ? "Cancel test" : "Start assessment"} kind={live ? "secondary" : "primary"} disabled={!live && !confirmed} feedback={live ? "warning" : false} onPress={live ? cancel : begin} />}>
      <Title title={protocol.title} body={`${label} · test score`} />
      {run.phase === "ready" || run.phase === "cancelled" ? <>
        <View style={s.note}><Text style={s.h3}>What you need</Text><Text style={s.body}>{protocol.setup}</Text></View>
        <Text style={s.body}>{protocol.cue}</Text>
        {timed ? <Text style={s.small}>Your helper holds the phone at the finish. Sound on for Go. Timing includes reaction time.</Text> : null}
        <Text style={s.small}>{protocol.proxy}</Text>
        <Button label={confirmed ? "Setup ready ✓" : "I have this setup"} kind="secondary" onPress={() => setConfirmed(!confirmed)} accessibilityLabel={confirmed ? "Setup confirmed. Tap to unconfirm." : "Confirm I have the required setup"} />
        {run.phase === "cancelled" ? <Text accessibilityLiveRegion="polite" style={s.small}>{timedOut ? "Time limit reached. Nothing saved; repeat the test." : "Test cancelled. Nothing saved."}</Text> : null}
        <Link label="Do this later" onPress={() => navigation.goBack()} />
        <View style={s.rule} /><Text style={s.small}>App-defined targets, not validated player ratings. Use the same setup each time.</Text><Text style={s.small}>{protocol.scoring}</Text>
      </> : run.phase === "entry" ? <>
        <Text accessibilityRole="header" style={s.h2}>Test complete</Text>
        {timed ? <View style={s.card}><Text style={s.stat}>{captured.toFixed(2)} sec</Text><Text style={s.small}>Helper-timed result · reaction time included</Text></View> : <><Field label={protocol.count} value={count} onChangeText={setCount} number placeholder={`0–${protocol.max}`} />{count !== "" && !valid ? <Text style={[s.small, { color: C.danger }]}>Enter a whole number from 0 to {protocol.max}.</Text> : null}</>}
        {timed && !valid ? <Text style={[s.small, { color: C.danger }]}>Time must be 1–{protocol.max} seconds. Repeat this attempt.</Text> : null}
        {score !== null ? <View style={s.row}><Text style={s.h3}>Test score</Text><Text style={s.stat}>{score} / 100</Text></View> : null}
        <Text style={s.small}>{protocol.scoring}</Text><Text style={s.small}>{protocol.proxy}</Text>
        <Link label="Discard & try again" feedback={false} onPress={begin} />
        <Link label="Discard & go back" onPress={() => navigation.goBack()} />
      </> : <View style={styles.running}>
        <Text accessibilityLiveRegion="polite" style={s.h2}>{run.phase === "countdown" ? "Get ready" : timed ? "Go · helper watches the finish" : protocol.duration === null ? "Complete every attempt" : "Count controlled reps"}</Text>
        <Text style={[s.stat, styles.clock, { color: run.phase === "running" ? C.flare : C.ink }]}>{run.phase === "countdown" ? run.remaining : protocol.duration !== null ? time(run.remaining) : timed ? run.elapsed.toFixed(2) : time(run.elapsed)}</Text>
        <Text style={s.body}>{run.phase === "countdown" ? "Start on the Go signal" : protocol.cue}</Text>
      </View>}
    </Page>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ actions: { gap: 8 }, running: { gap: 20, paddingVertical: 24 }, clock: { fontSize: 52, lineHeight: 68 } });
