import { useEffect, useRef } from "react";
import { Alert, Text, View } from "react-native";
import {
  Check,
  Pause,
  Play,
  ArrowRight,
  Footprints,
} from "lucide-react-native";
import { useApp } from "../state/AppState";
import { Active, advance, pause, recap, time } from "../domain/model";
import { drills } from "../data/drills";
import {
  Button,
  Chip,
  Diagram,
  Disclosure,
  Link,
  Note,
  Page,
  Steps,
  s,
  Title,
  C,
} from "../components/ui";
export function Practice({ navigation }: { navigation: any }) {
  const { data, update } = useApp();
  const a = data.active;
  const latest = useRef(a);
  latest.current = a;
  useEffect(
    () =>
      navigation.addListener("beforeRemove", () => {
        if (latest.current)
          update((st) => ({
            ...st,
            active: st.active ? pause(st.active) : null,
          }));
      }),
    [navigation],
  );
  if (!a)
    return (
      <Page>
        <Title title="Session saved" />
        <Button label="Back to Today" onPress={() => navigation.popToTop()} />
      </Page>
    );
  const d = drills.find((d) => d.id === a.ids[a.index])!;
  const finish = (active = a) => {
    const result = recap(active);
    update((st) => ({ ...st, active: null, history: [...st.history, result] }));
    navigation.replace("Recap", { id: result.id });
  };
  const next = (skip = false, current: Active = a) => {
    const n = advance(current, skip);
    if (n.index >= n.ids.length) finish(n);
    else update((st) => ({ ...st, active: n }));
  };
  const end = () => {
    const paused = pause(a);
    update((st) => ({ ...st, active: paused }));
    Alert.alert("End session?", "Your practiced time will be saved.", [
      { text: "Keep practicing", style: "cancel" },
      { text: "Save and end", onPress: () => finish(paused) },
    ]);
  };
  const advanceBlock = () => {
    if (a.remaining <= 0) {
      next();
      return;
    }
    const paused = pause(a);
    update((st) => ({ ...st, active: paused }));
    Alert.alert(
      "Finish block early?",
      "Time is saved. This block will count as partial.",
      [
        { text: "Keep practicing", style: "cancel" },
        { text: "Finish block", onPress: () => next(false, paused) },
      ],
    );
  };
  const swap = () =>
    navigation.navigate("Replace", { mode: "active", index: a.index });
  const timed = a.warmed && a.phase === "timer";
  const footer = !a.warmed ? (
    <Button
      label="Warm-up done"
      icon={ArrowRight}
      onPress={() =>
        update((st) => ({ ...st, active: { ...st.active!, warmed: true } }))
      }
    />
  ) : !timed ? (
    <>
      <Button
        label={`Start · ${time(a.duration)}`}
        icon={Play}
        onPress={() =>
          update((st) => ({
            ...st,
            active: {
              ...st.active!,
              phase: "timer",
              running: true,
              last: Date.now(),
            },
          }))
        }
      />
      <View style={s.row}>
        <Link label="Replace drill" onPress={swap} />
        <Link label="Skip drill" onPress={() => next(true)} />
      </View>
    </>
  ) : (
    <>
      <Button
        label={
          a.remaining <= 0
            ? a.index === a.ids.length - 1
              ? "Finish session"
              : "Next drill"
            : a.running
              ? "Pause"
              : "Resume"
        }
        icon={a.remaining <= 0 ? ArrowRight : a.running ? Pause : Play}
        onPress={() =>
          a.remaining <= 0
            ? next()
            : update((st) => ({
                ...st,
                active: st.active!.running
                  ? pause(st.active!)
                  : { ...st.active!, running: true, last: Date.now() },
              }))
        }
      />
      {a.remaining > 0 ? (
        <View style={s.row}>
          {!a.running ? (
            <Link label="Replace drill" onPress={swap} />
          ) : (
            <Link label="Skip drill" onPress={() => next(true)} />
          )}
          <Link
            label={a.index === a.ids.length - 1 ? "Finish drill" : "Next drill"}
            onPress={advanceBlock}
          />
        </View>
      ) : null}
    </>
  );
  return (
    <Page footer={footer} contentStyle={{ gap: 20, paddingTop: 8 }}>
      <View style={s.row}>
        <Text style={s.small}>
          {a.warmed ? `Drill ${a.index + 1} of ${a.ids.length}` : "Warm-up"}
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
      {!a.warmed ? (
        <>
          <View
            style={{
              height: 120,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                backgroundColor: C.pitchSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Footprints size={36} color={C.green} strokeWidth={1.5} />
            </View>
          </View>
          <Title
            title="Get moving"
            body="2 minutes of easy walking or jogging, then gently move your ankles and hips."
          />
          <Text style={s.small}>
            Check your space. Warm-up time is not logged.
          </Text>
        </>
      ) : timed ? (
        <>
          <View style={{ alignItems: "center", paddingTop: 24, gap: 12 }}>
            <Text style={[s.h1, { textAlign: "center" }]}>{d.name}</Text>
            <Text
              accessibilityRole="timer"
              accessibilityLabel={`${time(a.remaining)} remaining`}
              style={{
                fontFamily: "IBMPlexMono_500Medium",
                fontSize: 72,
                lineHeight: 94,
                letterSpacing: -4,
                color: C.ink,
                marginVertical: 12,
              }}
            >
              {time(a.remaining)}
            </Text>
            <View
              style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: a.running ? C.flare : C.muted,
                }}
              />
              <Text style={[s.small, { color: a.running ? C.flare : C.muted }]}>
                {a.remaining <= 0
                  ? "Block complete"
                  : a.running
                    ? "In progress"
                    : "Paused"}
              </Text>
            </View>
            <Text
              style={[
                s.body,
                { textAlign: "center", maxWidth: 280, marginTop: 8 },
              ]}
            >
              {d.cue}
            </Text>
          </View>
          <View
            style={{ marginTop: 20, borderTopWidth: 1, borderColor: C.line }}
          >
            <Disclosure label="Drill instructions">
              <Steps drill={d} />
              <Text style={s.small}>{d.tip}</Text>
            </Disclosure>
          </View>
        </>
      ) : (
        <>
          <Title title={d.name} />
          <Text style={s.small}>
            Ball{d.gear.length ? " + " + d.gear.join(" + ") : " only"} ·{" "}
            {d.space}
          </Text>
          <Steps drill={d} />
          <Note>{d.tip}</Note>
          <Disclosure label="View movement">
            <Diagram drill={d} />
          </Disclosure>
        </>
      )}
    </Page>
  );
}
export function Recap({ navigation, route }: { navigation: any; route: any }) {
  const { data, update } = useApp();
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
