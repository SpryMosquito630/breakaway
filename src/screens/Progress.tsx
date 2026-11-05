import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { ChartNoAxesCombined, Check, Clock3 } from "lucide-react-native";
import { useApp } from "../state/AppState";
import { Button, Field, Link, Page, Title, s, C } from "../components/ui";
import { time } from "../domain/model";
export function Progress({ navigation }: { navigation: any }) {
  const { data } = useApp();
  const total = data.history.reduce((n, h) => n + h.seconds, 0);
  const b = data.benchmarks;
  const last = b[b.length - 1];
  const first = b[0];
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
                <Text style={[s.h3, { color: C.green }]}>
                  {last.count - first.count >= 0 ? "+" : ""}
                  {last.count - first.count} since first
                </Text>
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
  const { update } = useApp();
  const [count, setCount] = useState("");
  const valid = /^\d{1,3}$/.test(count);
  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <Page
        footer={
          <Button
            label="Save result"
            disabled={!valid}
            onPress={() => {
              update((st) => ({
                ...st,
                benchmarks: [
                  ...st.benchmarks,
                  {
                    id: String(Date.now()),
                    date: new Date().toISOString(),
                    count: Number(count),
                  },
                ],
              }));
              navigation.goBack();
            }}
          />
        }
      >
        <Title
          title="30-second touch test"
          body="Count controlled inside touches for 30 seconds. If the ball escapes, reset and keep the timer running."
        />
        <Text style={s.small}>
          Use a separate timer and the same conditions each time.
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
      </Page>
    </KeyboardAvoidingView>
  );
}
