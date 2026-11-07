import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AppAlert as Alert } from "../utils/alerts";
import { useApp } from "../state/AppState";
import {
  Button,
  Chip,
  Page,
  Title,
  Note,
  DrillRow,
  Disclosure,
  useTheme,
} from "../components/ui";
import { allowed, days, goals, makeSession, type Drill } from "../domain/model";
import { localDateKey } from "../domain/planning";
import {
  deleteCustomDrill,
  pathStage,
  playlistIssues,
  profileForToday,
  sanitizeCustomDrills,
  trainingPaths,
  trainingPlanToday,
  weeklyReview,
} from "../domain/training";
import {
  setTodayMinutes,
  todayMinuteChoices,
  sessionMinutesToday,
} from "../domain/sessionTime";
function Choices({
  values,
  selected,
  onSelect,
}: {
  values: readonly string[];
  selected: string[];
  onSelect: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {values.map((v) => (
        <Chip
          key={v}
          label={v}
          selected={selected.includes(v)}
          onPress={() => onSelect(v)}
        />
      ))}
    </View>
  );
}
export function TrainingPlanner({ navigation }: { navigation: any }) {
  const { data, update, catalog } = useApp();
  const { s, C } = useTheme();
  const now = new Date();
  const date = localDateKey(now);
  const prefs = data.trainingPreferences ?? {
    weeklyTarget: data.profile.days.length,
    matchDays: [],
  };
  const readiness =
    data.dailyReadiness?.date === date
      ? data.dailyReadiness
      : { date, energy: "Usual" as const, gear: data.profile.gear };
  const review = weeklyReview(data, now);
  const savePrefs = (next: typeof prefs) =>
    update((st) => ({ ...st, trainingPreferences: next }));
  const setReady = (next: typeof readiness) =>
    update((st) => (st.active ? st : { ...st, dailyReadiness: next }));
  return (
    <Page>
      <Title
        title="Your training week"
        body="Choose a path, plan around matches and fit today to your setup."
      />
      <View style={{ gap: 12 }}>
        <Text style={s.h2}>Today’s check-in</Text>
        {data.active ? (
          <Note>
            Your active session keeps its original drills and timing. Check in after
            finishing it.
          </Note>
        ) : (
          <>
            <Text style={s.body}>Energy</Text>
            <Choices
              values={["Low", "Usual", "High"]}
              selected={[readiness.energy]}
              onSelect={(energy) =>
                setReady({ ...readiness, energy: energy as typeof readiness.energy })
              }
            />
            <Text style={s.body}>Available now · ball always needed</Text>
            <Choices
              values={["markers", "wall", "partner"]}
              selected={readiness.gear}
              onSelect={(g) =>
                setReady({
                  ...readiness,
                  gear: readiness.gear.includes(g)
                    ? readiness.gear.filter((x) => x !== g)
                    : [...readiness.gear, g],
                })
              }
            />
            <Text style={s.body}>Time · {sessionMinutesToday(data, now)} min</Text>
            <Choices
              values={todayMinuteChoices.map((x) => String(x))}
              selected={[String(sessionMinutesToday(data, now))]}
              onSelect={(m) =>
                update((st) => setTodayMinutes(st, Number(m) as 10 | 15 | 20 | 30))
              }
            />
            <Text style={s.small}>
              Low energy and match days cap extra ball work at 10 minutes. High energy
              never adds time automatically. Stop if you feel pain or unwell.
            </Text>
          </>
        )}
      </View>
      <View style={{ gap: 12 }}>
        <Text style={s.h2}>Weekly goal</Text>
        <Choices
          values={["1", "2", "3", "4", "5", "6", "7"]}
          selected={[String(prefs.weeklyTarget)]}
          onSelect={(v) => savePrefs({ ...prefs, weeklyTarget: Number(v) })}
        />
        <Text style={s.small}>
          Completed practice days over the last seven days: {review.count} of{" "}
          {review.target}. Your target does not add sessions automatically.
        </Text>
        <Text style={s.h3}>Match days</Text>
        <Choices
          values={days}
          selected={prefs.matchDays}
          onSelect={(d) =>
            savePrefs({
              ...prefs,
              matchDays: prefs.matchDays.includes(d)
                ? prefs.matchDays.filter((x) => x !== d)
                : [...prefs.matchDays, d],
            })
          }
        />
      </View>
      <Disclosure label="Seven-day calendar">
        <View style={{ gap: 16 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
            const day = days[(d.getDay() + 6) % 7];
            const match = prefs.matchDays.includes(day);
            return (
              <View key={i}>
                <Text style={s.h3}>
                  {day} ·{" "}
                  {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </Text>
                <Text style={s.body}>
                  {match
                    ? "Match · optional 10-minute gentle ball work"
                    : data.profile.days.includes(day)
                      ? `${data.profile.minutes} min · ${trainingPlanToday(
                          data,
                          catalog,
                          d,
                        )
                          .map((id) => catalog.find((x) => x.id === id)?.name)
                          .join(" · ")}`
                      : "Rest / your own activity"}
                </Text>
              </View>
            );
          })}
        </View>
      </Disclosure>
      <View style={{ gap: 12 }}>
        <Text style={s.h2}>Seven-day review</Text>
        <Text style={s.body}>{review.message}</Text>
        <Text style={s.small}>
          {Math.floor(review.seconds / 60)} minutes actually practiced. Effort comes from
          your saved recaps.
        </Text>
        {review.minutes < data.profile.minutes ? (
          <Button
            kind="secondary"
            label={`Try ${review.minutes} min today`}
            onPress={() =>
              update((st) => setTodayMinutes(st, review.minutes as 10 | 15 | 20 | 30))
            }
          />
        ) : null}
      </View>
      <View style={{ gap: 16 }}>
        <Text style={s.h2}>Optional training paths</Text>
        <Text style={s.small}>
          Source-informed, illustrative practice plans; not coach reviewed. Your focus and
          setup still apply. Each stage advances after three completed path sessions.
        </Text>
        {trainingPaths.map((path) => {
          const selected = prefs.pathId === path.id;
          const stage = selected ? pathStage(data) : 0;
          const unavailable = path.stages[stage].filter((id) => {
            const d = catalog.find((x) => x.id === id);
            return !d || !allowed(d, data.profile);
          });
          return (
            <View
              key={path.id}
              style={{
                gap: 8,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: C.line,
              }}
            >
              <Text style={s.h3}>
                {path.name}
                {selected ? ` · stage ${stage + 1}/3` : ""}
              </Text>
              <Text style={s.body}>{path.body}</Text>
              <Text style={s.small}>
                {path.stages[stage]
                  .map((id) => catalog.find((x) => x.id === id)?.name ?? id)
                  .join(" · ")}
              </Text>
              {unavailable.length ? (
                <Text style={s.small}>
                  {unavailable.length} drill(s) need another setup; eligible focus drills
                  fill those places.
                </Text>
              ) : null}
              <Button
                kind={selected ? "primary" : "secondary"}
                label={selected ? "Selected · remove path" : "Choose this path"}
                onPress={() =>
                  savePrefs({ ...prefs, pathId: selected ? undefined : path.id })
                }
              />
            </View>
          );
        })}
        {data.planCustomized ? (
          <Note>
            Your manually edited plan takes priority. To use path drills, choose “Use
            generated plan” below.
          </Note>
        ) : null}
        {data.planCustomized ? (
          <Button
            kind="secondary"
            label="Use generated plan"
            onPress={() => update((st) => ({ ...st, planCustomized: false }))}
          />
        ) : null}
      </View>
    </Page>
  );
}
export function CustomDrillEditor({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const { data, update } = useApp();
  const { s, C } = useTheme();
  const existing = data.customDrills?.find((d) => d.id === route.params?.id);
  const [name, setName] = useState(existing?.name ?? "");
  const [cue, setCue] = useState(existing?.cue ?? "");
  const [steps, setSteps] = useState(existing?.steps.join("\n") ?? "");
  const [tip, setTip] = useState(existing?.tip ?? "");
  const [skill, setSkill] = useState(existing?.skill ?? "");
  const [gear, setGear] = useState(existing?.gear ?? []);
  const [space, setSpace] = useState(existing?.space ?? "");
  const [error, setError] = useState("");
  const field = (
    label: string,
    value: string,
    onChangeText: (v: string) => void,
    maxLength: number,
    multiline = false,
  ) => (
    <View style={{ gap: 6 }}>
      <Text style={s.h3}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        multiline={multiline}
        style={[
          s.body,
          {
            borderWidth: 1,
            borderColor: C.lineStrong,
            borderRadius: 10,
            minHeight: 48,
            padding: 12,
            textAlignVertical: "top",
            color: C.ink,
          },
        ]}
      />
    </View>
  );
  const save = () => {
    const draft = {
      id:
        existing?.id ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      cue,
      steps: steps.split("\n"),
      tip,
      skill,
      gear,
      space,
      level: existing?.level ?? "New to training",
      version: (existing?.version ?? 0) + 1,
    };
    const valid = sanitizeCustomDrills([draft])[0];
    if (!valid) {
      setError("Add a name, cue, at least one step, focus and space.");
      return;
    }
    if (!existing && (data.customDrills?.length ?? 0) >= 40) {
      setError("You can save up to 40 custom drills.");
      return;
    }
    update((st) => ({
      ...st,
      customDrills: [...(st.customDrills ?? []).filter((d) => d.id !== draft.id), valid],
    }));
    navigation.goBack();
  };
  return (
    <Page footer={<Button label="Save drill" onPress={save} />}>
      <Title
        title={existing ? "Edit your drill" : "Create your drill"}
        body="Write instructions for practice you know. Your content stays on this device."
      />
      {field("Name", name, setName, 80)}
      {field("Coaching cue", cue, setCue, 180)}
      {field("Steps · one per line, up to 8", steps, setSteps, 2400, true)}
      {field("Reminder / tip", tip, setTip, 240, true)}
      <Text style={s.h3}>Focus</Text>
      <Choices values={goals} selected={[skill]} onSelect={setSkill} />
      <Text style={s.h3}>Space</Text>
      <Choices
        values={["Small space", "Open space"]}
        selected={[space]}
        onSelect={setSpace}
      />
      <Text style={s.h3}>Equipment · ball always needed</Text>
      <Choices
        values={["markers", "wall", "partner"]}
        selected={gear}
        onSelect={(g) =>
          setGear(gear.includes(g) ? gear.filter((x) => x !== g) : [...gear, g])
        }
      />
      {existing ? (
        <Note>
          Edits apply to future sessions. An active session keeps its saved instructions.
        </Note>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
          {error}
        </Text>
      ) : null}
      {existing ? (
        <Button
          kind="danger"
          label="Delete drill"
          onPress={() => {
            const blocked =
              data.active?.ids.includes(existing.id) ||
              data.plan.includes(existing.id) ||
              data.playlists?.some((p) => p.ids.includes(existing.id));
            if (blocked) {
              Alert.alert(
                "Drill in use",
                "Finish its active session and remove it from your plan and playlists before deleting.",
              );
              return;
            }
            Alert.alert("Delete this drill?", "History stays saved.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  update((st) => deleteCustomDrill(st, existing.id));
                  navigation.popToTop();
                },
              },
            ]);
          }}
        />
      ) : null}
    </Page>
  );
}
export function Playlists({ navigation }: { navigation: any }) {
  const { data, update, catalog } = useApp();
  const { s, C } = useTheme();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | undefined>();
  const [error, setError] = useState("");
  const toggle = (id: string) => {
    setError("");
    setSelected(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : selected.length < 8
          ? [...selected, id]
          : selected,
    );
  };
  const issues = playlistIssues(selected, catalog, data.profile);
  const save = () => {
    if (!name.trim()) {
      setError("Give your playlist a name.");
      return;
    }
    if (issues.length) {
      setError(issues.join("\n"));
      return;
    }
    if (!editing && (data.playlists?.length ?? 0) >= 20) {
      setError("You can save up to 20 playlists.");
      return;
    }
    const id = editing ?? `playlist-${Date.now()}`;
    update((st) => ({
      ...st,
      playlists: [
        ...(st.playlists ?? []).filter((p) => p.id !== id),
        { id, name: name.trim(), ids: selected },
      ],
    }));
    setName("");
    setSelected([]);
    setEditing(undefined);
    setError("");
  };
  return (
    <Page>
      <Title
        title="Playlists"
        body="Save drill combinations to reuse. Equipment and space are checked each time."
      />
      {(data.playlists ?? []).map((p) => (
        <View key={p.id} style={{ gap: 8, paddingVertical: 12 }}>
          <Text style={s.h2}>{p.name}</Text>
          <Text style={s.small}>
            {p.ids.map((id) => catalog.find((d) => d.id === id)?.name).join(" · ")}
          </Text>
          <Button
            label="Use as my plan"
            kind="secondary"
            onPress={() => {
              const errors = playlistIssues(p.ids, catalog, data.profile);
              if (errors.length) {
                Alert.alert("Setup needed", errors.join("\n"));
                return;
              }
              update((st) => ({ ...st, plan: [...p.ids], planCustomized: true }));
              navigation.goBack();
            }}
          />
          <Button
            label="Practice playlist"
            onPress={() => {
              if (data.active) {
                Alert.alert(
                  "Session in progress",
                  "Resume or finish your active session first.",
                );
                return;
              }
              const errors = playlistIssues(p.ids, catalog, profileForToday(data));
              if (errors.length) {
                Alert.alert("Setup needed", errors.join("\n"));
                return;
              }
              update((st) => ({
                ...st,
                active: makeSession(p.ids, sessionMinutesToday(st), Date.now(), catalog),
              }));
              navigation.navigate("Practice");
            }}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button
                kind="secondary"
                label="Edit"
                onPress={() => {
                  setEditing(p.id);
                  setName(p.name);
                  setSelected(p.ids);
                  setError("");
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                kind="danger"
                label="Delete"
                onPress={() =>
                  Alert.alert("Delete playlist?", p.name, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () =>
                        update((st) => ({
                          ...st,
                          playlists: st.playlists?.filter((x) => x.id !== p.id),
                        })),
                    },
                  ])
                }
              />
            </View>
          </View>
        </View>
      ))}
      <Text style={s.h2}>{editing ? "Edit playlist" : "New playlist"}</Text>
      <TextInput
        accessibilityLabel="Playlist name"
        placeholder="Playlist name"
        placeholderTextColor={C.muted}
        value={name}
        onChangeText={setName}
        maxLength={80}
        style={[
          s.body,
          {
            minHeight: 48,
            borderWidth: 1,
            borderColor: C.lineStrong,
            borderRadius: 10,
            padding: 12,
            color: C.ink,
          },
        ]}
      />
      <Text style={s.small}>{selected.length} of 8 selected · tap in practice order</Text>
      <Disclosure label="Choose drills">
        <View>
          {catalog.map((d) => (
            <DrillRow
              key={d.id}
              drill={d}
              action={
                selected.includes(d.id) ? `Selected ${selected.indexOf(d.id) + 1}` : "Add"
              }
              onPress={() => toggle(d.id)}
              trailing={
                <Chip
                  label={
                    selected.includes(d.id)
                      ? `${selected.indexOf(d.id) + 1} · Remove`
                      : "Add"
                  }
                  selected={selected.includes(d.id)}
                  onPress={() => toggle(d.id)}
                />
              }
            />
          ))}
        </View>
      </Disclosure>
      {error ? (
        <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
          {error}
        </Text>
      ) : null}
      <Button label="Save playlist" onPress={save} />
      {editing ? (
        <Button
          kind="secondary"
          label="Cancel editing"
          onPress={() => {
            setEditing(undefined);
            setSelected([]);
            setName("");
            setError("");
          }}
        />
      ) : null}
    </Page>
  );
}
