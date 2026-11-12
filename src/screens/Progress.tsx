import { ProgressionSummary } from "./Progression";
import { SkillProfile } from "../components/SkillProfile";
import { PersonalRating } from "../components/PersonalRating";
import { haptic } from "../utils/haptics";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { useApp } from "../state/AppState";
import { Button, Field, Link, Page, SettingRow, Title } from "../components/ui";
import { time } from "../domain/model";
import { useTheme } from "../theme/ThemeProvider";
import { skillProfile } from "../domain/skillProfile";
import { deriveProgression } from "../progression/engine";
import { canSaveBenchmark } from "../domain/benchmark";
import { useBenchmarkClock } from "../hooks/useBenchmarkClock";

export function Progress({ navigation }: { navigation: any }) {
  const { C, s } = useTheme();
  const { data, catalog } = useApp();
  const rating = skillProfile(false, data.assessments);
  const practice = deriveProgression(data, catalog);
  return (
    <Page>
      <View style={[s.card, { gap: 8, paddingVertical: 20 }]}>
        {rating.overall === null ? (
          <>
            <Text style={s.h2}>Skill profile</Text>
            <Text style={s.small}>{rating.coverage}/6 tests recorded</Text>
          </>
        ) : (
          <>
            <Text style={s.small}>Overall test score</Text>
            <View
              style={[
                s.row,
                { alignItems: "baseline", justifyContent: "flex-start", gap: 12 },
              ]}
            >
              <Text style={[s.stat, { fontSize: 56, lineHeight: 68, color: C.green }]}>
                {rating.overall}
              </Text>
              <Text style={s.small}>/ 100</Text>
            </View>
            <Text style={s.small}>6/6 skills assessed · App-defined test targets</Text>
          </>
        )}
      </View>
      <View style={s.group}>
        <SettingRow
          label="Skill tests"
          onPress={() => navigation.navigate("SkillProfile")}
        />
        <SettingRow
          label="Touch test"
          value={
            data.benchmarks.length
              ? `${data.benchmarks.length} saved results`
              : "30 seconds"
          }
          onPress={() => navigation.navigate("TouchProgress")}
        />
      </View>
      <View style={{ gap: 12 }}>
        <Text style={s.h2}>Practice</Text>
        <Text style={s.small}>
          {practice.weekDays} {practice.weekDays === 1 ? "day" : "days"} this week ·{" "}
          {practice.days.length} total practice days
        </Text>
        <View style={s.group}>
          <SettingRow
            label="History"
            value={`${data.history.length} ${data.history.length === 1 ? "session" : "sessions"}`}
            onPress={() => navigation.navigate("SessionHistory")}
          />
          <SettingRow
            label="Milestones"
            value={`Level ${practice.level} · ${practice.xp} XP`}
            onPress={() => navigation.navigate("PracticeMilestones")}
          />
          <SettingRow
            label="Season goals"
            onPress={() => navigation.navigate("Seasons")}
          />
        </View>
      </View>
    </Page>
  );
}
export function SkillProfileScreen({ navigation }: { navigation: any }) {
  return (
    <Page>
      <SkillProfile onAssess={(skill) => navigation.navigate("Assessment", { skill })} />
    </Page>
  );
}
export function TouchProgress({ navigation }: { navigation: any }) {
  const { data } = useApp();
  return (
    <Page>
      <PersonalRating
        results={data.benchmarks}
        onTest={() => navigation.navigate("Benchmark")}
      />
    </Page>
  );
}
export function PracticeMilestones({ navigation }: { navigation: any }) {
  return (
    <Page>
      <ProgressionSummary navigation={navigation} />
    </Page>
  );
}
export function SessionHistory({ navigation }: { navigation: any }) {
  const { C, s } = useTheme();
  const { data } = useApp();
  const history = [...data.history].sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date),
  );
  return (
    <Page>
      {history.length ? (
        history.map((h, index) => (
          <View
            key={h.id + ":" + index}
            style={[
              s.row,
              { paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line, gap: 12 },
            ]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.h3}>
                {h.completed ? "Session complete" : "Partial session"}
              </Text>
              <Text style={s.small}>
                {new Date(h.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                · {h.done}/{h.total} drills{h.effort ? " · " + h.effort : ""}
              </Text>
              {h.drills?.map((drill, i) => (
                <Text key={`${drill.id}:${i}`} style={s.small}>
                  {drill.id} · level {drill.difficulty} · {drill.status} ·{" "}
                  {time(drill.seconds)}
                </Text>
              ))}
            </View>
            <Text style={s.small}>{time(h.seconds)}</Text>
          </View>
        ))
      ) : (
        <>
          <Text style={s.body}>Your sessions will appear here after practice.</Text>
          <Button
            label="Go to Train"
            onPress={() => navigation.navigate("Main", { screen: "Today" })}
          />
        </>
      )}
    </Page>
  );
}
export function Benchmark({ navigation }: { navigation: any }) {
  const { C, s } = useTheme();
  const { update } = useApp();
  const { run, start: startClock, cancel } = useBenchmarkClock();
  const [count, setCount] = useState("");
  const saved = useRef(false);
  const phase = run.phase;
  const value = Math.ceil(run.remaining);
  const live = phase === "countdown" || phase === "running";
  const valid = canSaveBenchmark(run, count);
  useEffect(() => navigation.addListener("blur", cancel), [navigation, cancel]);
  const start = () => {
    saved.current = false;
    setCount("");
    startClock();
  };
  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <Page
        footer={
          phase === "entry" ? (
            <Button
              label="Save result"
              feedback={false}
              disabled={!valid}
              onPress={() => {
                if (!valid || saved.current) return;
                saved.current = true;
                haptic("success");
                const now = Date.now();
                update((st) => ({
                  ...st,
                  benchmarks: [
                    ...st.benchmarks,
                    {
                      id: String(now),
                      date: new Date(now).toISOString(),
                      count: Number(count),
                    },
                  ],
                }));
                navigation.goBack();
              }}
            />
          ) : (
            <Button
              label={live ? "Cancel test" : "Start touch test"}
              feedback={live ? "warning" : false}
              kind={live ? "secondary" : "primary"}
              onPress={live ? cancel : start}
            />
          )
        }
      >
        <Title
          title="30-second touch test"
          body="Count controlled inside touches. If the ball escapes, reset and keep going."
        />
        {phase === "ready" || phase === "cancelled" ? (
          <>
            <Text style={s.body}>
              Get set for a 3–2–1 countdown, then 30 seconds of touches.
            </Text>
            <Text style={s.small}>
              Use the same space and technique each time. Sound and vibration mark the
              start and finish.
            </Text>
            {phase === "cancelled" ? (
              <Text accessibilityLiveRegion="polite" style={s.small}>
                Test cancelled. Start again when you’re ready.
              </Text>
            ) : null}
          </>
        ) : phase === "entry" ? (
          <>
            <Text accessibilityRole="header" style={s.h2}>
              Test complete
            </Text>
            <Field
              label="Controlled touches"
              value={count}
              onChangeText={setCount}
              number
              placeholder="0–999"
            />
            {count && !valid ? (
              <Text style={[s.small, { color: C.danger }]}>
                Enter a whole number from 0 to 999.
              </Text>
            ) : null}
            <Link label="Try again" feedback={false} onPress={start} />
          </>
        ) : (
          <View style={{ alignItems: "center", gap: 12, paddingVertical: 32 }}>
            <Text accessibilityLiveRegion="polite" style={s.h2}>
              {phase === "countdown"
                ? "Get ready"
                : value <= 10
                  ? "10 seconds or less"
                  : "Count your touches"}
            </Text>
            <Text
              accessibilityLabel={
                phase === "countdown" ? `Starting in ${value}` : `${value} seconds left`
              }
              style={[
                s.stat,
                {
                  fontSize: 72,
                  lineHeight: 90,
                  color: phase === "running" ? C.flare : C.ink,
                },
              ]}
            >
              {phase === "countdown" ? value : time(value)}
            </Text>
            <Text style={s.small}>
              {phase === "countdown" ? "Start on the signal" : "Keep the ball close"}
            </Text>
          </View>
        )}
      </Page>
    </KeyboardAvoidingView>
  );
}
