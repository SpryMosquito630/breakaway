import { haptic } from "../utils/haptics";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import {
  ArrowDown,
  ArrowUp,
  Minus,
  ChartNoAxesCombined,
  Check,
  Clock3,
} from "lucide-react-native";
import { useApp } from "../state/AppState";
import { Button, Field, Link, Page, Title } from "../components/ui";
import { benchmarkDelta, time } from "../domain/model";
import { useTheme } from "../theme/ThemeProvider";
import { canSaveBenchmark } from "../domain/benchmark";
import { useBenchmarkClock } from "../hooks/useBenchmarkClock";

export function Progress({ navigation }: { navigation: any }) {
  const { C, s } = useTheme();
  const { data } = useApp();
  const total = data.history.reduce((n, h) => n + h.seconds, 0);
  const b = data.benchmarks;
  const last = b[b.length - 1];
  const first = b[0];
  const delta = first && last ? benchmarkDelta(first.count, last.count) : null;
  const DeltaIcon =
    delta?.direction === "up"
      ? ArrowUp
      : delta?.direction === "down"
        ? ArrowDown
        : Minus;
  return (
    <Page>
      {data.history.length ? (
        <>
          <View
            style={[
              s.row,
              { paddingVertical: 12, justifyContent: "flex-start", gap: 40 },
            ]}
          >
            <View>
              <Text style={s.stat}>{data.history.length}</Text>
              <Text style={s.small}>
                {data.history.length === 1 ? "session" : "sessions"}
              </Text>
            </View>
            <View>
              <Text style={s.stat}>{time(total)}</Text>
              <Text style={s.small}>time practiced</Text>
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={s.h2}>Recent sessions</Text>
            {data.history
              .slice()
              .reverse()
              .map((h) => (
                <View
                  key={h.id}
                  style={{
                    paddingVertical: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderBottomWidth: 1,
                    borderColor: C.line,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: C.pitchSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {h.completed ? (
                      <Check size={18} color={C.green} />
                    ) : (
                      <Clock3 size={18} color={C.green} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.h3}>
                      {h.completed ? "Session complete" : "Partial session"}
                    </Text>
                    <Text style={s.small}>
                      {new Date(h.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      · {h.done}/{h.total} drills
                      {h.effort ? " · " + h.effort : ""}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "IBMPlexMono_400Regular",
                      fontSize: 14,
                      color: C.ink,
                    }}
                  >
                    {time(h.seconds)}
                  </Text>
                </View>
              ))}
          </View>
        </>
      ) : (
        <View
          style={{ paddingVertical: 32, gap: 20, alignItems: "flex-start" }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: C.pitchSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChartNoAxesCombined size={25} color={C.green} />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={s.h2}>Your first session starts it</Text>
            <Text style={s.body}>
              Practice all or part of a session to begin your history.
            </Text>
          </View>
          <Button
            label="Go to Today"
            onPress={() => navigation.navigate("Today")}
          />
        </View>
      )}
      <View style={{ gap: 16, marginTop: 8 }}>
        <View style={s.row}>
          <Text style={s.h2}>Touch test</Text>
          <Link
            label={b.length ? "Retest" : "Add baseline"}
            onPress={() => navigation.navigate("Benchmark")}
          />
        </View>
        {!b.length ? (
          <Text style={s.body}>
            Count controlled touches for 30 seconds. Compare your own results
            over time.
          </Text>
        ) : (
          <View style={s.card}>
            <View style={s.row}>
              <View>
                <Text style={s.stat}>{last.count}</Text>
                <Text style={s.small}>touches / 30 sec</Text>
              </View>
              {b.length > 1 ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 1,
                  }}
                >
                  <DeltaIcon
                    size={18}
                    color={
                      delta?.direction === "up"
                        ? C.success
                        : delta?.direction === "down"
                          ? C.danger
                          : C.muted
                    }
                  />
                  <Text
                    style={[
                      s.h3,
                      {
                        flexShrink: 1,
                        color:
                          delta?.direction === "up"
                            ? C.success
                            : delta?.direction === "down"
                              ? C.danger
                              : C.muted,
                      },
                    ]}
                  >
                    {delta?.label}
                  </Text>
                </View>
              ) : null}
            </View>
            {b
              .slice()
              .reverse()
              .map((v) => (
                <View style={s.row} key={v.id}>
                  <Text style={s.small}>
                    {new Date(v.date).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                  <Text style={s.h3}>{v.count} touches</Text>
                </View>
              ))}
          </View>
        )}
      </View>
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
              Use the same space and technique each time. Sound and vibration
              mark the start and finish.
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
                phase === "countdown"
                  ? `Starting in ${value}`
                  : `${value} seconds left`
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
              {phase === "countdown"
                ? "Start on the signal"
                : "Keep the ball close"}
            </Text>
          </View>
        )}
      </Page>
    </KeyboardAvoidingView>
  );
}
