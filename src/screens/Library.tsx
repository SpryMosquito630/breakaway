import { drillTarget } from "../domain/targets";
import { profileForToday, trainingPlanToday } from "../domain/training";
import { DrillMovement as Diagram } from "../components/DrillMovement";
import { DrillDemo } from "../components/DrillDemo";
import { haptic } from "../utils/haptics";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AppAlert as Alert } from "../utils/alerts";
import {
  ChevronDown,
  MoreHorizontal,
  Play,
  SlidersHorizontal,
} from "lucide-react-native";
import { useApp } from "../state/AppState";
import {
  allowed,
  goals,
  makeSession,
  replaceActiveDrill,
  getDrillDuration,
  time,
} from "../domain/model";
import {
  Page,
  Title,
  Button,
  Chip,
  DrillRow,
  SearchField,
  Steps,
  Note,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { adaptDrill } from "../domain/planning";
export function Library({ navigation }: { navigation: any }) {
  const { data, catalog: drills } = useApp();
  const { C, s } = useTheme();
  const [scope, setScope] = useState("My setup");
  const [skill, setSkill] = useState("All skills");
  const [customOnly, setCustomOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [search, setSearch] = useState("");
  const extraFilters = Number(skill !== "All skills") + Number(customOnly);
  const list = drills.filter(
    (d) =>
      (scope === "All" ||
        (scope === "Saved" && data.favorites?.includes(d.id)) ||
        (scope === "My setup" && allowed(d, profileForToday(data)))) &&
      (skill === "All skills" || d.skill === skill) &&
      (!customOnly || d.id.startsWith("custom-")) &&
      (d.name + " " + d.skill).toLowerCase().includes(search.toLowerCase().trim()),
  );
  return (
    <Page contentStyle={{ gap: 16 }}>
      <SearchField value={search} onChangeText={setSearch} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {["My setup", "Saved", "All"].map((f) => (
          <Chip key={f} label={f} selected={f === scope} onPress={() => setScope(f)} />
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[s.small, { flex: 1 }]}>
          {list.length} {list.length === 1 ? "drill" : "drills"}
          {scope === "My setup" ? " for your setup" : ""}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filters${extraFilters ? `, ${extraFilters} active` : ""}`}
          accessibilityState={{ expanded: filtersOpen }}
          onPress={() => {
            haptic("selection");
            setFiltersOpen(!filtersOpen);
            setManageOpen(false);
          }}
          style={({ pressed }) => ({
            minHeight: 48,
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderRadius: 10,
            backgroundColor: pressed ? C.soft : "transparent",
          })}
        >
          <SlidersHorizontal size={18} color={extraFilters ? C.green : C.muted} />
          <Text style={[s.small, { color: extraFilters ? C.green : C.muted }]}>
            Filters{extraFilters ? ` · ${extraFilters}` : ""}
          </Text>
          <ChevronDown
            size={16}
            color={C.muted}
            style={{ transform: [{ rotate: filtersOpen ? "180deg" : "0deg" }] }}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Manage library"
          accessibilityState={{ expanded: manageOpen }}
          onPress={() => {
            haptic("selection");
            setManageOpen(!manageOpen);
            setFiltersOpen(false);
          }}
          style={({ pressed }) => ({
            minWidth: 48,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            backgroundColor: pressed ? C.soft : "transparent",
          })}
        >
          <MoreHorizontal size={22} color={C.muted} />
        </Pressable>
      </View>
      {filtersOpen ? (
        <View style={{ gap: 12 }}>
          <Text style={s.h3}>Filter drills</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {["All skills", ...goals].map((f) => (
              <Chip
                key={f}
                label={f}
                selected={skill === f}
                onPress={() => setSkill(f)}
              />
            ))}
          </View>
          <View style={{ alignItems: "flex-start" }}>
            <Chip
              label="Only my drills"
              selected={customOnly}
              onPress={() => setCustomOnly(!customOnly)}
            />
          </View>
        </View>
      ) : null}
      {manageOpen ? (
        <View style={{ gap: 8 }}>
          <Text style={s.h3}>Manage library</Text>
          <Button
            kind="secondary"
            label="Create drill"
            onPress={() => navigation.navigate("CustomDrillEditor")}
          />
          <Button
            kind="secondary"
            label="Playlists"
            onPress={() => navigation.navigate("Playlists")}
          />
        </View>
      ) : null}
      <View>
        {list.map((d) => (
          <DrillRow
            key={d.id}
            drill={d}
            onPress={() => navigation.navigate("Detail", { id: d.id })}
          />
        ))}
        {!list.length ? (
          <View style={{ paddingVertical: 40, gap: 12 }}>
            <Text style={s.h2}>
              {scope === "Saved" && !search && !extraFilters
                ? "No saved drills yet"
                : "No drills found"}
            </Text>
            <Text style={s.body}>
              {scope === "Saved" && !search && !extraFilters
                ? "Open a drill and save it to find it here."
                : "Try another search or reset your filters."}
            </Text>
            <Button
              kind="secondary"
              label="Browse all drills"
              onPress={() => {
                setScope("All");
                setSkill("All skills");
                setCustomOnly(false);
                setSearch("");
              }}
            />
          </View>
        ) : null}
      </View>
    </Page>
  );
}
export function Detail({ navigation, route }: { navigation: any; route: any }) {
  const { data, update, catalog: drills } = useApp();
  const { C, s } = useTheme();
  const base = drills.find((x) => x.id === route.params.id);
  const [difficulty, setDifficulty] = useState(
    base ? (adaptDrill(base, data.history).difficulty ?? 1) : 1,
  );
  if (!base)
    return (
      <Page>
        <Title
          title="Drill no longer available"
          body="Your saved practice history is still available in Progress."
        />
        <Button label="Back to drills" onPress={() => navigation.popToTop()} />
      </Page>
    );
  const variant = base.variants?.find((v) => v.difficulty === difficulty);
  const d = variant ? { ...base, ...variant, difficulty } : base;
  const fits = allowed(d, profileForToday(data));
  const begin = () => {
    if (data.active) {
      Alert.alert("Session in progress", "Resume or end your current session first.", [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => haptic("selection"),
        },
        {
          text: "Resume",
          onPress: () => {
            haptic("medium");
            navigation.navigate("Practice");
          },
        },
      ]);
      return;
    }
    update((st) => ({
      ...st,
      active: makeSession([d.id], 5, Date.now(), [d]),
    }));
    navigation.navigate("Practice");
  };
  const start = () =>
    fits
      ? begin()
      : Alert.alert(
          "Check your setup",
          `You need ${d.space.toLowerCase()}${d.gear.length ? " and " + d.gear.join(" + ") : ""}. Available now?`,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => haptic("selection"),
            },
            {
              text: "Start drill",
              onPress: () => {
                haptic("medium");
                begin();
              },
            },
          ],
        );
  return (
    <Page
      footer={
        <Button
          label={`Practice · ${time(getDrillDuration(5, 1))}`}
          icon={Play}
          onPress={start}
        />
      }
    >
      <Title title={d.name} body={d.cue} />
      <Button
        kind="secondary"
        label={data.favorites?.includes(d.id) ? "Remove from saved drills" : "Save drill"}
        onPress={() =>
          update((st) => ({
            ...st,
            favorites: st.favorites?.includes(d.id)
              ? st.favorites.filter((id) => id !== d.id)
              : [...(st.favorites ?? []), d.id],
          }))
        }
      />
      {d.id.startsWith("custom-") ? (
        <Button
          kind="secondary"
          label="Edit your drill"
          onPress={() => navigation.navigate("CustomDrillEditor", { id: d.id })}
        />
      ) : null}
      <View style={s.row}>
        <Text style={s.small}>{d.skill}</Text>
        <Text style={s.small}>
          {d.gear.length ? `Ball + ${d.gear.join(" + ")}` : "Ball only"}
        </Text>
      </View>
      {base.variants?.length ? (
        <View style={{ gap: 8 }}>
          <Text style={s.h2}>Choose your challenge</Text>
          <Text style={s.small}>
            Two completed Easy sessions move your plan up a level.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {base.variants?.map((v) => (
              <Chip
                key={v.difficulty}
                label={v.label}
                selected={difficulty === v.difficulty}
                onPress={() => setDifficulty(v.difficulty)}
              />
            ))}
          </View>
          <Text style={s.body}>
            {drillTarget(variant?.target, getDrillDuration(5, 1))}
          </Text>
        </View>
      ) : null}
      <DrillDemo key={d.id} id={d.id} />
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
export function Replace({ navigation, route }: { navigation: any; route: any }) {
  const { data, update, catalog: drills } = useApp();
  const { C, s } = useTheme();
  const { index, mode } = route.params;
  const ids =
    mode === "active" ? data.active?.ids || [] : trainingPlanToday(data, drills);
  const current = drills.find((d) => d.id === ids[index]);
  const list = drills.filter(
    (d) => allowed(d, profileForToday(data)) && !ids.includes(d.id),
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
            feedback="light"
            onPress={() => {
              update((st) => {
                if (mode === "active" && st.active) {
                  return {
                    ...st,
                    active: replaceActiveDrill(
                      st.active,
                      index,
                      d.id,
                      adaptDrill(d, st.history),
                    ),
                  };
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
            All matching drills are in use. Change your setup in Settings for more
            options.
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
