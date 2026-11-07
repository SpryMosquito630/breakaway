import { BarcodeScanner } from "../athlete/BarcodeScanner";
import { parseFoodEstimate } from "../athlete/aiFood";
import { discoverService, estimateFoodPhoto } from "../coachAi/service";
import { confirmAthlete } from "../athlete/confirm";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Linking, Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import Svg, { Polyline } from "react-native-svg";
import { Button, Page, SettingRow, Title } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import {
  Activity,
  Apple,
  Brain,
  ChevronLeft,
  Dumbbell,
  Flag,
  MapPin,
} from "lucide-react-native";
import { athleteStore } from "../athlete/store";
import {
  clock,
  id,
  number,
  pace,
  routines,
  seasonStats,
  today,
  validDate,
  Point,
  Meal,
} from "../athlete/domain";
import { lookupFood, Food } from "../athlete/food";
import { openPhoto, releasePhoto, removePhoto, savePhoto } from "../athlete/photos";
import { athleteEpoch } from "../athlete/lifecycle";
import { useKeepTimerAwake, useTimerFeedback } from "../hooks/useTimerFeedback";
import { registerFeatureReset } from "../features/localStore";
import { useRun } from "../athlete/useRun";
export type AthleteSection = "fitness" | "runs" | "fuel" | "recovery" | "matches";
type Back = {
  onBack?: () => void;
};
function Header({
  title,
  body,
  onBack,
}: {
  title: string;
  body?: string;
} & Back) {
  return (
    <View style={{ gap: 8 }}>
      {onBack ? (
        <Button
          label="Back to toolkit"
          kind="secondary"
          onPress={onBack}
          icon={ChevronLeft}
        />
      ) : null}
      <Title title={title} body={body} />
    </View>
  );
}
function Field({
  label,
  value,
  set,
  numeric = false,
  disabled = false,
}: {
  label: string;
  value: string;
  set: (s: string) => void;
  numeric?: boolean;
  disabled?: boolean;
}) {
  const { s, C } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.h3}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={!disabled}
        value={value}
        onChangeText={set}
        keyboardType={numeric ? "decimal-pad" : "default"}
        placeholderTextColor={C.muted}
        style={s.input}
      />
    </View>
  );
}
function Notice({ message }: { message?: string | null }) {
  const { s } = useTheme();
  return message ? (
    <Text accessibilityLiveRegion="polite" style={s.body}>
      {message}
    </Text>
  ) : null;
}
function StorageStatus() {
  const store = athleteStore.useStore();
  return (
    <>
      {!store.ready ? <Notice message="Loading your local notebook…" /> : null}
      {store.error ? (
        <>
          <Notice message={store.error} />
          <Button
            label="Retry local storage"
            kind="secondary"
            onPress={() => void store.retry()}
          />
        </>
      ) : null}
    </>
  );
}
export function AthleteHubScreen({ onOpen }: { onOpen: (s: AthleteSection) => void }) {
  const { s } = useTheme();
  return (
    <Page>
      <Title title="Athlete toolkit" body="Your training, match and recovery notebook." />
      <View style={s.group}>
        {(
          [
            {
              key: "fitness",
              label: "Fitness & mobility",
              value: "Guided routines · personal bests",
              icon: Dumbbell,
            },
            {
              key: "runs",
              label: "Run tracker",
              value: "Foreground GPS · saved routes",
              icon: MapPin,
            },
            {
              key: "fuel",
              label: "Food & fueling",
              value: "Meals · label lookup · photos",
              icon: Apple,
            },
            {
              key: "recovery",
              label: "Recovery & mindset",
              value: "Water · sleep · breathing",
              icon: Brain,
            },
            {
              key: "matches",
              label: "Match notebook",
              value: "Match logs · season totals",
              icon: Flag,
            },
          ] as const
        ).map((row) => (
          <SettingRow
            key={row.key}
            label={row.label}
            value={row.value}
            icon={row.icon}
            onPress={() => onOpen(row.key)}
          />
        ))}
      </View>
      <Text style={s.small}>
        Location stays on this device. Meal photos leave it only when you explicitly
        request an AI estimate.
      </Text>
      <StorageStatus />
    </Page>
  );
}
function useCountdown() {
  const feedback = useTimerFeedback();
  const [remaining, setRemaining] = useState(0),
    [running, setRunning] = useState(false);
  const deadline = useRef(0),
    awakeTag = useRef(`athlete-countdown-${Math.random()}`);
  useKeepTimerAwake(running, awakeTag.current);
  useEffect(
    () =>
      registerFeatureReset(`athlete-timer-${Math.random()}`, async () => {
        setRunning(false);
        setRemaining(0);
      }),
    [],
  );
  const pause = () => {
    setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    setRunning(false);
  };
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const n = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(n);
      if (!n) {
        setRunning(false);
        feedback("finish");
      }
    }, 200);
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") pause();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [running, feedback]);
  return {
    remaining,
    running,
    start: (n: number) => {
      deadline.current = Date.now() + n * 1000;
      setRemaining(n);
      setRunning(true);
    },
    pause,
    reset: () => {
      setRunning(false);
      setRemaining(0);
    },
  };
}
export function AthleteFitnessScreen({ onBack }: Back) {
  const { s } = useTheme(),
    store = athleteStore.useStore(),
    timer = useCountdown(),
    rest = useCountdown();
  const [selected, setSelected] = useState(0),
    [step, setStep] = useState(0),
    [exercise, setExercise] = useState(""),
    [value, setValue] = useState(""),
    [unit, setUnit] = useState("reps"),
    [message, setMessage] = useState("");
  const routine = routines[selected],
    item = routine.steps[step];
  const [active, setActive] = useState(false);
  async function next() {
    timer.reset();
    setActive(false);
    if (step < routine.steps.length - 1) setStep(step + 1);
    else if (
      await store.update((d) => ({
        ...d,
        routines: [...d.routines, { id: id(), date: today(), name: routine.name }].slice(
          -1000,
        ),
      }))
    ) {
      setStep(0);
      setMessage("Routine completed and saved.");
    }
  }
  async function saveBest() {
    const n = number(value, 100000);
    if (
      !exercise.trim() ||
      exercise.trim().length > 120 ||
      !unit.trim() ||
      unit.length > 20 ||
      !Number.isFinite(n)
    ) {
      setMessage("Enter an exercise, a valid result and a unit.");
      return;
    }
    if (
      await store.update((d) => ({
        ...d,
        bests: [
          ...d.bests,
          {
            id: id(),
            date: today(),
            exercise: exercise.trim(),
            value: n!,
            unit: unit.trim(),
          },
        ].slice(-1000),
      }))
    ) {
      setExercise("");
      setValue("");
      setMessage("Personal result saved.");
    }
  }
  return (
    <Page>
      <Header
        title="Fitness & mobility"
        body="Move at your own pace. Stop if you feel pain."
        onBack={onBack}
      />
      <StorageStatus />
      {routines.map((r, i) => (
        <Button
          key={r.name}
          label={r.name}
          kind={selected === i ? "primary" : "secondary"}
          onPress={() => {
            timer.reset();
            setSelected(i);
            setStep(0);
            setActive(false);
          }}
        />
      ))}
      <View style={s.card}>
        <Text style={s.small}>
          Step {step + 1} of {routine.steps.length}
        </Text>
        <Text style={s.h2}>{item.name}</Text>
        <Text style={s.body}>{item.cue}</Text>
        <Text style={s.stat}>{clock(active ? timer.remaining : item.seconds)}</Text>
        {active && timer.remaining === 0 && !timer.running ? (
          <Text accessibilityLiveRegion="polite" style={s.h3}>
            Step complete
          </Text>
        ) : null}
        {timer.running ? (
          <Button label="Pause timer" kind="secondary" onPress={timer.pause} />
        ) : (
          <Button
            label={active && timer.remaining ? "Resume step" : "Start step"}
            onPress={() => {
              timer.start(active && timer.remaining ? timer.remaining : item.seconds);
              setActive(true);
            }}
          />
        )}
        {active && timer.remaining === 0 && !timer.running ? (
          <Button
            label={step === routine.steps.length - 1 ? "Finish routine" : "Next step"}
            onPress={() => void next()}
            disabled={!store.ready}
          />
        ) : null}
        <Button
          label="Reset step"
          kind="secondary"
          onPress={() => {
            timer.reset();
            setActive(false);
          }}
        />
      </View>
      <Text style={s.h2}>Rest timer</Text>
      <Text style={s.stat}>{clock(rest.remaining)}</Text>
      {rest.running ? (
        <Button label="Pause rest" kind="secondary" onPress={rest.pause} />
      ) : (
        <Button
          label={rest.remaining ? "Resume rest" : "Start 60-second rest"}
          kind="secondary"
          onPress={() => rest.start(rest.remaining || 60)}
        />
      )}
      <Text style={s.h2}>Record a personal result</Text>
      <Field label="Exercise" value={exercise} set={setExercise} />
      <Field label="Result" value={value} set={setValue} numeric />
      <Field label="Unit (reps, kg or seconds)" value={unit} set={setUnit} />
      <Button
        label="Save result"
        onPress={() => void saveBest()}
        disabled={!store.ready}
      />
      <Notice message={message} />
      {store.data.bests
        .slice(-15)
        .reverse()
        .map((b) => (
          <Text key={b.id} style={s.body}>
            {b.date} · {b.exercise}: {b.value} {b.unit}
          </Text>
        ))}
    </Page>
  );
}
function RoutePreview({ points }: { points: Point[] }) {
  const { C, s } = useTheme();
  if (points.length < 2)
    return <Text style={s.small}>Your route appears after two usable GPS samples.</Text>;
  const lat = points.map((p) => p.latitude),
    lng = points.map((p) => p.longitude),
    minX = Math.min(...lng),
    minY = Math.min(...lat);
  const cos = Math.max(0.01, Math.cos((points[0].latitude * Math.PI) / 180));
  const dx = (Math.max(...lng) - minX) * cos,
    dy = Math.max(...lat) - minY;
  const scale = 260 / Math.max(dx, dy, 0.00001);
  const segments = [...new Set(points.map((p) => p.segment))];
  return (
    <View
      accessibilityLabel="Recorded route preview"
      style={{ backgroundColor: C.soft, borderRadius: 12 }}
    >
      <Svg width="100%" height={200} viewBox="0 0 300 300">
        {segments.map((seg) => (
          <Polyline
            key={seg}
            points={points
              .filter((p) => p.segment === seg)
              .map(
                (p) =>
                  `${20 + (p.longitude - minX) * cos * scale},${280 - (p.latitude - minY) * scale}`,
              )
              .join(" ")}
            fill="none"
            stroke={C.green}
            strokeWidth={4}
          />
        ))}
      </Svg>
    </View>
  );
}
export function AthleteRunsScreen({ onBack }: Back) {
  const { s } = useTheme(),
    run = useRun();
  return (
    <Page>
      <Header
        title="Run tracker"
        body="GPS tracks your movement while this screen is open. Backgrounding or leaving pauses recording."
        onBack={onBack}
      />
      <StorageStatus />
      <Text style={s.stat}>{clock(run.seconds)}</Text>
      <Text style={s.h2}>
        {(run.meters / 1000).toFixed(2)} km · {pace(run.meters, run.seconds)}
      </Text>
      <Notice message={run.message} />
      <RoutePreview points={run.points} />
      {run.status === "running" ? (
        <Button label="Pause run" onPress={() => run.pause()} />
      ) : (
        <Button
          label={run.status === "paused" ? "Resume run" : "Start run"}
          onPress={() => void run.start()}
          disabled={!run.store.ready || run.status === "starting"}
        />
      )}
      <Button
        label="Save run"
        kind="secondary"
        onPress={() => void run.save()}
        disabled={run.status === "starting" || run.seconds === 0}
      />
      <Button
        label="Discard current run"
        kind="secondary"
        onPress={() =>
          confirmAthlete(
            "Discard this run?",
            "The unsaved time and route will be removed.",
            run.discard,
          )
        }
        disabled={!run.seconds && !run.points.length}
      />
      <Text style={s.h2}>Saved runs</Text>
      {run.store.data.runs.length === 0 ? (
        <Text style={s.body}>
          Start outdoors with a clear GPS signal. A saved run stays in your local
          notebook.
        </Text>
      ) : null}
      {run.store.data.runs
        .slice(-10)
        .reverse()
        .map((r) => (
          <View key={r.id} style={s.card}>
            <Text style={s.h3}>
              {r.date} · {(r.meters / 1000).toFixed(2)} km
            </Text>
            <Text style={s.body}>
              {clock(r.seconds)} · {pace(r.meters, r.seconds)}
            </Text>
            <RoutePreview points={r.points} />
            <Button
              label="Delete run"
              kind="secondary"
              onPress={() =>
                confirmAthlete(
                  "Delete this run?",
                  "The saved route and time will be permanently removed.",
                  () => {
                    void run.store.update((d) => ({
                      ...d,
                      runs: d.runs.filter((x) => x.id !== r.id),
                    }));
                  },
                )
              }
            />
          </View>
        ))}
    </Page>
  );
}
function MealPhoto({ photo }: { photo: string }) {
  const [uri, setUri] = useState("");
  useEffect(() => {
    let live = true,
      current = "";
    void openPhoto(photo)
      .then((value) => {
        current = value;
        if (live) setUri(value);
        else releasePhoto(value);
      })
      .catch(() => {});
    return () => {
      live = false;
      if (current) releasePhoto(current);
    };
  }, [photo]);
  return uri ? (
    <Image
      source={{ uri }}
      contentFit="cover"
      style={{ width: "100%", height: 180, borderRadius: 12 }}
      accessibilityLabel="Saved meal photo"
    />
  ) : null;
}
export function AthleteFuelScreen({ onBack }: Back) {
  const { s } = useTheme(),
    store = athleteStore.useStore();
  const [date, setDate] = useState(today()),
    [name, setName] = useState(""),
    [calories, setCalories] = useState(""),
    [protein, setProtein] = useState(""),
    [carbs, setCarbs] = useState(""),
    [fat, setFat] = useState(""),
    [barcode, setBarcode] = useState(""),
    [grams, setGrams] = useState("100"),
    [food, setFood] = useState<Food | null>(null),
    [editing, setEditing] = useState<Meal | null>(null),
    [photo, setPhoto] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [showNutrition, setShowNutrition] = useState(false),
    [aiAvailable, setAiAvailable] = useState(false),
    [aiGrams, setAiGrams] = useState(""),
    [aiEstimated, setAiEstimated] = useState(false),
    [estimateNotes, setEstimateNotes] = useState<string[]>([]);
  const selectedAsset = useRef<ImagePicker.ImagePickerAsset | null>(null),
    mounted = useRef(true);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    const discovery = new AbortController();
    const timeout = setTimeout(() => discovery.abort(), 8000);
    void discoverService(discovery.signal)
      .then((service) => {
        if (mounted.current) setAiAvailable(service?.aiAvailable === true);
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
    const unregister = registerFeatureReset("athlete-food-form", async () => {
      abort.current?.abort();
      setPhoto("");
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setAiGrams("");
      setMessage("");
      setFood(null);
      setEditing(null);
      setAiEstimated(false);
      setEstimateNotes([]);
      setBusy(false);
      selectedAsset.current = null;
    });
    return () => {
      mounted.current = false;
      abort.current?.abort();
      discovery.abort();
      clearTimeout(timeout);
      unregister();
    };
  }, []);
  function current(epoch: number) {
    return mounted.current && epoch === athleteEpoch();
  }

  function applyFood(f: Food, portion: string) {
    const g = number(portion, 5000);
    if (!g) {
      setMessage("Enter a portion between 1 and 5000 grams.");
      return;
    }
    const v = (n?: number) =>
      n === undefined ? "" : String(Math.round(((n * g) / 100) * 10) / 10);
    setName(f.name);
    setCalories(v(f.calories));
    setProtein(v(f.protein));
    setCarbs(v(f.carbs));
    setFat(v(f.fat));
    setShowNutrition(true);
  }
  async function lookup(scanned?: string) {
    const epoch = athleteEpoch();
    setBusy(true);
    setMessage("");
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const result = await lookupFood((scanned ?? barcode).trim(), controller.signal);
      if (!current(epoch) || controller.signal.aborted) return;
      setFood(result);
      setAiEstimated(false);
      setEstimateNotes([]);
      applyFood(result, grams);
      setMessage(
        "Label estimates from Open Food Facts per your portion. Check the package and edit any value.",
      );
    } catch (e) {
      if (!current(epoch)) return;
      setMessage(
        e instanceof Error && e.name !== "AbortError"
          ? e.message
          : "Lookup timed out. Try again or enter the label manually.",
      );
    } finally {
      clearTimeout(timeout);
      if (current(epoch)) setBusy(false);
    }
  }
  async function attach() {
    const epoch = athleteEpoch();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      });
      if (!result.canceled && current(epoch)) {
        selectedAsset.current = result.assets[0];
        setAiEstimated(false);
        setEstimateNotes([]);
        setPhoto(result.assets[0].uri);
        setMessage("Photo selected. It is saved only when you save this meal.");
      }
    } catch {
      if (current(epoch)) setMessage("The photo picker could not open. Try again.");
    }
  }
  async function estimate() {
    if (!aiAvailable || busy || (!photo && !editing?.photo)) return;
    const epoch = athleteEpoch(),
      controller = new AbortController();
    abort.current?.abort();
    abort.current = controller;
    let temporary = "";
    setBusy(true);
    setMessage("Estimating the attached photo…");
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      let asset = selectedAsset.current;
      if (!asset) {
        temporary = await openPhoto(editing!.photo!);
        asset = { uri: temporary, width: 1, height: 1, mimeType: "image/jpeg" };
      }
      if (!current(epoch) || controller.signal.aborted) return;
      const portion = number(aiGrams, 5000, true);
      if (portion !== undefined && (!Number.isFinite(portion) || portion <= 0))
        throw new Error("Enter a portion between 1 and 5000 grams, or leave it blank.");
      const result = parseFoodEstimate(
        await estimateFoodPhoto(asset, portion, controller.signal),
      );
      if (!current(epoch) || controller.signal.aborted) return;
      const value = (n?: number) => (n === undefined ? "" : String(n));
      setName(result.name);
      setCalories(value(result.calories));
      setProtein(value(result.protein));
      setCarbs(value(result.carbs));
      setFat(value(result.fat));
      setFood(null);
      setAiEstimated(true);
      setEstimateNotes(result.notes);
      setShowNutrition(true);
      setMessage(
        "AI photo estimate. Ingredients and portions may be wrong. Check every value and edit before saving.",
      );
    } catch (error) {
      if (current(epoch))
        setMessage(
          error instanceof Error && error.name !== "AbortError"
            ? error.message
            : "The estimate was cancelled or timed out. Your manual meal is still available.",
        );
    } finally {
      clearTimeout(timeout);
      if (temporary) releasePhoto(temporary);
      if (current(epoch)) setBusy(false);
    }
  }
  async function save() {
    const values = [
      number(calories, 10000, true),
      number(protein, 10000, true),
      number(carbs, 10000, true),
      number(fat, 10000, true),
    ];
    if (
      !validDate(date) ||
      !name.trim() ||
      name.trim().length > 120 ||
      values.some((v) => v !== undefined && !Number.isFinite(v))
    ) {
      setMessage(
        "Enter a valid date and meal name. Optional nutrition values must be between 0 and 10000.",
      );
      return;
    }
    setBusy(true);
    const key = photo ? id() : (editing?.id ?? id()),
      epoch = athleteEpoch();
    try {
      if (
        photo &&
        !editing?.photo &&
        store.data.meals.filter((m) => m.photo).length >= 30
      )
        throw new Error(
          "Your notebook holds 30 meal photos. Delete an older photo meal first.",
        );
      if (photo) await savePhoto(key, photo);
      if (!current(epoch)) {
        if (photo) await removePhoto(key);
        return;
      }
      const meal: Meal = {
        id: key,
        date,
        name: name.trim(),
        calories: values[0],
        protein: values[1],
        carbs: values[2],
        fat: values[3],
        ...(photo ? { photo: key } : editing?.photo ? { photo: editing.photo } : {}),
        ...(aiEstimated
          ? { source: "AI photo estimate", estimateNotes }
          : food
            ? { source: "Open Food Facts" }
            : editing?.source
              ? { source: editing.source, estimateNotes: editing.estimateNotes }
              : {}),
      };
      if (
        await store.update((d) => ({
          ...d,
          meals: [...d.meals.filter((m) => m.id !== editing?.id), meal].slice(-1000),
        }))
      ) {
        if (photo && editing?.photo) await removePhoto(editing.photo).catch(() => {});
        setName("");
        setCalories("");
        setProtein("");
        setCarbs("");
        setFat("");
        setPhoto("");
        setFood(null);
        setAiEstimated(false);
        setEstimateNotes([]);
        selectedAsset.current = null;
        setEditing(null);
        setMessage("Meal saved on this device.");
      } else if (photo) await removePhoto(key);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Meal could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  const meals = store.data.meals.filter((m) => m.date === date);
  return (
    <Page>
      <Header
        title="Food & fueling"
        body="Keep a flexible meal notebook. Nutrition estimates are optional; there are no calorie or weight-loss targets."
        onBack={onBack}
      />
      <StorageStatus />
      <Field label="Date (YYYY-MM-DD)" value={date} set={setDate} disabled={busy} />
      <Text style={s.h2}>Label lookup</Text>
      <Field
        label="Barcode digits"
        value={barcode}
        set={setBarcode}
        numeric
        disabled={busy}
      />
      <BarcodeScanner
        disabled={busy}
        onRead={(value) => {
          setBarcode(value);
          void lookup(value);
        }}
      />
      <Field
        label="Portion in grams"
        value={grams}
        set={setGrams}
        numeric
        disabled={busy}
      />
      <Button
        label={busy ? "Working…" : "Look up barcode"}
        kind="secondary"
        onPress={() => void lookup()}
        disabled={busy}
      />
      {food ? (
        <Button
          label="Apply edited portion"
          kind="secondary"
          onPress={() => applyFood(food, grams)}
        />
      ) : null}
      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL("https://world.openfoodfacts.org")}
        style={{ minHeight: 48, justifyContent: "center" }}
      >
        <Text style={s.body}>Food data: Open Food Facts · ODbL</Text>
      </Pressable>
      <Field
        label="Meal or snack"
        value={name}
        set={(value) => {
          setName(value);
          setFood(null);
        }}
        disabled={busy}
      />
      <Button
        label={showNutrition ? "Hide optional nutrition" : "Add optional nutrition"}
        kind="secondary"
        onPress={() => setShowNutrition(!showNutrition)}
      />
      {showNutrition ? (
        <>
          <Field
            label="Calories (optional)"
            value={calories}
            set={setCalories}
            numeric
            disabled={busy}
          />
          <Field
            label="Protein in grams (optional)"
            value={protein}
            set={setProtein}
            numeric
            disabled={busy}
          />
          <Field
            label="Carbohydrates in grams (optional)"
            value={carbs}
            set={setCarbs}
            numeric
            disabled={busy}
          />
          <Field
            label="Fat in grams (optional)"
            value={fat}
            set={setFat}
            numeric
            disabled={busy}
          />
        </>
      ) : null}
      <Button
        label={photo ? "Replace photo" : "Attach a meal photo"}
        kind="secondary"
        onPress={() => void attach()}
        disabled={busy}
      />
      {photo ? (
        <>
          <Image
            source={{ uri: photo }}
            style={{ height: 160, borderRadius: 12 }}
            contentFit="cover"
          />
          <Button
            label="Remove selected photo"
            kind="secondary"
            onPress={() => {
              setPhoto("");
              selectedAsset.current = null;
              setAiEstimated(false);
              setEstimateNotes([]);
            }}
            disabled={busy}
          />
          <Text style={s.small}>
            Up to 30 meal photos, 10 MB each. Photos stay local unless you explicitly
            request an AI estimate.
          </Text>
        </>
      ) : null}
      {editing ? (
        <>
          <Text style={s.h3}>Editing {editing.name}</Text>
          {editing.photo && !photo ? <MealPhoto photo={editing.photo} /> : null}
          <Button
            label="Cancel editing"
            disabled={busy}
            kind="secondary"
            onPress={() => {
              setEditing(null);
              setAiEstimated(false);
              setEstimateNotes([]);
              selectedAsset.current = null;
              setName("");
              setCalories("");
              setProtein("");
              setCarbs("");
              setFat("");
              setPhoto("");
              setFood(null);
            }}
          />
        </>
      ) : null}
      {(photo || editing?.photo) && aiAvailable ? (
        <>
          <Text style={s.small}>
            Estimate sends this photo (up to 5 MB) and the optional portion to the
            configured AI provider. Estimates can be wrong and remain editable.
          </Text>
          <Field
            label="Photo portion in grams (optional)"
            value={aiGrams}
            set={setAiGrams}
            numeric
            disabled={busy}
          />
          <Button
            label="Estimate attached photo with AI"
            kind="secondary"
            disabled={busy}
            onPress={() => void estimate()}
          />
        </>
      ) : null}
      {(photo || editing?.photo) && !aiAvailable ? (
        <Text style={s.small}>
          AI photo estimates are not configured. Your manual photo diary works without
          them.
        </Text>
      ) : null}
      {aiEstimated ? (
        <View style={s.note}>
          <Text style={s.h3}>AI photo estimate · check and edit</Text>
          {estimateNotes.map((note, i) => (
            <Text key={i} style={s.body}>
              {note}
            </Text>
          ))}
        </View>
      ) : null}
      <Button
        label={editing ? "Save meal changes" : "Save meal"}
        onPress={() => void save()}
        disabled={busy || !store.ready}
      />
      <Notice message={message} />
      <Text style={s.h2}>Meals on {date}</Text>
      {meals.length === 0 ? (
        <Text style={s.body}>
          Add a meal, snack or photo to start this day’s notebook.
        </Text>
      ) : null}
      {meals
        .slice(-30)
        .reverse()
        .map((m) => (
          <View key={m.id} style={s.card}>
            <Text style={s.h3}>{m.name}</Text>
            {m.photo ? <MealPhoto photo={m.photo} /> : null}
            {m.calories !== undefined ? (
              <Text style={s.body}>{m.calories} kcal</Text>
            ) : null}
            {[m.protein, m.carbs, m.fat].some((v) => v !== undefined) ? (
              <Text style={s.small}>
                Protein {m.protein ?? "—"} g · Carbs {m.carbs ?? "—"} g · Fat{" "}
                {m.fat ?? "—"} g
              </Text>
            ) : null}
            {m.source ? (
              <Text style={s.small}>{m.source} · editable estimate · check portions</Text>
            ) : null}
            {m.estimateNotes?.map((note, i) => (
              <Text key={i} style={s.small}>
                {note}
              </Text>
            ))}
            <Button
              label="Edit meal"
              disabled={busy}
              kind="secondary"
              onPress={() => {
                setEditing(m);
                setAiEstimated(m.source === "AI photo estimate");
                setEstimateNotes(m.estimateNotes ?? []);
                selectedAsset.current = null;
                setDate(m.date);
                setName(m.name);
                setCalories(m.calories === undefined ? "" : String(m.calories));
                setProtein(m.protein === undefined ? "" : String(m.protein));
                setCarbs(m.carbs === undefined ? "" : String(m.carbs));
                setFat(m.fat === undefined ? "" : String(m.fat));
                setPhoto("");
                setShowNutrition(true);
                setMessage("Meal loaded into the form above.");
              }}
            />
            <Button
              label="Delete meal"
              disabled={busy}
              kind="secondary"
              onPress={() =>
                confirmAthlete(
                  "Delete this meal?",
                  "The meal entry and any attached photo will be permanently removed.",
                  () => {
                    void (async () => {
                      if (
                        (await store.update((d) => ({
                          ...d,
                          meals: d.meals.filter((x) => x.id !== m.id),
                        }))) &&
                        m.photo
                      )
                        await removePhoto(m.photo).catch(() =>
                          setMessage(
                            "Meal deleted; photo cleanup failed. Try resetting toolkit storage in Settings.",
                          ),
                        );
                    })();
                  },
                )
              }
            />
          </View>
        ))}
      <Text style={s.h2}>Simple meal ideas</Text>
      <Text style={s.body}>
        Try oatmeal with fruit and yogurt; a rice bowl with beans or chicken and
        vegetables; or a sandwich with fruit. Adapt to allergies, culture and what is
        available. Eat regular meals and bring water to training.
      </Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL("https://www.myplate.gov/life-stages/teens")}
        style={{ minHeight: 48, justifyContent: "center" }}
      >
        <Text style={s.body}>Read MyPlate guidance for teens ↗</Text>
      </Pressable>
    </Page>
  );
}
export function AthleteRecoveryScreen({ onBack }: Back) {
  const { s } = useTheme(),
    store = athleteStore.useStore(),
    timer = useCountdown();
  const [date, setDate] = useState(today()),
    [water, setWater] = useState(""),
    [sleep, setSleep] = useState(""),
    [message, setMessage] = useState(""),
    [mode, setMode] = useState<"breathing" | "quiet">("breathing"),
    [goal, setGoal] = useState(""),
    [optIn, setOptIn] = useState(false);
  const phase = timer.remaining % 8 > 4 ? "Breathe in gently" : "Breathe out gently";
  async function save() {
    const w = number(water, 10000),
      sl = number(sleep, 24);
    if (!validDate(date) || !Number.isFinite(w) || !Number.isFinite(sl)) {
      setMessage("Enter a valid date, water from 0–10000 mL and sleep from 0–24 hours.");
      return;
    }
    if (
      await store.update((d) => ({
        ...d,
        recovery: [
          ...d.recovery.filter((x) => x.date !== date),
          { id: id(), date, water: w!, sleep: sl! },
        ].slice(-1000),
      }))
    ) {
      setMessage("Daily water and sleep entry saved.");
    }
  }
  return (
    <Page>
      <Header title="Recovery & mindset" onBack={onBack} />
      <StorageStatus />
      <Text style={s.h2}>Take a quiet minute</Text>
      <View style={s.chips}>
        <Button
          label="Gentle breathing"
          kind={mode === "breathing" ? "primary" : "secondary"}
          onPress={() => {
            timer.reset();
            setMode("breathing");
          }}
        />
        <Button
          label="Quiet focus"
          kind={mode === "quiet" ? "primary" : "secondary"}
          onPress={() => {
            timer.reset();
            setMode("quiet");
          }}
        />
      </View>
      <Text style={s.stat}>{clock(timer.remaining)}</Text>
      <Text accessibilityLiveRegion="polite" style={s.h2}>
        {timer.running
          ? mode === "breathing"
            ? phase
            : "Notice your surroundings and let your attention settle."
          : "Sit comfortably. Keep your breathing natural."}
      </Text>
      <Text style={s.body}>
        Optional focus practice. Skip any cue that feels uncomfortable; no breath holding
        is required.
      </Text>
      {timer.running ? (
        <Button label="Pause" kind="secondary" onPress={timer.pause} />
      ) : (
        <Button
          label={timer.remaining ? "Resume" : "Start one minute"}
          onPress={() => timer.start(timer.remaining || 60)}
        />
      )}
      <Button label="Reset timer" kind="secondary" onPress={timer.reset} />
      <Text style={s.h2}>Daily recovery log</Text>
      <Field label="Date (YYYY-MM-DD)" value={date} set={setDate} />
      <Field label="Water consumed (mL)" value={water} set={setWater} numeric />
      <Field label="Hours slept" value={sleep} set={setSleep} numeric />
      <Button
        label="Save daily log"
        onPress={() => void save()}
        disabled={!store.ready}
      />
      <Notice message={message} />
      {store.data.recovery
        .slice(-14)
        .reverse()
        .map((r) => (
          <Text key={r.id} style={s.body}>
            {r.date} · {r.water} mL · {r.sleep} hours sleep
          </Text>
        ))}
      <Text style={s.small}>
        This notebook records what you enter. It does not prescribe fluid intake or assess
        your health.
      </Text>
      <Button
        label={optIn ? "Close personal goal note" : "Optional personal goal note"}
        kind="secondary"
        onPress={() => setOptIn(!optIn)}
      />
      {optIn ? (
        <>
          <Text style={s.body}>
            For a weight-related goal, talk with a parent, guardian or qualified
            professional. Record a personal note if useful; the app does not calculate a
            target weight or diet.
          </Text>
          <Field label="Your goal note" value={goal} set={setGoal} />
          <Button
            label="Save goal note"
            onPress={() => {
              if (!goal.trim() || goal.trim().length > 300) {
                setMessage("Keep your goal note between 1 and 300 characters.");
                return;
              }
              void store.update((d) => ({
                ...d,
                weightGoal: { note: goal.trim() },
              }));
            }}
            disabled={!store.ready}
          />
          {store.data.weightGoal ? (
            <>
              <Text style={s.body}>{store.data.weightGoal.note}</Text>
              <Button
                label="Delete goal note"
                kind="secondary"
                onPress={() =>
                  confirmAthlete(
                    "Delete your goal note?",
                    "This local note will be permanently removed.",
                    () => {
                      void store.update((d) => ({
                        ...d,
                        weightGoal: undefined,
                      }));
                    },
                  )
                }
              />
            </>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
export function AthleteMatchesScreen({ onBack }: Back) {
  const { s } = useTheme(),
    store = athleteStore.useStore();
  const [date, setDate] = useState(today()),
    [opponent, setOpponent] = useState(""),
    [minutes, setMinutes] = useState(""),
    [goals, setGoals] = useState("0"),
    [assists, setAssists] = useState("0"),
    [saves, setSaves] = useState("0"),
    [result, setResult] = useState("Draw"),
    [year, setYear] = useState(String(new Date().getFullYear())),
    [message, setMessage] = useState("");
  const stats = seasonStats(store.data.matches, year);
  async function save() {
    const m = number(minutes, 240),
      g = number(goals, 100),
      a = number(assists, 100),
      sv = number(saves, 100);
    if (
      !validDate(date) ||
      !opponent.trim() ||
      opponent.trim().length > 120 ||
      ![m, g, a, sv].every((v) => Number.isFinite(v)) ||
      ![g, a, sv].every(Number.isInteger)
    ) {
      setMessage(
        "Enter a valid date and opponent, minutes up to 240 and whole-number stats up to 100.",
      );
      return;
    }
    if (
      await store.update((d) => ({
        ...d,
        matches: [
          ...d.matches,
          {
            id: id(),
            date,
            opponent: opponent.trim(),
            minutes: m!,
            goals: g!,
            assists: a!,
            saves: sv!,
            result,
          },
        ].slice(-1000),
      }))
    ) {
      setOpponent("");
      setMinutes("");
      setGoals("0");
      setAssists("0");
      setSaves("0");
      setMessage("Match saved.");
    }
  }
  return (
    <Page>
      <Header title="Match notebook" onBack={onBack} />
      <StorageStatus />
      <Field label="Season year" value={year} set={setYear} numeric />
      <View style={s.note}>
        <Text style={s.h2}>
          {stats.games} matches · {stats.minutes} minutes
        </Text>
        <Text style={s.body}>
          {stats.goals} goals · {stats.assists} assists · {stats.saves} saves
        </Text>
      </View>
      <Text style={s.h2}>Record a match</Text>
      <Field label="Date (YYYY-MM-DD)" value={date} set={setDate} />
      <Field label="Opponent" value={opponent} set={setOpponent} />
      <Field label="Minutes played" value={minutes} set={setMinutes} numeric />
      <Field label="Goals" value={goals} set={setGoals} numeric />
      <Field label="Assists" value={assists} set={setAssists} numeric />
      <Field label="Saves" value={saves} set={setSaves} numeric />
      <View style={s.chips}>
        {["Win", "Draw", "Loss"].map((r) => (
          <Button
            key={r}
            label={r}
            kind={result === r ? "primary" : "secondary"}
            onPress={() => setResult(r)}
          />
        ))}
      </View>
      <Button label="Save match" onPress={() => void save()} disabled={!store.ready} />
      <Notice message={message} />
      <Text style={s.h2}>Match history</Text>
      {store.data.matches.length === 0 ? (
        <Text style={s.body}>Your first match log will appear here.</Text>
      ) : null}
      {store.data.matches
        .filter((m) => m.date.startsWith(year))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30)
        .map((m) => (
          <View key={m.id} style={s.card}>
            <Text style={s.h3}>
              {m.opponent} · {m.result}
            </Text>
            <Text style={s.body}>
              {m.date} · {m.minutes} min · {m.goals} G · {m.assists} A · {m.saves} saves
            </Text>
            <Button
              label="Delete match"
              kind="secondary"
              onPress={() =>
                confirmAthlete(
                  "Delete this match?",
                  "The match will be removed from your notebook and season totals.",
                  () => {
                    void store.update((d) => ({
                      ...d,
                      matches: d.matches.filter((x) => x.id !== m.id),
                    }));
                  },
                )
              }
            />
          </View>
        ))}
    </Page>
  );
}
