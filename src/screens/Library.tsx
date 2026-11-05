import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Play } from "lucide-react-native";
import { useApp } from "../state/AppState";
import { allowed, goals, makeSession, replaceActiveDrill, getDrillDuration, time } from "../domain/model";
import { drills } from "../data/drills";
import {
  Page,
  Title,
  Button,
  Chip,
  DrillRow,
  SearchField,
  Diagram,
  Steps,
  Note,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { adaptDrill, planForDate } from "../domain/planning";
export function Library({ navigation }: { navigation: any }) {
  const { data } = useApp();
  const { C, s } = useTheme();
  const [filter, setFilter] = useState("My setup");
  const [search, setSearch] = useState("");
  const list = drills.filter(
    (d) =>
      (filter === "All" ||
        (filter === "My setup" && allowed(d, data.profile)) ||
        d.skill === filter) &&
      (d.name + " " + d.skill)
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );
  return (
    <Page contentStyle={{ gap: 16 }}>
      <SearchField value={search} onChangeText={setSearch} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {["My setup", "All", ...goals].map((f) => (
          <Chip
            key={f}
            label={f}
            selected={f === filter}
            onPress={() => setFilter(f)}
          />
        ))}
      </ScrollView>
      <Text style={s.small}>
        {list.length} drills{filter === "My setup" ? " for your setup" : ""}
      </Text>
      <View>
        {list.map((d) => (
          <DrillRow
            key={d.id}
            drill={d}
            onPress={() => navigation.navigate("Detail", { id: d.id })}
          />
        ))}
        {!list.length ? (
          <View style={{ paddingVertical: 40, gap: 8 }}>
            <Text style={s.h2}>No drills found</Text>
            <Text style={s.body}>Try another search or choose All.</Text>
          </View>
        ) : null}
      </View>
    </Page>
  );
}
export function Detail({ navigation, route }: { navigation: any; route: any }) {
  const { data, update } = useApp();
  const { C, s } = useTheme();
  const base = drills.find((x) => x.id === route.params.id)!;
  const earned = adaptDrill(base, data.history);
  const [difficulty, setDifficulty] = useState(earned.difficulty ?? 1);
  const variant = base.variants?.find((v) => v.difficulty === difficulty);
  const d = variant ? { ...base, ...variant, difficulty } : base;
  const fits = allowed(d, data.profile);
  const begin = () => {
    if (data.active) {
      Alert.alert(
        "Session in progress",
        "Resume or end your current session first.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Resume", onPress: () => navigation.navigate("Practice") },
        ],
      );
      return;
    }
    update((st) => ({ ...st, active: makeSession([d.id], 5, Date.now(), [d]) }));
    navigation.navigate("Practice");
  };
  const start = () =>
    fits
      ? begin()
      : Alert.alert(
          "Check your setup",
          `You need ${d.space.toLowerCase()}${d.gear.length ? " and " + d.gear.join(" + ") : ""}. Available now?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Start drill", onPress: begin },
          ],
        );
  return (
    <Page
      footer={<Button label={`Practice · ${time(getDrillDuration(5, 1))}`} icon={Play} onPress={start} />}
    >
      <Title title={d.name} body={d.cue} />
      <View style={s.row}>
        <Text style={s.small}>{d.skill}</Text>
        <Text style={s.small}>
          {d.gear.length ? `Ball + ${d.gear.join(" + ")}` : "Ball only"}
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={s.h2}>Choose your challenge</Text>
        <Text style={s.small}>Two completed Easy sessions move your plan up a level.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {base.variants?.map((v) => <Chip key={v.difficulty} label={v.label} selected={difficulty === v.difficulty} onPress={() => setDifficulty(v.difficulty)} />)}
        </View>
        <Text style={s.body}>{variant?.target}</Text>
      </View>
      <Diagram drill={d} />
      <View style={{ gap: 16 }}>
        <Text style={s.h2}>How to do it</Text>
        <Steps drill={d} />
      </View>
      <Note>{d.tip}</Note>
      {!fits ? (
        <Text style={[s.small, { color: C.danger }]}>
          Requires a different setup from your plan.
        </Text>
      ) : null}
      <Text style={s.small}>{d.space} · Start with an easy warm-up.</Text>
    </Page>
  );
}
export function Replace({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const { data, update } = useApp();
  const { C, s } = useTheme();
  const { index, mode } = route.params;
  const ids = mode === "active" ? data.active?.ids || [] : planForDate(drills, data.profile, data.plan, new Date(), data.planCustomized);
  const current = drills.find((d) => d.id === ids[index]);
  const list = drills.filter(
    (d) => allowed(d, data.profile) && !ids.includes(d.id),
  );
  return (
    <Page>
      <Text style={s.body}>
        Choose a replacement for {current?.name || "this drill"}.
      </Text>
      <View>
        {list.map((d) => (
          <DrillRow
            key={d.id}
            drill={d}
            action="Choose"
            onPress={() => {
              update((st) => {
                if (mode === "active" && st.active) {
                  return { ...st, active: replaceActiveDrill(st.active, index, d.id, adaptDrill(d, st.history)) };
                }
                const next = [...ids];
                next[index] = d.id;
                return { ...st, plan: next, planCustomized: true };
              });
              navigation.goBack();
            }}
          />
        ))}
        {!list.length ? (
          <Text style={s.body}>
            All matching drills are in use. Change your setup in Settings for
            more options.
          </Text>
        ) : null}
      </View>
      {mode === "active" ? (
        <Text style={s.small}>
          Practiced time stays saved. The new block starts fresh.
        </Text>
      ) : null}
    </Page>
  );
}
