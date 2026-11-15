import { drillTarget } from "../domain/targets";
import { DrillInstructions } from "../components/DrillInstructions";
import { haptic } from "../utils/haptics";
import { useEffect } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { AppAlert as Alert } from "../utils/alerts";
import {
  Check,
  Pause,
  Play,
  ArrowRight,
  Footprints,
  CircleCheck,
} from "lucide-react-native";
import { useApp } from "../state/AppState";
import { Active, advance, recap, time } from "../domain/model";
import { usePracticeClock } from "../hooks/usePracticeClock";
import {
  Button,
  Chip,
  Disclosure,
  Link,
  Page,
  Steps,
  Title,
  useTheme,
} from "../components/ui";
function resolvePracticeDrill(
  active: Active,
  index: number,
  drills: import("../domain/model").Drill[],
) {
  const base = drills.find((d) => d.id === active.ids[index]);
  if (!base) return null;
  const snapshot = active.snapshots?.[base.id];
  const stage = snapshot?.difficulty ?? 1;
  const variant = base.variants?.find((v) => v.difficulty === stage);
  return {
    ...base,
    ...variant,
    ...(snapshot?.name ? { name: snapshot.name } : {}),
    ...(snapshot?.cue ? { cue: snapshot.cue } : {}),
    ...(snapshot?.steps ? { steps: snapshot.steps } : {}),
    ...(snapshot?.tip ? { tip: snapshot.tip } : {}),
    target: drillTarget(snapshot?.target ?? variant?.target, active.duration),
    stage,
  };
}
export function Practice({ navigation }: { navigation: any }) {
  const {
    data,
    update,
    catalog: drills,
    backgroundClockMessage,
    backgroundClockBusy,
    setBackgroundPractice,
  } = useApp();
  const { width, height } = useWindowDimensions();
  const compact = width < 360 || height < 740;
  const { C, s } = useTheme();
  const clock = usePracticeClock();
  const a = clock.active;
  useEffect(
    () =>
      navigation.addListener("beforeRemove", () => {
        if (clock.current()) clock.pauseCurrent();
      }),
    [navigation, clock.current, clock.pauseCurrent],
  );
  if (!a)
    return (
      <Page>
        <Title title="Session saved" />
        <Button label="Back to Today" onPress={() => navigation.popToTop()} />
      </Page>
    );
  const d = resolvePracticeDrill(a, a.index, drills)!;
  const upcoming = resolvePracticeDrill(a, a.index + 1, drills);
  const finish = (active = a) => {
    const result = recap(active);
    clock.commit(null);
    update((st) => ({ ...st, history: [...st.history, result] }));
    navigation.replace("Recap", { id: result.id });
  };
  const next = (skip = false, current?: Active) => {
    const actual = current ?? clock.current() ?? a;
    const n = advance(actual, skip);
    if (n.index >= n.ids.length) finish(n);
    else clock.commit(n);
  };
  const end = () => {
    const paused = clock.pauseCurrent();
    if (!paused) return;
    Alert.alert("End session?", "Your practiced time will be saved.", [
      {
        text: "Keep practicing",
        style: "cancel",
        onPress: () => haptic("selection"),
      },
      {
        text: "Save and end",
        onPress: () => {
          haptic("success");
          finish(paused);
        },
      },
    ]);
  };
  const advanceBlock = () => {
    const paused = clock.pauseCurrent();
    if (!paused) return;
    if (paused.remaining <= 0) {
      next(false, paused);
      return;
    }
    Alert.alert(
      "Finish block early?",
      "Time is saved. This block will count as partial.",
      [
        {
          text: "Keep practicing",
          style: "cancel",
          onPress: () => haptic("selection"),
        },
        {
          text: "Finish block",
          onPress: () => {
            haptic("warning");
            next(false, paused);
          },
        },
      ],
    );
  };
  const swap = () => {
    clock.pauseCurrent();
    navigation.navigate("Replace", { mode: "active", index: a.index });
  };
  const timed = a.warmed && a.phase === "timer";
  const complete = timed && a.remaining <= 0;
  const status = complete
    ? "Drill complete"
    : !a.running
      ? "Paused"
      : a.remaining <= 10
        ? "Final 10 seconds"
        : "Running";
  const startBlock = () =>
    clock.commit({
      ...a,
      backgroundClock: a.backgroundClock ?? data.backgroundPractice === true,
      phase: "timer",
      running: true,
      last: Date.now(),
    });
  const skipLink = (
    <Link label="Skip drill" feedback="warning" onPress={() => next(true)} />
  );
  const footer = (
    <View style={{ gap: 12 }}>
      {!a.warmed ? (
        <Button
          size="large"
          label="Warm-up done"
          icon={ArrowRight}
          onPress={() => clock.commit({ ...a, warmed: true })}
        />
      ) : !timed ? (
        <>
          <Button
            size="large"
            label={`Start drill · ${time(a.duration)}`}
            disabled={backgroundClockBusy}
            accessibilityLabel={`Start ${d.name}, ${time(a.duration)} practice block`}
            icon={Play}
            onPress={startBlock}
          />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Link label="Replace drill" feedback="light" onPress={swap} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>{skipLink}</View>
          </View>
        </>
      ) : complete ? (
        <Button
          size="large"
          kind="lime"
          label={upcoming ? "Next drill" : "Finish session"}
          accessibilityLabel={
            upcoming
              ? `Next drill, ${upcoming.name}. Open setup.`
              : "Finish and save session"
          }
          icon={ArrowRight}
          onPress={() => next()}
        />
      ) : (
        <>
          <Button
            size="large"
            kind={a.running ? "lime" : "primary"}
            label={a.running ? "Pause" : "Resume"}
            accessibilityLabel={
              a.running ? "Pause practice timer" : "Resume practice timer"
            }
            icon={a.running ? Pause : Play}
            onPress={() =>
              a.running
                ? clock.pauseCurrent()
                : clock.commit({ ...a, running: true, last: Date.now() })
            }
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            {!a.running ? (
              <View style={{ flex: 1 }}>
                <Link label="Replace" feedback="light" onPress={swap} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>{skipLink}</View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Link label="Finish early" onPress={advanceBlock} />
            </View>
          </View>
        </>
      )}
    </View>
  );
  const preview = upcoming ? (
    <View style={{ gap: 8, borderTopWidth: 1, borderColor: C.line, paddingTop: 20 }}>
      <Text style={s.small}>
        Up next · Drill {a.index + 2} of {a.ids.length}
      </Text>
      <Text style={s.h2}>{upcoming.name}</Text>
      <Text style={s.small}>
        Stage {upcoming.stage} · {time(a.duration)}
      </Text>
      {upcoming.target ? <Text style={s.body}>{upcoming.target}</Text> : null}
    </View>
  ) : null;
  return (
    <Page
      key={`${a.id}:${a.index}:${a.warmed ? "drill" : "warmup"}:${a.phase}:${complete ? "complete" : "active"}`}
      footer={footer}
      contentStyle={{ gap: compact ? 12 : 20, paddingTop: 4 }}
    >
      <View style={{ gap: 8 }}>
        <View style={s.row}>
          <Text style={s.small}>
            {a.warmed ? `Drill ${a.index + 1} of ${a.ids.length}` : "Before you start"}
          </Text>
          <Link label="End session" onPress={end} />
        </View>
        <View
          accessibilityLabel={`Session progress ${Math.round(((a.index + (timed ? 1 - a.remaining / a.duration : 0)) / a.ids.length) * 100)} percent`}
          style={{ flexDirection: "row", gap: 6 }}
        >
          {a.ids.map((id, i) => {
            const fill =
              i < a.index
                ? 1
                : i === a.index && timed
                  ? Math.max(0, Math.min(1, 1 - a.remaining / a.duration))
                  : 0;
            return (
              <View
                key={`${id}-${i}`}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 2,
                  backgroundColor: C.line,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 4,
                    width: `${fill * 100}%`,
                    backgroundColor: i < a.index ? C.green : C.lime,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
      {!a.warmed ? (
        <>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Footprints size={24} color={C.green} strokeWidth={1.5} />
              <Text style={s.h1}>Warm up</Text>
            </View>
            <Text style={[s.stat, { fontSize: 44, lineHeight: 56 }]}>2 min</Text>
            <Text style={s.body}>
              Walk or jog easily, then gently move your ankles and hips.
            </Text>
            <Text style={s.small}>Self-paced · Warm-up time is not logged.</Text>
          </View>
          <View
            style={{
              gap: 8,
              borderTopWidth: 1,
              borderColor: C.line,
              paddingTop: 20,
            }}
          >
            <Text style={s.small}>First drill</Text>
            <Text style={s.h2}>{d.name}</Text>
            <Text style={s.small}>
              {time(a.duration)} · Check your space before you begin.
            </Text>
          </View>
        </>
      ) : complete ? (
        <>
          <View style={{ gap: 16, paddingTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <CircleCheck size={26} color={C.success} strokeWidth={1.8} />
              <Text accessibilityRole="header" style={[s.h2, { color: C.success }]}>
                Drill complete
              </Text>
            </View>
            <Text style={s.h1}>{d.name}</Text>
            <Text style={s.body}>
              {time(a.blockElapsed ?? a.duration)} practiced · {a.done + 1}/{a.ids.length}{" "}
              drills completed
            </Text>
          </View>
          {preview ?? (
            <View
              style={{
                gap: 8,
                borderTopWidth: 1,
                borderColor: C.line,
                paddingTop: 20,
              }}
            >
              <Text style={s.h2}>That was your last drill.</Text>
              <Text style={s.body}>Finish the session to save your practice.</Text>
            </View>
          )}
        </>
      ) : timed ? (
        <>
          <View style={{ gap: compact ? 6 : 8 }}>
            <Text
              accessibilityRole="header"
              style={[s.h1, compact ? { fontSize: 23, lineHeight: 29 } : null]}
            >
              {d.name}
              {compact ? <Text style={s.small}> · Stage {d.stage}</Text> : null}
            </Text>
            {!compact ? <Text style={s.small}>Stage {d.stage}</Text> : null}
            {d.target ? (
              <Text
                style={[
                  s.h3,
                  {
                    fontSize: compact ? 15 : 17,
                    lineHeight: compact ? 22 : 25,
                  },
                ]}
              >
                {d.target}
              </Text>
            ) : null}
          </View>
          <View
            style={{
              alignItems: "center",
              gap: 8,
              paddingVertical: compact ? 0 : 4,
            }}
          >
            <Text
              accessibilityRole="timer"
              accessibilityLabel={`${time(a.remaining)} remaining`}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              numberOfLines={1}
              style={{
                fontFamily: "IBMPlexMono_500Medium",
                fontSize: compact ? 64 : 80,
                lineHeight: compact ? 84 : 100,
                letterSpacing: -3,
                color: C.ink,
                width: "100%",
                textAlign: "center",
              }}
            >
              {time(a.remaining)}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {a.running ? (
                <Play
                  size={14}
                  color={a.remaining <= 10 ? C.flare : C.green}
                  fill={a.remaining <= 10 ? C.flare : C.green}
                />
              ) : (
                <Pause size={14} color={C.muted} />
              )}
              <Text
                accessibilityLiveRegion="polite"
                style={[
                  s.h3,
                  {
                    color: !a.running ? C.muted : a.remaining <= 10 ? C.flare : C.green,
                  },
                ]}
              >
                {status}
              </Text>
            </View>
            {a.backgroundClock ? (
              <Text style={s.small}>
                Keeps time when locked · Next drill waits for you
              </Text>
            ) : null}
          </View>
          <Text style={[s.body, { textAlign: "center", color: C.ink }]}>{d.cue}</Text>
          <View style={{ borderTopWidth: 1, borderColor: C.line }}>
            <Disclosure label="Drill instructions">
              <Steps drill={d} />
              <Text style={s.small}>{d.tip}</Text>
            </Disclosure>
          </View>
        </>
      ) : (
        <>
          <View style={{ gap: 8 }}>
            <Text style={s.small}>
              Stage {d.stage} · {time(a.duration)}
            </Text>
            <Title title={d.name} />
            <Text style={s.small}>
              Ball{d.gear.length ? " + " + d.gear.join(" + ") : " only"} · {d.space}
            </Text>
          </View>
          <DrillInstructions key={d.id} drill={d} note={d.target} />
        </>
      )}
      {a.backgroundClock === undefined ? (
        <Disclosure
          label={`Screen-lock timer · ${data.backgroundPractice ? "On" : "Off"}`}
        >
          <Chip
            label={
              backgroundClockBusy
                ? "Checking notifications…"
                : "Continue when screen locks"
            }
            selected={data.backgroundPractice === true}
            onPress={() => {
              if (!backgroundClockBusy)
                void setBackgroundPractice(!data.backgroundPractice);
            }}
          />
          <Text style={s.small}>
            {data.backgroundPractice
              ? "Current block keeps time while locked or in another app. A notification marks the end; device settings may delay it. Next drill waits for you."
              : "Optional · Off by default. Practice pauses when you leave the app. Turning this on requests notification permission."}
          </Text>
          {backgroundClockMessage ? (
            <Text style={s.small}>{backgroundClockMessage}</Text>
          ) : null}
        </Disclosure>
      ) : backgroundClockMessage ? (
        <Text style={s.small}>{backgroundClockMessage}</Text>
      ) : null}
    </Page>
  );
}

export function Recap({ navigation, route }: { navigation: any; route: any }) {
  const { data, update, catalog: drills } = useApp();
  const { C, s } = useTheme();
  const h = data.history.find((h) => h.id === route.params.id);
  if (!h) return null;
  return (
    <Page
      footer={<Button label="Done" onPress={() => navigation.popToTop()} />}
      contentStyle={{ gap: 28, paddingTop: 32 }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: C.pitchSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Check size={30} color={C.green} />
      </View>
      <Title title={h.completed ? "Session complete" : "Practice saved"} />
      <View style={[s.row, { justifyContent: "flex-start", gap: 40 }]}>
        <View>
          <Text style={s.stat}>{time(h.seconds)}</Text>
          <Text style={s.small}>practiced</Text>
        </View>
        <View>
          <Text style={s.stat}>
            {h.done}/{h.total}
          </Text>
          <Text style={s.small}>drills completed</Text>
        </View>
      </View>
      {h.skipped ? (
        <Text style={s.small}>{h.skipped} skipped or finished early.</Text>
      ) : null}
      <View style={{ gap: 12 }}>
        <Text style={s.h2}>How did it feel?</Text>
        <View style={s.chips}>
          {["Easy", "Just right", "Challenging"].map((v) => (
            <Chip
              key={v}
              label={v}
              selected={h.effort === v}
              onPress={() =>
                update((st) => ({
                  ...st,
                  history: st.history.map((x) =>
                    x.id === h.id ? { ...x, effort: v } : x,
                  ),
                }))
              }
            />
          ))}
        </View>
      </View>
      {h.drills?.length ? (
        <Disclosure label="Drill results">
          {h.drills.map((r, i) => (
            <View key={`${r.id}-${i}`} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.h3}>
                  {drills.find((d) => d.id === r.id)?.name ?? "Archived drill"}
                </Text>
                <Text style={s.small}>
                  Stage {r.difficulty} ·{" "}
                  {r.status === "done"
                    ? "Complete"
                    : r.status === "partial"
                      ? "Partial"
                      : "Skipped"}
                </Text>
              </View>
              <Text style={s.small}>{time(r.seconds)}</Text>
            </View>
          ))}
        </Disclosure>
      ) : null}
      <Link
        label="View progress"
        onPress={() => {
          navigation.popToTop();
          navigation.navigate("Main", { screen: "Progress" });
        }}
      />
    </Page>
  );
}
