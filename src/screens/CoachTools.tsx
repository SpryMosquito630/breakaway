import React, { useState } from "react";
import { Text, TextInput, View, Pressable, Alert, Platform, Linking } from "react-native";
import Svg, { Rect, Circle, Line, Text as SvgText } from "react-native-svg";
import { Page, Title, Button, useTheme } from "../components/ui";
import {
  activities,
  attributes,
  formationLines,
  relationshipSummary,
  formations,
  generateSession,
  generateTeams,
  playerStats,
  swapTeams,
  validateDate,
  type CoachRequest,
  type CoachSession,
  type Constraint,
  type Group,
  type Match,
  type Player,
  type Teams,
} from "../coach/domain";
import { coachStore } from "../coach/state";
import { groupCSV, lineupHTML, lineupSVG, sessionHTML } from "../coach/export";
import { shareCSV, sharePDF, shareLineupImage } from "../coach/share";
type Props = { navigation: any; route?: any };
const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e8)}`;
const message = (error: unknown) =>
  error instanceof Error ? error.message : "This action could not be completed.";
function confirmDelete(title: string, onDelete: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(title + " This cannot be undone.")) onDelete();
  } else
    Alert.alert(title, "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
}
function Field({
  label,
  value,
  onChange,
  numeric = false,
  maxLength = 60,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  maxLength?: number;
  multiline?: boolean;
}) {
  const { s, C } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.h3}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "number-pad" : "default"}
        maxLength={maxLength}
        multiline={multiline}
        placeholderTextColor={C.muted}
        style={[s.input, multiline ? { minHeight: 90, paddingTop: 12 } : null]}
      />
    </View>
  );
}
function Choices({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { s, C } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.h3}>{label}</Text>
      <View style={s.chips}>
        {values.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityState={{ selected: value === v }}
            onPress={() => onChange(v)}
            style={{
              minHeight: 48,
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: value === v ? C.green : C.lineStrong,
              backgroundColor: value === v ? C.soft : C.white,
            }}
          >
            <Text style={[s.small, { color: C.ink }]}>{v}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function Notice({ children }: { children: React.ReactNode }) {
  const { s } = useTheme();
  return (
    <Text accessibilityLiveRegion="polite" style={s.body}>
      {children}
    </Text>
  );
}
function Fold({
  title,
  children,
  initial = false,
}: {
  title: string;
  children: React.ReactNode;
  initial?: boolean;
}) {
  const [open, setOpen] = useState(initial);
  const { s, C } = useTheme();
  return (
    <View style={{ gap: 12, borderTopWidth: 1, borderColor: C.line, paddingTop: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{ minHeight: 48, justifyContent: "center" }}
      >
        <Text style={s.h2}>
          {title} {open ? "−" : "+"}
        </Text>
      </Pressable>
      {open ? children : null}
    </View>
  );
}
function StoreStatus() {
  const store = coachStore.useStore();
  return !store.ready ? (
    <Notice>Loading saved tools…</Notice>
  ) : store.error ? (
    <View style={{ gap: 8 }}>
      <Notice>{store.error}</Notice>
      <Button
        kind="secondary"
        label="Retry saved data"
        onPress={() => void store.retry()}
      />
    </View>
  ) : null;
}
function Diagram({ kind }: { kind: "pair" | "circle" | "game" }) {
  const { C } = useTheme();
  const positions =
    kind === "pair"
      ? [
          [65, 65],
          [225, 65],
        ]
      : kind === "circle"
        ? [
            [60, 65],
            [100, 30],
            [190, 30],
            [230, 65],
            [190, 100],
            [100, 100],
          ]
        : [
            [55, 35],
            [55, 95],
            [110, 65],
            [180, 35],
            [180, 95],
            [235, 65],
          ];
  return (
    <View
      accessible
      accessibilityLabel={
        kind === "pair"
          ? "Top view: two partners pass across a clear lane."
          : kind === "circle"
            ? "Top view: players spaced around a circle, passing into open lanes."
            : "Top view: two sides spaced across a rectangular area, attacking opposite ends."
      }
    >
      <Svg width="100%" height={135} viewBox="0 0 290 130">
        <Rect
          x={5}
          y={5}
          width={280}
          height={120}
          rx={7}
          fill={C.soft}
          stroke={C.green}
        />
        {kind === "game" ? (
          <>
            <Line x1={35} y1={5} x2={35} y2={125} stroke={C.green} />
            <Line x1={255} y1={5} x2={255} y2={125} stroke={C.green} />
          </>
        ) : null}
        <Line
          x1={positions[0][0]}
          y1={positions[0][1]}
          x2={positions[1][0]}
          y2={positions[1][1]}
          stroke={C.green}
          strokeWidth={2}
          strokeDasharray="5 4"
        />
        {positions.map(([x, y], i) => (
          <React.Fragment key={i}>
            <Circle cx={x} cy={y} r={12} fill={i % 2 ? C.green : C.ink} />
            <SvgText x={x} y={y + 4} textAnchor="middle" fill={C.onPrimary} fontSize={11}>
              {i + 1}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}
export function CoachWorkspace({ navigation }: Props) {
  const { data, ready } = coachStore.useStore();
  const { s } = useTheme();
  const [favorites, setFavorites] = useState(false);
  return (
    <Page>
      <Title
        title="Coach notebook"
        body="Build a session from a small offline library, then keep the plan beside the pitch."
      />
      <StoreStatus />
      <Button
        label="Build a session"
        disabled={!ready}
        onPress={() => navigation.navigate("CoachSessionBuilder")}
      />
      <Notice>
        Original curated starter activities, not AI generated or coach reviewed. Check
        suitability, space and equipment before use. Ground-ball activities only; stop for
        pain, dizziness or unsafe conditions.
      </Notice>
      <Choices
        label="Saved library"
        values={["All sessions", "Favorites"]}
        value={favorites ? "Favorites" : "All sessions"}
        onChange={(v) => setFavorites(v === "Favorites")}
      />
      {data.sessions.filter((x) => !favorites || x.favorite).length === 0 ? (
        <Notice>
          Saved sessions appear here. Favorite the plans you want to repeat.
        </Notice>
      ) : (
        data.sessions
          .filter((x) => !favorites || x.favorite)
          .map((x) => (
            <View key={x.id} style={s.card}>
              <Text style={s.h3}>
                {x.favorite ? "★ " : ""}
                {x.request.goal} · {x.request.minutes} min
              </Text>
              <Text style={s.small}>
                {x.request.players} players · {x.activityIds.length} activities
              </Text>
              <Button
                kind="secondary"
                label="Open session"
                onPress={() => navigation.navigate("CoachSessionDetail", { id: x.id })}
              />
            </View>
          ))
      )}
      <Button
        kind="secondary"
        label="Local teams & matches"
        onPress={() => navigation.navigate("TeamWorkspace")}
      />
      <Button
        kind="secondary"
        label="Coaching reference · FIFA"
        onPress={() =>
          void Linking.openURL(
            "https://www.fifatrainingcentre.com/en/practice/grassroots.php",
          )
        }
      />
    </Page>
  );
}
export function CoachSessionBuilder({ navigation }: Props) {
  const { s } = useTheme();
  const store = coachStore.useStore();
  const [step, setStep] = useState(0);
  const [request, setRequest] = useState<CoachRequest>({
    goal: "Passing",
    minutes: 30,
    players: 2,
    equipment: ["Ball"],
    intensity: "Gentle",
    notes: "",
  });
  const [count, setCount] = useState("2");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof CoachRequest>(key: K, value: CoachRequest[K]) =>
    setRequest({ ...request, [key]: value });
  async function build() {
    setBusy(true);
    setError("");
    try {
      if (store.data.sessions.length >= 200)
        throw Error("Your library is full (200 sessions). Delete a saved session first.");
      const session = generateSession({ ...request, players: Number(count) });
      if (await store.update((d) => ({ ...d, sessions: [session, ...d.sessions] })))
        navigation.replace("CoachSessionDetail", { id: session.id });
      else setError("The session could not be saved. Retry after storage recovers.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Title
        title="Build a session"
        eyebrow={`STEP ${step + 1} OF 3`}
        body={
          [
            "Choose the purpose and people.",
            "Use only what is available.",
            "Review the constraints before creating your plan.",
          ][step]
        }
      />
      <StoreStatus />
      {step === 0 ? (
        <>
          <Choices
            label="Focus"
            values={["Passing", "Control", "Teamwork"]}
            value={request.goal}
            onChange={(v) => set("goal", v as CoachRequest["goal"])}
          />
          <Field
            label="Players · 1–22"
            numeric
            value={count}
            onChange={setCount}
            maxLength={2}
          />
          <Choices
            label="Total minutes"
            values={["15", "30", "45", "60", "75", "90"]}
            value={String(request.minutes)}
            onChange={(v) => set("minutes", Number(v))}
          />
        </>
      ) : step === 1 ? (
        <>
          <Choices
            label="Pace"
            values={["Gentle", "Moderate"]}
            value={request.intensity}
            onChange={(v) => set("intensity", v as CoachRequest["intensity"])}
          />
          <Text style={s.h3}>Available equipment · tap to toggle</Text>
          {["Ball", "Markers", "Bibs"].map((g) => (
            <Button
              key={g}
              kind="secondary"
              label={`${request.equipment.includes(g) ? "✓ " : ""}${g}`}
              onPress={() =>
                set(
                  "equipment",
                  request.equipment.includes(g)
                    ? request.equipment.filter((x) => x !== g)
                    : [...request.equipment, g],
                )
              }
            />
          ))}
          <Notice>
            Ball means one per pair or circle; team games need one per pitch. Markers and
            bibs are required only when selected activities need them. No equipment is
            silently added.
          </Notice>
          <Field
            label="Organizer notes · optional"
            value={request.notes}
            onChange={(v) => set("notes", v)}
            maxLength={500}
            multiline
          />
        </>
      ) : (
        <>
          <Text style={s.h2}>
            {request.goal} · {request.minutes} minutes
          </Text>
          <Notice>
            {count} players · {request.intensity} pace ·{" "}
            {request.equipment.join(", ") || "No equipment"}
          </Notice>
          <Notice>
            Offline selection from original curated activities. Notes are attached to the
            plan and do not change activity selection. Gentle uses longer rests; moderate
            uses shorter rounds with regular water breaks.
          </Notice>
          <Button
            label={busy ? "Saving…" : "Create & save session"}
            disabled={busy || !store.ready}
            onPress={() => void build()}
          />
        </>
      )}
      {error ? <Notice>{error}</Notice> : null}
      {step < 2 ? (
        <Button
          label="Continue"
          onPress={() => {
            if (
              step === 0 &&
              (!Number.isInteger(Number(count)) ||
                Number(count) < 1 ||
                Number(count) > 22)
            ) {
              setError("Choose 1–22 players.");
              return;
            }
            setError("");
            setStep(step + 1);
          }}
        />
      ) : null}
      {step > 0 ? (
        <Button kind="secondary" label="Back a step" onPress={() => setStep(step - 1)} />
      ) : null}
    </Page>
  );
}
export function CoachSessionDetail({ navigation, route }: Props) {
  const store = coachStore.useStore();
  const { s } = useTheme();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const session = store.data.sessions.find((x) => x.id === route?.params?.id);
  if (!session)
    return (
      <Page>
        <StoreStatus />
        <Title
          title="Session unavailable"
          body="It may have been deleted or local storage is still loading."
        />
      </Page>
    );
  const toggle = (key: string) =>
    void store.update((d) => ({
      ...d,
      sessions: d.sessions.map((x) =>
        x.id === session.id
          ? {
              ...x,
              checked: x.checked.includes(key)
                ? x.checked.filter((k) => k !== key)
                : [...x.checked, key],
            }
          : x,
      ),
    }));
  const activityMinutes = Math.floor(
    (session.request.minutes - 5) / session.activityIds.length,
  );
  return (
    <Page>
      <Title
        title={`${session.request.goal} session`}
        body={`${session.request.minutes} min · ${session.request.players} players · ${session.request.intensity}`}
      />
      <StoreStatus />
      <Button
        kind="secondary"
        label={session.favorite ? "★ Favorited" : "☆ Add to favorites"}
        onPress={() =>
          void store.update((d) => ({
            ...d,
            sessions: d.sessions.map((x) =>
              x.id === session.id ? { ...x, favorite: !x.favorite } : x,
            ),
          }))
        }
      />
      <Notice>
        Start: 3 minutes easy walking and mobility. Finish: 2 minutes easy walking.
        Activity blocks include rests and water. Gentle: work 45 sec / rest 45 sec;
        moderate: work 60 sec / rest 30 sec. Adjust or stop for fatigue.
      </Notice>
      {session.request.notes ? <Notice>Notes: {session.request.notes}</Notice> : null}
      {session.activityIds.map((id, index) => {
        const a = activities.find((x) => x.id === id)!;
        return (
          <Fold
            key={id}
            title={`${index + 1}. ${a.title} · ${activityMinutes + (index === 0 ? (session.request.minutes - 5) % session.activityIds.length : 0)} min`}
            initial={index === 0}
          >
            <Diagram kind={a.diagram} />
            <Text style={s.body}>{a.setup}</Text>
            {a.steps.map((x, i) => (
              <Text key={x} style={s.body}>
                {i + 1}. {x}
              </Text>
            ))}
            <Text style={s.h3}>Coaching points</Text>
            {a.points.map((x) => (
              <Text key={x} style={s.body}>
                • {x}
              </Text>
            ))}
            <Text style={s.h3}>Common mistakes</Text>
            {a.mistakes.map((x) => (
              <Text key={x} style={s.body}>
                • {x}
              </Text>
            ))}
          </Fold>
        );
      })}
      <Fold title="Pitch checklist">
        {[
          "Clear safe area",
          "Enough balls and selected gear",
          "Water and rest breaks",
          "Explain stop signal",
          "Rotate roles fairly",
        ].map((x) => (
          <Button
            key={x}
            kind="secondary"
            label={`${session.checked.includes(x) ? "✓ " : ""}${x}`}
            onPress={() => toggle(x)}
          />
        ))}
      </Fold>
      <Button
        label={
          busy
            ? "Preparing…"
            : Platform.OS === "web"
              ? "Print / save PDF"
              : "Export & share PDF"
        }
        disabled={busy}
        onPress={() => {
          setBusy(true);
          void sharePDF(sessionHTML(session))
            .catch((e) => setError(message(e)))
            .finally(() => setBusy(false));
        }}
      />
      {error ? <Notice>{error}</Notice> : null}
      <Button
        kind="danger"
        label="Delete session"
        onPress={() =>
          confirmDelete(
            "Delete this session?",
            () =>
              void store
                .update((d) => ({
                  ...d,
                  sessions: d.sessions.filter((x) => x.id !== session.id),
                }))
                .then((ok) => {
                  if (ok) navigation.goBack();
                }),
          )
        }
      />
      <Notice>
        Original curated activities, not coach reviewed. Based on general grassroots
        principles from FIFA Training Centre; instructions and diagrams independently
        authored.
      </Notice>
    </Page>
  );
}
function RosterEditor({ group }: { group: Group }) {
  const { s } = useTheme();
  const store = coachStore.useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Player["role"]>("Midfielder");
  const [ratings, setRatings] = useState(attributes.map(() => ""));
  const [error, setError] = useState("");
  const patch = (change: (g: Group) => Group) =>
    store.update((d) => ({
      ...d,
      groups: d.groups.map((g) => (g.id === group.id ? change(g) : g)),
    }));
  async function save() {
    const p: Player = {
      id: editing || uid(),
      name: name.trim(),
      role,
      ratings: ratings.map(Number),
    };
    if (
      !p.name ||
      p.name.length > 40 ||
      p.ratings.some((n) => !Number.isInteger(n) || n < 1 || n > 10)
    ) {
      setError("Enter an alias and all eight ratings as whole numbers from 1–10.");
      return;
    }
    if (!editing && group.players.length >= 30) {
      setError("A group supports at most 30 aliases.");
      return;
    }
    if (
      await patch((g) => ({
        ...g,
        players: editing
          ? g.players.map((x) => (x.id === editing ? p : x))
          : [...g.players, p],
      }))
    ) {
      setEditing(null);
      setName("");
      setRatings(attributes.map(() => ""));
      setError("");
    }
  }
  return (
    <>
      <Notice>
        Organizer-entered aliases and ratings stay on this device. Ratings are subjective
        1–10 entries, not peer votes or an ability assessment. No real names are required.
      </Notice>
      {group.players.map((p) => (
        <View key={p.id} style={s.card}>
          <Text style={s.h3}>
            {p.name} · {p.role}
          </Text>
          <Text style={s.small}>
            {attributes.map((a, i) => `${a} ${p.ratings[i]}`).join(" · ")}
          </Text>
          <View style={s.stack}>
            <Button
              kind="secondary"
              label={`Edit ${p.name}`}
              onPress={() => {
                setEditing(p.id);
                setName(p.name);
                setRole(p.role);
                setRatings(p.ratings.map(String));
              }}
            />
            <Button
              kind="danger"
              label={`Delete ${p.name}`}
              onPress={() => {
                if (
                  store.data.matches.some(
                    (m) =>
                      m.groupId === group.id &&
                      [...m.teams.a, ...m.teams.b].includes(p.id),
                  )
                ) {
                  setError(
                    "This alias appears in saved matches. Delete those matches first to preserve match history.",
                  );
                  return;
                }
                confirmDelete(
                  `Delete ${p.name}?`,
                  () =>
                    void patch((g) => ({
                      ...g,
                      players: g.players.filter((x) => x.id !== p.id),
                      constraints: g.constraints.filter(
                        (c) => c.a !== p.id && c.b !== p.id,
                      ),
                    })),
                );
              }}
            />
          </View>
        </View>
      ))}
      <Text style={s.h2}>
        {editing ? "Edit player" : "Add player"} · {group.players.length}/30
      </Text>
      <Field label="Player alias" value={name} onChange={setName} maxLength={40} />
      <Choices
        label="Preferred role"
        values={["Keeper", "Defender", "Midfielder", "Forward"]}
        value={role}
        onChange={(v) => setRole(v as Player["role"])}
      />
      {attributes.map((a, i) => (
        <Field
          key={a}
          label={`${a} · 1–10`}
          numeric
          value={ratings[i]}
          maxLength={2}
          onChange={(v) => setRatings(ratings.map((r, j) => (j === i ? v : r)))}
        />
      ))}
      {error ? <Notice>{error}</Notice> : null}
      <Button label={editing ? "Save player" : "Add alias"} onPress={() => void save()} />
      {editing ? (
        <Button
          kind="secondary"
          label="Cancel edit"
          onPress={() => {
            setEditing(null);
            setName("");
            setRatings(attributes.map(() => ""));
          }}
        />
      ) : null}
    </>
  );
}
function PairConstraints({ group }: { group: Group }) {
  const store = coachStore.useStore();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [kind, setKind] = useState<Constraint["kind"]>("Together");
  const [error, setError] = useState("");
  const { s } = useTheme();
  const names = group.players.map((p) => `${p.name} · ${p.id.slice(-4)}`);
  const select = (id: string) => {
    const i = group.players.findIndex((p) => p.id === id);
    return names[i] || "";
  };
  return (
    <>
      <Notice>
        Every rule is mandatory. Rules involving an unavailable player must be removed
        before generating.
      </Notice>
      {group.constraints.map((c, i) => (
        <View key={`${c.a}-${c.b}-${i}`} style={s.stack}>
          <Text style={s.body}>
            {select(c.a)} + {select(c.b)}: {c.kind}
          </Text>
          <Button
            kind="danger"
            label="Remove rule"
            onPress={() =>
              confirmDelete(
                "Remove this rule?",
                () =>
                  void store.update((d) => ({
                    ...d,
                    groups: d.groups.map((g) =>
                      g.id === group.id
                        ? { ...g, constraints: g.constraints.filter((_, j) => j !== i) }
                        : g,
                    ),
                  })),
              )
            }
          />
        </View>
      ))}
      <Choices
        label="First alias"
        values={names}
        value={select(a)}
        onChange={(v) => setA(group.players[names.indexOf(v)].id)}
      />
      <Choices
        label="Second alias"
        values={names}
        value={select(b)}
        onChange={(v) => setB(group.players[names.indexOf(v)].id)}
      />
      <Choices
        label="Rule"
        values={["Together", "Apart"]}
        value={kind}
        onChange={(v) => setKind(v as Constraint["kind"])}
      />
      <Button
        kind="secondary"
        label="Add mandatory rule"
        onPress={() => {
          if (!a || !b || a === b) {
            setError("Choose two different aliases.");
            return;
          }
          if (
            group.constraints.some(
              (c) =>
                ((c.a === a && c.b === b) || (c.a === b && c.b === a)) && c.kind === kind,
            )
          ) {
            setError("That rule already exists.");
            return;
          }
          setError("");
          void store.update((d) => ({
            ...d,
            groups: d.groups.map((g) =>
              g.id === group.id
                ? { ...g, constraints: [...g.constraints, { a, b, kind }] }
                : g,
            ),
          }));
        }}
      />
      {error ? <Notice>{error}</Notice> : null}
    </>
  );
}
function MatchBuilder({
  group,
  onSaved,
}: {
  group: Group;
  onSaved: (id: string) => void;
}) {
  const { s } = useTheme();
  const store = coachStore.useStore();
  const [side, setSide] = useState(5);
  const [formation, setFormation] = useState(formations[5][0]);
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [repeat, setRepeat] = useState<Match["repeat"]>("None");
  const [rsvp, setRsvp] = useState<Record<string, "Yes" | "No" | "Maybe">>({});
  const [options, setOptions] = useState<Teams[]>([]);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function invalidate() {
    setOptions([]);
    setError("");
  }
  const available = group.players.filter((p) => rsvp[p.id] === "Yes");
  async function generate() {
    setError("");
    if (!validateDate(date)) {
      setError("Use a valid date in YYYY-MM-DD format.");
      return;
    }
    setBusy(true);
    setOptions([]);
    setTimeout(() => {
      try {
        setOptions(
          generateTeams(
            available,
            group.constraints,
            store.data.matches.filter((m) => m.groupId === group.id),
            side,
          ),
        );
        setSelected(0);
      } catch (e) {
        setError(message(e));
      } finally {
        setBusy(false);
      }
    }, 30);
  }
  async function save() {
    if (!options[selected]) return;
    if (store.data.matches.length >= 500) {
      setError("Saved match limit reached (500). Delete an old match first.");
      return;
    }
    const match: Match = {
      id: uid(),
      groupId: group.id,
      date,
      side,
      formation,
      rsvp,
      teams: options[selected],
      score: null,
      goals: {},
      saves: {},
      mvp: null,
      repeat,
    };
    if (await store.update((d) => ({ ...d, matches: [match, ...d.matches] })))
      onSaved(match.id);
    else setError("The match could not be saved.");
  }
  return (
    <>
      <Field
        label="Match date · YYYY-MM-DD"
        value={date}
        maxLength={10}
        onChange={(v) => {
          setDate(v);
          invalidate();
        }}
      />
      <Choices
        label="Format · players on each side including keeper"
        values={["5", "6", "7", "8", "11"]}
        value={String(side)}
        onChange={(v) => {
          setSide(Number(v));
          setFormation(formations[Number(v)][0]);
          invalidate();
        }}
      />
      <Choices
        label="Outfield formation · plus one keeper"
        values={formations[side]}
        value={formation}
        onChange={(v) => {
          setFormation(v);
          invalidate();
        }}
      />
      <Choices
        label="Repeat schedule"
        values={["None", "Weekly", "Fortnightly"]}
        value={repeat}
        onChange={(v) => setRepeat(v as Match["repeat"])}
      />
      <Text style={s.h2}>
        Attendance · {available.length}/{side * 2} confirmed
      </Text>
      <Notice>
        Manually record responses you received. This does not send invitations. Select
        exactly {side * 2} confirmed players; leave substitutes as Maybe.
      </Notice>
      {group.players.length === 0 ? (
        <Notice>Add player aliases in the roster first.</Notice>
      ) : (
        group.players.map((p) => (
          <Choices
            key={p.id}
            label={p.name}
            values={["Yes", "Maybe", "No"]}
            value={rsvp[p.id] || "Maybe"}
            onChange={(v) => {
              setRsvp({ ...rsvp, [p.id]: v as "Yes" | "No" | "Maybe" });
              invalidate();
            }}
          />
        ))
      )}
      <Button
        label={busy ? "Balancing…" : "Generate up to 5 balanced options"}
        disabled={busy || available.length !== side * 2}
        onPress={() => void generate()}
      />
      {options.length > 0 ? (
        <>
          <Choices
            label="Valid options · smallest balance difference first"
            values={options.map((_, i) => `Option ${i + 1}`)}
            value={`Option ${selected + 1}`}
            onChange={(v) => setSelected(Number(v.split(" ")[1]) - 1)}
          />
          <TeamPreview group={group} teams={options[selected]} formation={formation} />
          <Button label="Save match & lineup" onPress={() => void save()} />
        </>
      ) : null}
      {error ? <Notice>{error}</Notice> : null}
    </>
  );
}
function TeamPreview({
  group,
  teams,
  formation,
}: {
  group: Group;
  teams: Teams;
  formation?: string;
}) {
  const { s } = useTheme();
  return (
    <View style={s.stack}>
      <Text style={s.h3}>Balance difference · {teams.difference.toFixed(2)}</Text>
      <Notice>
        Lower is closer across average attributes and preferred-role counts. Keeper
        assignments rotate by fewest saved assignments, then Keeping rating.
      </Notice>
      {[teams.a, teams.b].map((ids, side) => (
        <View key={side} style={s.card}>
          <Text style={s.h2}>Side {side === 0 ? "A" : "B"}</Text>
          {formation
            ? formationLines(ids, teams.keepers[side], group.players, formation).map(
                (line, i) => (
                  <Text key={i} style={s.body}>
                    {line.role}:{" "}
                    {line.players
                      .map((id) => group.players.find((p) => p.id === id)?.name)
                      .join(", ")}
                  </Text>
                ),
              )
            : ids.map((id) => (
                <Text key={id} style={s.body}>
                  {group.players.find((p) => p.id === id)?.name}
                  {teams.keepers[side] === id ? " · Keeper" : ""}
                </Text>
              ))}
        </View>
      ))}
    </View>
  );
}
function MatchDetail({ group, match }: { group: Group; match: Match }) {
  const store = coachStore.useStore();
  const { s } = useTheme();
  const [x, setX] = useState("");
  const [y, setY] = useState("");
  const [scoreA, setScoreA] = useState(match.score ? String(match.score[0]) : "");
  const [scoreB, setScoreB] = useState(match.score ? String(match.score[1]) : "");
  const [goals, setGoals] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(match.goals).map(([k, v]) => [k, String(v)])),
  );
  const [saves, setSaves] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(match.saves).map(([k, v]) => [k, String(v)])),
  );
  const [mvp, setMvp] = useState(match.mvp || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (change: (m: Match) => Match) =>
    store.update((d) => ({
      ...d,
      matches: d.matches.map((m) => (m.id === match.id ? change(m) : m)),
    }));
  const names = (ids: string[]) =>
    ids.map((id) => group.players.find((p) => p.id === id)?.name + " · " + id.slice(-4));
  const find = (ids: string[], name: string) => ids[names(ids).indexOf(name)];
  const playerIds = [...match.teams.a, ...match.teams.b];
  async function saveResult() {
    const score: [number, number] = [Number(scoreA), Number(scoreB)];
    if (
      !scoreA.trim() ||
      !scoreB.trim() ||
      score.some((n) => !Number.isInteger(n) || n < 0 || n > 99)
    ) {
      setError("Enter both scores as whole numbers from 0–99.");
      return;
    }
    const g = Object.fromEntries(playerIds.map((id) => [id, Number(goals[id] || 0)])),
      sv = Object.fromEntries(playerIds.map((id) => [id, Number(saves[id] || 0)]));
    if (
      [...Object.values(g), ...Object.values(sv)].some(
        (n) => !Number.isInteger(n) || n < 0 || n > 99,
      )
    ) {
      setError("Goals and saves must be whole numbers from 0–99.");
      return;
    }
    if (
      match.teams.a.reduce((n, id) => n + g[id], 0) > score[0] ||
      match.teams.b.reduce((n, id) => n + g[id], 0) > score[1]
    ) {
      setError(
        "Player goals cannot exceed their side’s total score. Unassigned goals can represent own goals or unknown scorers.",
      );
      return;
    }
    if (await update((m) => ({ ...m, score, goals: g, saves: sv, mvp: mvp || null })))
      setError("Result saved. Career cards now include this match.");
  }
  async function next() {
    const date = new Date(match.date + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + (match.repeat === "Weekly" ? 7 : 14));
    const value = date.toISOString().slice(0, 10);
    if (store.data.matches.some((m) => m.groupId === group.id && m.date === value)) {
      setError("A match already exists on the next scheduled date.");
      return;
    }
    if (store.data.matches.length >= 500) {
      setError("Saved match limit reached.");
      return;
    }
    const fresh = {
      ...match,
      id: uid(),
      date: value,
      score: null,
      goals: {},
      saves: {},
      mvp: null,
      teams: { ...match.teams, keepers: [...match.teams.keepers] as [string, string] },
    };
    const all = store.data.matches.filter((m) => m.groupId === group.id);
    const players = group.players.filter((p) => playerIds.includes(p.id));
    try {
      fresh.teams = generateTeams(players, group.constraints, all, match.side)[0];
      if (await store.update((d) => ({ ...d, matches: [fresh, ...d.matches] })))
        setError(
          `Next match saved for ${value}. Attendance copied; confirm with players before playing.`,
        );
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <View style={s.stack}>
      <Text style={s.h2}>
        {match.date} · {match.side} a side
      </Text>
      <Notice>
        {match.formation} plus keeper ·{" "}
        {match.score
          ? `Final ${match.score[0]}–${match.score[1]}`
          : "Scheduled · result not recorded"}
      </Notice>
      <TeamPreview group={group} teams={match.teams} formation={match.formation} />
      <Fold title="Swap players">
        <Choices
          label="Side A player"
          values={names(match.teams.a)}
          value={x ? names([x])[0] : ""}
          onChange={(v) => setX(find(match.teams.a, v))}
        />
        <Choices
          label="Side B player"
          values={names(match.teams.b)}
          value={y ? names([y])[0] : ""}
          onChange={(v) => setY(find(match.teams.b, v))}
        />
        <Button
          kind="secondary"
          label="Swap & recalculate"
          disabled={!!match.score}
          onPress={() => {
            try {
              const teams = swapTeams(
                match.teams,
                x,
                y,
                group,
                store.data.matches.filter(
                  (m) => m.groupId === group.id && m.id !== match.id,
                ),
              );
              void update((m) => ({ ...m, teams }));
              setX("");
              setY("");
              setError("");
            } catch (e) {
              setError(message(e));
            }
          }}
        />
        {match.score ? (
          <Notice>Recorded results lock the lineup to preserve career records.</Notice>
        ) : null}
      </Fold>
      <Fold title="Record / edit result">
        <Field
          label="Side A score"
          numeric
          value={scoreA}
          onChange={setScoreA}
          maxLength={2}
        />
        <Field
          label="Side B score"
          numeric
          value={scoreB}
          onChange={setScoreB}
          maxLength={2}
        />
        {playerIds.map((id) => (
          <View key={id} style={s.stack}>
            <Text style={s.h3}>{group.players.find((p) => p.id === id)?.name}</Text>
            <Field
              label={`Goals · ${group.players.find((p) => p.id === id)?.name}`}
              numeric
              value={goals[id] || ""}
              maxLength={2}
              onChange={(v) => setGoals({ ...goals, [id]: v })}
            />
            <Field
              label={`Saves · ${group.players.find((p) => p.id === id)?.name}`}
              numeric
              value={saves[id] || ""}
              maxLength={2}
              onChange={(v) => setSaves({ ...saves, [id]: v })}
            />
          </View>
        ))}
        <Choices
          label="Organizer MVP · optional"
          values={["None", ...names(playerIds)]}
          value={mvp ? names([mvp])[0] : "None"}
          onChange={(v) => setMvp(v === "None" ? "" : find(playerIds, v))}
        />
        <Button label="Save result" onPress={() => void saveResult()} />
      </Fold>
      <Button
        kind="secondary"
        disabled={busy}
        label={
          busy
            ? "Preparing…"
            : Platform.OS === "web"
              ? "Print lineup / save PDF"
              : "Share lineup PDF"
        }
        onPress={() => {
          setBusy(true);
          void sharePDF(lineupHTML(group, match))
            .catch((e) => setError(message(e)))
            .finally(() => setBusy(false));
        }}
      />
      <Button
        kind="secondary"
        disabled={busy}
        label="Share lineup image · SVG"
        onPress={() => {
          setBusy(true);
          void shareLineupImage(lineupSVG(group, match))
            .catch((e) => setError(message(e)))
            .finally(() => setBusy(false));
        }}
      />
      {match.repeat !== "None" ? (
        <Button
          kind="secondary"
          label={`Create next ${match.repeat.toLowerCase()} match`}
          onPress={() => void next()}
        />
      ) : null}
      <Button
        kind="danger"
        label="Delete match"
        onPress={() =>
          confirmDelete(
            "Delete match and its career records?",
            () =>
              void store.update((d) => ({
                ...d,
                matches: d.matches.filter((m) => m.id !== match.id),
              })),
          )
        }
      />
      {error ? <Notice>{error}</Notice> : null}
    </View>
  );
}
function Standings({ group }: { group: Group }) {
  const { s } = useTheme();
  const store = coachStore.useStore();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const matches = store.data.matches.filter((m) => m.groupId === group.id);
  const ranked = group.players
    .map((p) => ({ p, stats: playerStats(p.id, matches) }))
    .sort(
      (x, y) =>
        y.stats.points - x.stats.points ||
        y.stats.wins - x.stats.wins ||
        x.p.name.localeCompare(y.p.name),
    );
  const together = matches.filter(
    (m) =>
      m.score &&
      ((m.teams.a.includes(a) && m.teams.a.includes(b)) ||
        (m.teams.b.includes(a) && m.teams.b.includes(b))),
  );
  const opposed = matches.filter(
    (m) =>
      m.score &&
      ((m.teams.a.includes(a) && m.teams.b.includes(b)) ||
        (m.teams.b.includes(a) && m.teams.a.includes(b))),
  );
  return (
    <>
      <Notice>
        Local results only. Standings award 3 points per win and 1 per draw; manually
        entered ratings do not affect career totals.
      </Notice>
      {ranked.map(({ p, stats }, i) => (
        <View key={p.id} style={s.card}>
          <Text style={s.h3}>
            {i + 1}. {p.name} · {stats.points} pts
          </Text>
          <Text style={s.body}>
            {stats.played} played · {stats.wins} wins · {stats.draws} draws
          </Text>
          <Text style={s.small}>
            {stats.goals} goals · {stats.saves} saves · {stats.mvp} MVP
          </Text>
        </View>
      ))}
      <Fold title="Compare teammates & opponents">
        <Choices
          label="First player"
          values={group.players.map((p) => p.name + " · " + p.id.slice(-4))}
          value={group.players.find((p) => p.id === a)?.name + " · " + a.slice(-4)}
          onChange={(v) =>
            setA(group.players.find((p) => v === p.name + " · " + p.id.slice(-4))!.id)
          }
        />
        <Choices
          label="Second player"
          values={group.players
            .filter((p) => p.id !== a)
            .map((p) => p.name + " · " + p.id.slice(-4))}
          value={group.players.find((p) => p.id === b)?.name + " · " + b.slice(-4)}
          onChange={(v) =>
            setB(group.players.find((p) => v === p.name + " · " + p.id.slice(-4))!.id)
          }
        />
        {a ? (
          <>
            <Text style={s.h3}>Best teammates · shared wins</Text>
            {relationshipSummary(a, group, matches)
              .filter((r) => r.together > 0)
              .sort((x, y) => y.sharedWins - x.sharedWins || y.together - x.together)
              .slice(0, 3)
              .map((r) => (
                <Text key={r.id} style={s.body}>
                  {r.name}: {r.sharedWins} shared wins / {r.together} together
                </Text>
              ))}
            <Text style={s.h3}>Frequent nemeses · losses against</Text>
            {relationshipSummary(a, group, matches)
              .filter((r) => r.opposed > 0)
              .sort((x, y) => y.lossesAgainst - x.lossesAgainst || y.opposed - x.opposed)
              .slice(0, 3)
              .map((r) => (
                <Text key={r.id} style={s.body}>
                  {r.name}: {r.lossesAgainst} losses / {r.opposed} opposed
                </Text>
              ))}
          </>
        ) : null}
        {a && b && a !== b ? (
          <Notice>
            {together.length} matches as teammates · {opposed.length} as opponents.{" "}
            {together.length
              ? `${
                  together.filter((m) => {
                    const side = m.teams.a.includes(a) ? 0 : 1;
                    return m.score![side] > m.score![1 - side];
                  }).length
                } shared wins.`
              : "Record shared matches to build a comparison."}
          </Notice>
        ) : null}
      </Fold>
    </>
  );
}
export function TeamWorkspace() {
  const store = coachStore.useStore();
  const { s } = useTheme();
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [section, setSection] = useState("Roster");
  const [matchId, setMatchId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const group = store.data.groups.find((g) => g.id === groupId);
  const match = store.data.matches.find((m) => m.id === matchId && m.groupId === groupId);
  async function add() {
    if (!name.trim()) {
      setError("Enter a group name.");
      return;
    }
    if (store.data.groups.length >= 20) {
      setError("Group limit reached (20). Delete an unused group first.");
      return;
    }
    const g: Group = { id: uid(), name: name.trim(), players: [], constraints: [] };
    if (await store.update((d) => ({ ...d, groups: [...d.groups, g] }))) {
      setGroupId(g.id);
      setName("");
      setSection("Roster");
      setError("");
    }
  }
  return (
    <Page>
      <Title
        title="Teams & matches"
        body="An offline organizer notebook. Aliases, attendance and results stay on this device."
      />
      <StoreStatus />
      {group ? (
        <>
          <Button
            kind="secondary"
            label="‹ All groups"
            onPress={() => {
              setGroupId("");
              setMatchId("");
            }}
          />
          <Text style={s.h2}>{group.name}</Text>
          <Choices
            label="Workspace"
            values={["Roster", "Rules", "New match", "Matches", "Career"]}
            value={section}
            onChange={(v) => {
              setSection(v);
              setMatchId("");
            }}
          />
          {section === "Roster" ? (
            <RosterEditor key={group.id} group={group} />
          ) : section === "Rules" ? (
            <PairConstraints key={group.id} group={group} />
          ) : section === "New match" ? (
            <MatchBuilder
              key={group.id}
              group={group}
              onSaved={(id) => {
                setMatchId(id);
                setSection("Matches");
              }}
            />
          ) : section === "Career" ? (
            <Standings group={group} />
          ) : match ? (
            <>
              <Button
                kind="secondary"
                label="‹ Match list"
                onPress={() => setMatchId("")}
              />
              <MatchDetail key={match.id} group={group} match={match} />
            </>
          ) : (
            <>
              {store.data.matches.filter((m) => m.groupId === group.id).length === 0 ? (
                <Notice>
                  Save a balanced lineup in New match to start the match history.
                </Notice>
              ) : (
                store.data.matches
                  .filter((m) => m.groupId === group.id)
                  .map((m) => (
                    <Button
                      key={m.id}
                      kind="secondary"
                      label={`${m.date} · ${m.side} a side · ${m.score ? m.score.join("–") : "Scheduled"}`}
                      onPress={() => setMatchId(m.id)}
                    />
                  ))
              )}
            </>
          )}
          <Fold title="Export & group management">
            <Button
              kind="secondary"
              disabled={busy}
              label={busy ? "Preparing…" : "Export player career CSV · Excel compatible"}
              onPress={() => {
                setBusy(true);
                void shareCSV(groupCSV(group, store.data.matches))
                  .catch((e) => setError(message(e)))
                  .finally(() => setBusy(false));
              }}
            />
            <Button
              kind="danger"
              label="Delete group & all its matches"
              onPress={() =>
                confirmDelete(
                  "Delete this group, aliases and matches?",
                  () =>
                    void store
                      .update((d) => ({
                        ...d,
                        groups: d.groups.filter((g) => g.id !== group.id),
                        matches: d.matches.filter((m) => m.groupId !== group.id),
                      }))
                      .then((ok) => {
                        if (ok) setGroupId("");
                      }),
                )
              }
            />
          </Fold>
        </>
      ) : (
        <>
          {store.data.groups.map((g) => (
            <Button
              key={g.id}
              kind="secondary"
              label={`${g.name} · ${g.players.length} aliases`}
              onPress={() => {
                setGroupId(g.id);
                setSection("Roster");
              }}
            />
          ))}
          <Field label="New local group name" value={name} onChange={setName} />
          <Button
            label="Create local group"
            disabled={!store.ready}
            onPress={() => void add()}
          />
          <Notice>
            No shared join codes, messages or online invitations are created here. Use
            your own communication channel to collect attendance.
          </Notice>
        </>
      )}
      {error ? <Notice>{error}</Notice> : null}
    </Page>
  );
}
