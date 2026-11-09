import { useEffect, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarDays,
  Target,
  Footprints,
  ChevronRight,
  Shield,
  X,
  Droplets,
  Utensils,
  CircleDot,
  Bell,
} from "lucide-react-native";
import Svg, { Circle, Line, Rect } from "react-native-svg";
import { useApp } from "../state/AppState";
import { days, goals, type Position, time, getDrillDuration } from "../domain/model";
import { profileFromDraft } from "../domain/onboarding";
import {
  answerOptions,
  playerStyles,
  aspirations,
  allergyOptions,
  snapshotStyles,
  weekActivities,
  flowSteps,
  finishOnboardingDraft,
  isFlowStepReady,
  type FlowDraft,
  type OnboardingAnswers,
} from "../domain/onboardingFlow";
import { planForDate } from "../domain/planning";
import { useReminders } from "../notifications/RemindersProvider";
import { skillProfile } from "../domain/skillProfile";
import { haptic } from "../utils/haptics";
import {
  OnboardingPlayerCard,
  PlayerCardFinish,
} from "../components/OnboardingPlayerCard";

const colors = {
  background: "#080F0B",
  panel: "#151E16",
  selected: "#263A17",
  line: "#35432F",
  lime: "#B6FF3B",
  white: "#F7FAF2",
  muted: "#ADB7A8",
};
const photo = require("../../assets/training-editorial.webp");
const playerPhotoCredits = require("../../assets/player-styles/manifest.json") as {
  file: string;
  author: string;
  license: string;
  sourceUrl: string;
  licenseUrl: string;
}[];
const questionTitles: Partial<Record<(typeof flowSteps)[number], [string, string]>> = {
  frequency: ["Question #1", "How often do you currently play or train?"],
  club: ["Question #2", "Do you play for a club?"],
  clubName: ["Question #2.5", "What’s the name of your club?"],
  ambition: ["Question #3", "What’s your biggest goal right now?"],
  tracking: ["Question #4", "Do you currently track your matches or training sessions?"],
  blocker: ["Question #5", "What usually stops you from tracking consistently?"],
  motivation: ["Question #6", "What’s your main goal right now?"],
  focus: ["Your first focus", "What do you want to train first?"],
  equipment: ["Your equipment", "What do you have to train with?"],
  position: ["Question #8", "What position do you play?"],
  experience: ["Question #9", "How long have you been playing?"],
  bodyGoal: ["Your training goal", "What feels right for you?"],
  consistency: ["Question #11", "How would you describe your current consistency?"],
  duration: ["Your session", "How much time can you protect?"],
  space: ["Your space", "Where will you practice?"],
  diet: ["How do you eat?", "For your optional practice-day checklist."],
  foodSource: ["Question #17", "Where does your food come from most days?"],
};
const fieldForStep = new Set(
  Object.keys(answerOptions).filter((key) => key !== "playstyle"),
);
const pitches: { short: string; position: Position; x: number; y: number }[] = [
  { short: "ST", position: "Forward", x: 50, y: 6 },
  { short: "LW", position: "Forward", x: 14, y: 14 },
  { short: "RW", position: "Forward", x: 86, y: 14 },
  { short: "AM", position: "Midfielder", x: 50, y: 31 },
  { short: "LM", position: "Midfielder", x: 14, y: 48 },
  { short: "CM", position: "Midfielder", x: 50, y: 48 },
  { short: "RM", position: "Midfielder", x: 86, y: 48 },
  { short: "DM", position: "Midfielder", x: 50, y: 65 },
  { short: "LB", position: "Defender", x: 14, y: 81 },
  { short: "RB", position: "Defender", x: 86, y: 81 },
  { short: "CB", position: "Defender", x: 38, y: 89 },
  { short: "CB", position: "Defender", x: 64, y: 89 },
  { short: "GK", position: "Goalkeeper", x: 50, y: 98 },
];
function Copy({
  children,
  muted = false,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: any;
}) {
  return (
    <Text style={[styles.copy, muted && { color: colors.muted }, style]}>{children}</Text>
  );
}
function Heading({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <Text
      accessibilityRole="header"
      style={[styles.heading, center && { textAlign: "center" }]}
    >
      {children}
    </Text>
  );
}
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>• {children}</Text>
    </View>
  );
}
function Option({
  label,
  sub,
  selected,
  onPress,
  number,
  color,
  multiple = false,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  number?: number;
  color?: string;
  multiple?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={multiple ? "checkbox" : "radio"}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, selected }}
      aria-checked={selected}
      onPress={() => {
        haptic("selection");
        onPress();
      }}
      style={({ pressed }) => [
        styles.option,
        color ? { backgroundColor: color } : null,
        selected && styles.optionSelected,
        pressed && { opacity: 0.78 },
      ]}
    >
      {number ? (
        <View style={[styles.number, selected && { backgroundColor: colors.lime }]}>
          <Text style={styles.numberText}>{number}</Text>
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 4 }}>
        <Copy style={{ fontFamily: "Archivo_600SemiBold" }}>{label}</Copy>
        {sub ? (
          <Copy muted style={{ fontSize: 12, lineHeight: 17 }}>
            {sub}
          </Copy>
        ) : null}
      </View>
      <View
        style={[
          styles.radio,
          selected && { backgroundColor: colors.lime, borderColor: colors.lime },
        ]}
      >
        {selected ? <Check size={14} color={colors.background} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}
function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.note}>
      <View style={styles.noteIcon}>
        <CalendarDays size={19} color={colors.lime} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Copy style={{ fontFamily: "Archivo_600SemiBold" }}>{title}</Copy>
        <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
          {children}
        </Copy>
      </View>
    </View>
  );
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Check size={16} color={colors.lime} />
      <Copy muted style={{ flex: 1 }}>
        {label}
      </Copy>
      <Copy
        style={{ textAlign: "right", flexShrink: 1, fontFamily: "Archivo_600SemiBold" }}
      >
        {value}
      </Copy>
    </View>
  );
}
function Wheel({
  label,
  unit,
  values,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  values: number[];
  value?: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 10 }}>
      <Text style={styles.smallLabel}>{label}</Text>
      <Text style={styles.bigNumber}>{value === undefined ? "–" : value}</Text>
      <Copy style={{ color: colors.lime, fontSize: 12 }}>{unit}</Copy>
      <ScrollView
        nestedScrollEnabled
        style={{ height: 156, width: "100%" }}
        contentContainerStyle={{ paddingVertical: 52 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={52}
        accessibilityLabel={`${label}, choose a value`}
      >
        {values.map((n) => (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === n, selected: value === n }}
            aria-checked={value === n}
            accessibilityLabel={`${n} ${unit}`}
            onPress={() => {
              haptic("selection");
              onChange(n);
            }}
            style={[styles.wheelRow, value === n && { backgroundColor: colors.selected }]}
          >
            <Copy
              style={{ fontSize: 22, color: value === n ? colors.white : colors.muted }}
            >
              {n}
            </Copy>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function Onboarding({
  onComplete,
  replay = false,
}: { onComplete?: () => void; replay?: boolean } = {}) {
  const { data, update, catalog: drills } = useApp();
  const reminders = useReminders();
  const [remindersRequested, setRemindersRequested] = useState(false);
  const inset = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<FlowDraft>({});
  const [imperial, setImperial] = useState(false);
  const [showPhotoCredits, setShowPhotoCredits] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== "android" || index === 0) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      haptic("selection");
      setIndex((current) => Math.max(0, current - 1));
      return true;
    });
    return () => subscription.remove();
  }, [index]);
  const step = flowSteps[index];
  const answers = draft.answers ?? {};
  const profile = profileFromDraft(draft);
  const field = fieldForStep.has(step) ? (step as keyof typeof answerOptions) : undefined;
  const optionalQuestion = !!field;
  const selected = field ? answers[field] : undefined;
  const invalidWeekTime = Object.values(answers.week ?? {}).some(
    (row) => row?.time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.time),
  );
  const ready =
    isFlowStepReady(draft, step) &&
    (!optionalQuestion || !!selected) &&
    (step !== "playstyle" || !!answers.playstyle) &&
    (step !== "schedule" || !invalidWeekTime);
  const ratings = skillProfile(false, data.assessments ?? []);
  const teamCount = Object.values(answers.week ?? {}).filter(
    (row) => row?.activity === "Team training",
  ).length;
  const matchCount = Object.values(answers.week ?? {}).filter(
    (row) => row?.activity === "Match",
  ).length;
  const patch = (next: Partial<FlowDraft>) => setDraft((d) => ({ ...d, ...next }));
  const answer = (next: Partial<OnboardingAnswers>) =>
    setDraft((d) => ({ ...d, answers: { ...d.answers, ...next } }));
  const advance = () => {
    if (step === "plan") {
      if (!profile) return;
      haptic("success");
      update((st) => finishOnboardingDraft(st, draft, drills, replay) ?? st);
      if (remindersRequested) void reminders.setEnabled(true);
      onComplete?.();
    } else {
      haptic("medium");
      setIndex((i) => Math.min(i + 1, flowSteps.length - 1));
    }
  };
  const nextData = profile ? finishOnboardingDraft(data, draft, drills, replay) : null;
  const ids = nextData
    ? planForDate(
        drills,
        nextData.profile,
        nextData.plan,
        new Date(),
        nextData.planCustomized,
      )
    : [];
  const photoScreen = [
    "welcome",
    "intro",
    "level",
    "positionConfirm",
    "assessment",
    "strengths",
    "growth",
  ].includes(step);
  const purpleScreen = [
    "brief",
    "identity",
    "days",
    "schedule",
    "aspirations",
    "snapshot",
  ].includes(step);
  const name = answers.name?.trim();
  const greeting = name ? `, ${name}` : "";
  const title = questionTitles[step];
  let content: React.ReactNode = null;

  if (field) {
    const options = answerOptions[field];
    const levelDetails = [
      "Club academy or youth pathway",
      "University or college team",
      "Paid, but not full time",
      "Full-time contract",
      "Grassroots, Sunday league, casual",
    ];
    content = (
      <>
        {step === "level" ? (
          <View style={{ gap: 12, marginBottom: 16 }}>
            <Tag>Your level</Tag>
            <Heading>What are you{"\n"}playing at?</Heading>
            <Copy muted>Your context. Your starting point.</Copy>
          </View>
        ) : null}
        {step === "commitment" ? (
          <>
            <Tag>Your commitment</Tag>
            <Heading center>How far are you{"\n"}taking this?</Heading>
            <Copy muted style={{ textAlign: "center", marginBottom: 18 }}>
              Choose what you can realistically protect.
            </Copy>
          </>
        ) : null}
        <View style={{ gap: 10 }}>
          {options.map((option, i) => (
            <Option
              key={option}
              label={option}
              sub={
                step === "level"
                  ? levelDetails[i]
                  : step === "commitment"
                    ? [
                        "2–3 sessions a week. Consistency over intensity.",
                        "4–5 sessions a week. Including the bad days.",
                        "Every day you can. This is the priority.",
                      ][i]
                    : undefined
              }
              selected={selected === option}
              onPress={() => answer({ [field]: option })}
              number={
                [
                  "frequency",
                  "club",
                  "ambition",
                  "tracking",
                  "blocker",
                  "motivation",
                  "consistency",
                ].includes(step)
                  ? i + 1
                  : undefined
              }
            />
          ))}
        </View>
      </>
    );
  } else
    switch (step) {
      case "welcome":
        content = (
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              gap: 16,
              paddingBottom: 16,
              minHeight: 390,
            }}
          >
            <Tag>Your game. Your pace.</Tag>
            <Text style={styles.welcomeTitle}>Getting better{"\n"}starts here.</Text>
            <Copy muted>Individual practice. A clear plan. Your progress.</Copy>
          </View>
        );
        break;
      case "intro":
        content = (
          <View style={{ gap: 22, paddingTop: 36 }}>
            <Tag>Before we start</Tag>
            <Heading>
              Serious about{"\n"}your game?{"\n"}Start with a plan.
            </Heading>
            <View style={styles.accentRule} />
            <Copy muted>A few answers. One clear place to begin.</Copy>
            <View style={styles.panel}>
              {[
                [Target, "Choose your first focus"],
                [CalendarDays, "Find a week you can keep"],
                [Footprints, "See your starting session"],
              ].map(([Icon, label]) => {
                const ItemIcon = Icon as typeof Target;
                return (
                  <View
                    key={String(label)}
                    style={{
                      flexDirection: "row",
                      gap: 14,
                      alignItems: "center",
                      paddingVertical: 10,
                    }}
                  >
                    <ItemIcon size={21} color={colors.lime} />
                    <Copy>{String(label)}</Copy>
                  </View>
                );
              })}
            </View>
          </View>
        );
        break;
      case "clubName":
        content = (
          <>
            <TextInput
              accessibilityLabel="Club name, optional"
              placeholder="e.g. your local club"
              placeholderTextColor={colors.muted}
              value={answers.clubName ?? ""}
              maxLength={80}
              onChangeText={(clubName) => answer({ clubName })}
              style={styles.input}
              autoCapitalize="words"
            />
            <Copy muted style={styles.footnote}>
              Optional. Your club name stays on this device.
            </Copy>
          </>
        );
        break;
      case "focus":
        content = (
          <View style={{ gap: 12 }}>
            {goals.map((goal, i) => (
              <Option
                key={goal}
                label={goal}
                number={i + 1}
                selected={draft.goal === goal}
                onPress={() => patch({ goal })}
              />
            ))}
          </View>
        );
        break;
      case "equipment":
        content = (
          <View style={{ gap: 12 }}>
            {[
              ["Ball only", ""],
              ["Markers", "markers"],
              ["A wall", "wall"],
              ["A partner", "partner"],
            ].map(([label, value]) => (
              <Option
                key={label}
                label={label}
                multiple
                selected={
                  value ? !!draft.gear?.includes(value) : draft.gear?.length === 0
                }
                onPress={() =>
                  patch({
                    gear: value
                      ? draft.gear?.includes(value)
                        ? draft.gear.filter((g) => g !== value)
                        : [...(draft.gear ?? []), value]
                      : [],
                  })
                }
              />
            ))}
            <Copy muted style={styles.footnote}>
              Every session assumes you have a ball.
            </Copy>
          </View>
        );
        break;
      case "position":
        content = (
          <View style={{ gap: 14 }}>
            <View style={styles.pitch}>
              <Svg
                width="100%"
                height="100%"
                viewBox="0 0 340 460"
                preserveAspectRatio="none"
                style={StyleSheet.absoluteFill}
              >
                <Rect
                  x={1}
                  y={1}
                  width={338}
                  height={458}
                  rx={14}
                  fill="none"
                  stroke={colors.line}
                  strokeWidth={2}
                />
                <Line x1={0} y1={230} x2={340} y2={230} stroke={colors.line} />
                <Circle cx={170} cy={230} r={65} stroke={colors.line} fill="none" />
                <Rect
                  x={104}
                  y={1}
                  width={132}
                  height={46}
                  fill="none"
                  stroke={colors.line}
                />
                <Rect
                  x={104}
                  y={413}
                  width={132}
                  height={46}
                  fill="none"
                  stroke={colors.line}
                />
              </Svg>
              {pitches.map((p, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="radio"
                  accessibilityLabel={`${p.short}, ${p.position}`}
                  aria-checked={answers.positionDetail === p.short}
                  accessibilityState={{
                    checked: answers.positionDetail === p.short,
                    selected: answers.positionDetail === p.short,
                  }}
                  onPress={() => {
                    haptic("selection");
                    patch({ position: p.position });
                    answer({ positionDetail: p.short });
                  }}
                  style={[
                    styles.position,
                    { left: `${p.x}%`, top: `${p.y}%` },
                    answers.positionDetail === p.short && styles.positionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.positionText,
                      answers.positionDetail === p.short && { color: colors.background },
                    ]}
                  >
                    {p.short}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Option
              label="Still exploring"
              selected={draft.position === "Still exploring"}
              onPress={() => {
                patch({ position: "Still exploring" });
                answer({ positionDetail: "Exploring" });
              }}
            />
          </View>
        );
        break;
      case "positionConfirm":
        content = (
          <View style={{ minHeight: 360, justifyContent: "flex-end", gap: 16, flex: 1 }}>
            <Tag>Your position</Tag>
            <Text style={styles.positionHero}>
              {answers.positionDetail ?? "YOUR GAME"}
            </Text>
            <Heading>
              {draft.position === "Still exploring"
                ? "Room to find your game."
                : `Your game.\nYour ${draft.position?.toLowerCase()} focus.`}
            </Heading>
            <Copy muted>
              Your focus leads. Position helps choose supporting ball-work drills.
            </Copy>
            {draft.position === "Goalkeeper" ? (
              <Copy muted>Ball work and distribution; no specialist keeper program.</Copy>
            ) : null}
          </View>
        );
        break;
      case "playstyle":
        content = (
          <>
            <Heading center>Which playstyle fits you best?</Heading>
            <Copy muted style={{ textAlign: "center", marginTop: 10 }}>
              Pick what feels like your game.
            </Copy>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -24, marginTop: 24 }}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 14 }}
              snapToInterval={Math.min(width - 62, 340) + 14}
              decelerationRate="fast"
            >
              {playerStyles.map((player, i) => (
                <Pressable
                  key={player.name}
                  accessibilityRole="radio"
                  aria-checked={answers.playstyle === player.name}
                  accessibilityState={{
                    checked: answers.playstyle === player.name,
                    selected: answers.playstyle === player.name,
                  }}
                  onPress={() => {
                    haptic("selection");
                    answer({ playstyle: player.name });
                  }}
                  style={[
                    styles.styleCard,
                    { width: Math.min(width - 62, 340) },
                    answers.playstyle === player.name && { borderColor: colors.lime },
                  ]}
                >
                  <Image
                    source={
                      [
                        require("../../assets/player-styles/kevin-de-bruyne.jpg"),
                        require("../../assets/player-styles/pedri.jpg"),
                        require("../../assets/player-styles/sergio-busquets.jpg"),
                        require("../../assets/player-styles/declan-rice.jpg"),
                      ][i]
                    }
                    contentFit="cover"
                    contentPosition={{ left: "50%", top: i === 1 ? "0%" : "25%" }}
                    accessibilityLabel={`${player.name}, playstyle inspiration`}
                    style={{ width: "100%", height: 250, opacity: 0.85 }}
                  />
                  <View style={{ padding: 20, gap: 10 }}>
                    <Tag>{player.position}</Tag>
                    <Text style={styles.cardTitle}>{player.name}</Text>
                    <Text
                      style={{
                        fontFamily: "Archivo_600SemiBold",
                        fontSize: 11,
                        lineHeight: 16,
                        color: colors.lime,
                        letterSpacing: 0.7,
                      }}
                    >
                      {player.role}
                    </Text>
                    <Copy muted>{player.description}</Copy>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                      {player.tags.map((t) => (
                        <View key={t} style={styles.skillPill}>
                          <Copy style={{ fontSize: 10, lineHeight: 14 }}>{t}</Copy>
                        </View>
                      ))}
                    </View>
                    <View style={{ height: 22, alignItems: "flex-end" }}>
                      {answers.playstyle === player.name ? (
                        <Check size={22} color={colors.lime} />
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>{" "}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Player photo credits"
              aria-expanded={showPhotoCredits}
              accessibilityState={{ expanded: showPhotoCredits }}
              onPress={() => {
                haptic("light");
                setShowPhotoCredits((v) => !v);
              }}
              style={{
                minHeight: 44,
                justifyContent: "center",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Copy muted style={{ fontSize: 12, textDecorationLine: "underline" }}>
                Player photo credits
              </Copy>
            </Pressable>
            {showPhotoCredits ? (
              <View style={{ gap: 8 }}>
                <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
                  Playing-style inspiration. No affiliation or endorsement. Photos resized
                  and displayed with cover cropping.
                </Copy>
                {playerPhotoCredits.map((credit) => (
                  <View key={credit.file} style={{ gap: 2, paddingTop: 8 }}>
                    <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
                      {credit.author}
                    </Copy>
                    <View style={{ flexDirection: "row", gap: 16 }}>
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={`Photo source, ${credit.file}`}
                        onPress={() => {
                          void Linking.openURL(credit.sourceUrl).catch(() => {});
                        }}
                        style={{ minHeight: 44, justifyContent: "center" }}
                      >
                        <Copy style={{ fontSize: 12, textDecorationLine: "underline" }}>
                          Photo source
                        </Copy>
                      </Pressable>
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={`${credit.license}, ${credit.file}`}
                        onPress={() => {
                          void Linking.openURL(credit.licenseUrl).catch(() => {});
                        }}
                        style={{ minHeight: 44, justifyContent: "center" }}
                      >
                        <Copy style={{ fontSize: 12, textDecorationLine: "underline" }}>
                          {credit.license}
                        </Copy>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        );
        break;
      case "experience":
        content = (
          <View style={{ gap: 12 }}>
            {answerOptions.years.map((label, i) => (
              <Option
                key={label}
                label={label}
                number={i + 1}
                selected={answers.years === label}
                onPress={() => {
                  answer({ years: label });
                  patch({ experience: i === 0 ? "New to training" : "Some experience" });
                }}
              />
            ))}
          </View>
        );
        break;
      case "measurements":
        content = (
          <View style={{ gap: 22 }}>
            <Heading center>Height & weight</Heading>
            <Copy muted style={{ textAlign: "center" }}>
              Optional · Saved only on this device.
            </Copy>
            <View style={styles.segment}>
              {[false, true].map((v) => (
                <Pressable
                  key={String(v)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: imperial === v }}
                  aria-pressed={imperial === v}
                  onPress={() => {
                    haptic("selection");
                    setImperial(v);
                  }}
                  style={[
                    styles.segmentItem,
                    imperial === v && { backgroundColor: "#344031" },
                  ]}
                >
                  <Copy style={{ fontSize: 13 }}>{v ? "Imperial" : "Metric"}</Copy>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 22 }}>
              <Wheel
                label="HEIGHT"
                unit={imperial ? "in" : "cm"}
                values={Array.from(
                  { length: imperial ? 63 : 161 },
                  (_, i) => i + (imperial ? 32 : 80),
                )}
                value={
                  answers.heightCm === undefined
                    ? undefined
                    : imperial
                      ? Math.round(answers.heightCm / 2.54)
                      : answers.heightCm
                }
                onChange={(v) =>
                  answer({ heightCm: imperial ? Math.round(v * 2.54) : v })
                }
              />
              <Wheel
                label="WEIGHT"
                unit={imperial ? "lb" : "kg"}
                values={Array.from(
                  { length: imperial ? 408 : 186 },
                  (_, i) => i + (imperial ? 33 : 15),
                )}
                value={
                  answers.weightKg === undefined
                    ? undefined
                    : imperial
                      ? Math.round(answers.weightKg * 2.20462)
                      : answers.weightKg
                }
                onChange={(v) =>
                  answer({ weightKg: imperial ? Math.round((v / 2.20462) * 10) / 10 : v })
                }
              />
            </View>
            <Copy muted style={styles.footnote}>
              Tap to choose, or skip.
            </Copy>
          </View>
        );
        break;
      case "planComparison":
        content = (
          <View style={{ gap: 24, paddingTop: 20 }}>
            <Heading center>Random sessions don’t know your goal. A plan does.</Heading>
            <View
              style={{
                flexDirection: "row",
                gap: 20,
                alignItems: "flex-end",
                justifyContent: "center",
                paddingVertical: 24,
              }}
            >
              <View style={{ flex: 1, gap: 12 }}>
                <View
                  style={[
                    styles.comparisonBar,
                    { height: 110, backgroundColor: "#48252A" },
                  ]}
                >
                  <Copy style={{ textAlign: "center" }}>Training at random</Copy>
                </View>
                <Copy muted style={{ textAlign: "center" }}>
                  Without a routine
                </Copy>
              </View>
              <View style={{ flex: 1, gap: 12 }}>
                <View
                  style={[
                    styles.comparisonBar,
                    { height: 240, backgroundColor: colors.selected, gap: 18 },
                  ]}
                >
                  {["A clear focus", "Your chosen days", "Practice you can track"].map(
                    (label) => (
                      <View key={label} style={{ flexDirection: "row", gap: 8 }}>
                        <Check size={17} color={colors.lime} />
                        <Copy style={{ flex: 1 }}>{label}</Copy>
                      </View>
                    ),
                  )}
                </View>
                <Copy style={{ textAlign: "center" }}>Your Breakaway plan</Copy>
              </View>
            </View>
            <Copy muted style={{ textAlign: "center" }}>
              Your focus, setup and available time shape your starting session.
            </Copy>
          </View>
        );
        break;
      case "notifications":
        content = (
          <View style={{ gap: 24, paddingTop: 22 }}>
            <View style={{ alignItems: "center" }}>
              <Bell size={42} color={colors.lime} />
            </View>
            <Heading center>Stay close to your routine.</Heading>
            <Copy muted style={{ textAlign: "center" }}>
              Optional reminders on your training days. We’ll ask permission after you
              save your plan.
            </Copy>
            <View style={styles.panel}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View style={styles.noteIcon}>
                  <Footprints size={18} color={colors.lime} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Copy>Time for your next touch</Copy>
                  <Copy muted>Your Breakaway training plan is ready.</Copy>
                </View>
              </View>
            </View>
            {reminders.supported ? (
              <Option
                label="Remind me to train"
                sub="Use the time set in Settings. Change or turn off any time."
                selected={remindersRequested}
                onPress={() => setRemindersRequested((v) => !v)}
              />
            ) : (
              <Copy muted>Reminders work in the iOS and Android app.</Copy>
            )}
          </View>
        );
        break;
      case "comparison":
        content = (
          <View style={{ gap: 24, paddingTop: 16 }}>
            <Heading center>A week that works for you.</Heading>
            <Copy muted style={{ textAlign: "center" }}>
              Your answers so far. Your next step is choosing the days.
            </Copy>
            <View
              style={{
                flexDirection: "row",
                gap: 28,
                justifyContent: "center",
                paddingTop: 30,
              }}
            >
              {[
                [answers.frequency ?? "Not answered", "Right now"],
                [answers.commitment ?? "Not answered", "Your intention"],
              ].map(([value, label], i) => (
                <View
                  key={label}
                  style={{ alignItems: "center", flex: 1, maxWidth: 150, gap: 12 }}
                >
                  <View
                    style={[
                      styles.comparisonBar,
                      { backgroundColor: i ? colors.lime : "#46662D" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cardTitle,
                        {
                          color: i ? colors.background : colors.white,
                          textAlign: "center",
                        },
                      ]}
                    >
                      {value}
                    </Text>
                  </View>
                  <Copy>{label}</Copy>
                  <Copy muted style={{ fontSize: 11, textAlign: "center" }}>
                    {i ? "what you chose" : "what you told us"}
                  </Copy>
                </View>
              ))}
            </View>
          </View>
        );
        break;
      case "brief":
        content = (
          <View style={{ gap: 20, paddingTop: 30 }}>
            <Tag>Your plan brief</Tag>
            <Heading>Let’s turn your answers into a week.</Heading>
            <View style={[styles.panel, styles.purplePanel]}>
              <SummaryRow label="Focus" value={draft.goal ?? ""} />
              <SummaryRow label="Position" value={draft.position ?? ""} />
              <SummaryRow label="Experience" value={draft.experience ?? ""} />
              {answers.commitment ? (
                <SummaryRow label="Intention" value={answers.commitment} />
              ) : null}
            </View>
            <Copy muted>No test scores yet. Just a practical starting point.</Copy>
          </View>
        );
        break;
      case "identity":
        content = (
          <View style={{ gap: 20 }}>
            <Heading center>Tell us more about you</Heading>
            <Copy muted style={{ textAlign: "center" }}>
              A name for your plan. An age range for privacy.
            </Copy>
            <View style={{ gap: 8 }}>
              <Text style={styles.smallLabel}>YOUR NAME · OPTIONAL</Text>
              <TextInput
                accessibilityLabel="Your name, optional"
                placeholder="First name or nickname"
                placeholderTextColor={colors.muted}
                value={answers.name ?? ""}
                onChangeText={(name) => answer({ name })}
                maxLength={40}
                autoCapitalize="words"
                style={[styles.input, styles.purplePanel]}
              />
            </View>
            <View style={{ gap: 10, marginTop: 8 }}>
              <Text style={styles.smallLabel}>YOUR AGE RANGE</Text>
              {(
                [
                  ["under13", "Under 13"],
                  ["13to17", "13–17"],
                  ["adult", "18 or older"],
                ] as const
              ).map(([value, label]) => (
                <Option
                  key={value}
                  label={label}
                  selected={draft.ageBand === value}
                  onPress={() => patch({ ageBand: value })}
                />
              ))}
            </View>
            <Copy muted style={styles.footnote}>
              Stored on this device. No account or exact birth date.
            </Copy>
          </View>
        );
        break;
      case "days":
        content = (
          <View style={{ gap: 24 }}>
            <Tag>Your week</Tag>
            <Heading center>Which days are yours{greeting}?</Heading>
            <Copy muted style={{ textAlign: "center" }}>
              Pick the days you can actually protect.
            </Copy>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 5, flexGrow: 1 }}
            >
              {days.map((day) => (
                <Pressable
                  key={day}
                  accessibilityRole="checkbox"
                  accessibilityLabel={day}
                  accessibilityState={{ checked: !!draft.days?.includes(day) }}
                  aria-checked={!!draft.days?.includes(day)}
                  onPress={() => {
                    haptic("selection");
                    patch({
                      days: draft.days?.includes(day)
                        ? draft.days.filter((d) => d !== day)
                        : [...(draft.days ?? []), day],
                    });
                  }}
                  style={[
                    styles.day,
                    draft.days?.includes(day) && {
                      backgroundColor: colors.lime,
                      borderColor: colors.lime,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      draft.days?.includes(day) && { color: colors.background },
                    ]}
                  >
                    {day.slice(0, 1)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={[styles.panel, styles.purplePanel]}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <Text style={[styles.bigNumber, { color: colors.lime }]}>
                  {draft.days?.length ?? "–"}
                </Text>
                <Copy muted>days a week</Copy>
              </View>
              <View style={{ flexDirection: "row", gap: 4, marginVertical: 16 }}>
                {days.map((day) => (
                  <View
                    key={day}
                    style={{
                      height: 4,
                      flex: 1,
                      borderRadius: 2,
                      backgroundColor: draft.days?.includes(day)
                        ? colors.lime
                        : colors.line,
                    }}
                  />
                ))}
              </View>
              <Copy muted>
                {draft.days?.length
                  ? draft.days.join(" · ")
                  : "Choose at least one training day."}
              </Copy>
            </View>
          </View>
        );
        break;
      case "schedule":
        content = (
          <View style={{ gap: 18 }}>
            <Tag>Your week</Tag>
            <Heading center>What’s already in it?</Heading>
            <Copy muted style={{ textAlign: "center" }}>
              Optional notes for your week. Your practice days stay as chosen.
            </Copy>
            <View
              style={[
                styles.panel,
                { backgroundColor: "#281A35", borderColor: "#4B355A" },
              ]}
            >
              {days.map((day) => (
                <View key={day}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${day}, ${answers.week?.[day]?.activity ?? "Choose an activity"}`}
                    accessibilityState={{ expanded: expandedDay === day }}
                    aria-expanded={expandedDay === day}
                    onPress={() => {
                      haptic("selection");
                      setExpandedDay(expandedDay === day ? null : day);
                    }}
                    style={styles.scheduleRow}
                  >
                    <Copy style={{ width: 36 }}>{day}</Copy>
                    <View style={[styles.scheduleBlock, { backgroundColor: "#34253F" }]}>
                      <Copy muted={!answers.week?.[day]} style={{ flex: 1 }}>
                        {answers.week?.[day]?.activity ?? "Choose activity"}
                      </Copy>
                      <Copy muted style={{ fontSize: 12 }}>
                        {answers.week?.[day]?.time ?? ""}
                      </Copy>
                      <ChevronRight size={17} color={colors.muted} />
                    </View>
                  </Pressable>
                  {expandedDay === day ? (
                    <View style={{ gap: 6, paddingBottom: 14, paddingTop: 4 }}>
                      {weekActivities.map((activity) => (
                        <Option
                          key={activity}
                          label={activity}
                          selected={answers.week?.[day]?.activity === activity}
                          onPress={() => {
                            answer({ week: { ...answers.week, [day]: { activity } } });
                            if (activity === "Rest") setExpandedDay(null);
                          }}
                        />
                      ))}
                      {answers.week?.[day]?.activity &&
                      answers.week[day]?.activity !== "Rest" ? (
                        <TextInput
                          accessibilityLabel={`${day} time, optional, 24-hour format`}
                          placeholder="Time · HH:MM (optional)"
                          placeholderTextColor={colors.muted}
                          value={answers.week[day]?.time ?? ""}
                          maxLength={5}
                          keyboardType="numbers-and-punctuation"
                          onChangeText={(time) =>
                            answer({
                              week: {
                                ...answers.week,
                                [day]: { activity: answers.week![day]!.activity, time },
                              },
                            })
                          }
                          style={[styles.input, styles.purplePanel]}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
            {invalidWeekTime ? (
              <Copy style={{ fontSize: 12, color: "#FFBBB4" }}>
                Use HH:MM, for example 18:00, or leave the time blank.
              </Copy>
            ) : null}
            <Copy muted style={{ fontSize: 12, textAlign: "center" }}>
              {teamCount} team {teamCount === 1 ? "session" : "sessions"} · {matchCount}{" "}
              {matchCount === 1 ? "match" : "matches"}
            </Copy>
          </View>
        );
        break;
      case "duration":
        content = (
          <View style={{ gap: 14 }}>
            {[15, 20, 30].map((minutes) => (
              <Option
                key={minutes}
                label={`${minutes} minutes`}
                sub="Includes your warm-up"
                selected={draft.minutes === minutes}
                onPress={() => patch({ minutes })}
              />
            ))}
          </View>
        );
        break;
      case "space":
        content = (
          <View style={{ gap: 14 }}>
            {["Small space", "Open space"].map((space) => (
              <Option
                key={space}
                label={space}
                sub={
                  space === "Small space"
                    ? "Room for close control"
                    : "Room to move and turn"
                }
                selected={draft.space === space}
                onPress={() => patch({ space })}
              />
            ))}
          </View>
        );
        break;
      case "aspirations":
        content = (
          <View style={{ gap: 12 }}>
            <Heading center>Choose your goals</Heading>
            <Copy muted style={{ textAlign: "center", marginBottom: 12 }}>
              What matters to you? Select any, or skip.
            </Copy>
            {aspirations.map((label, i) => (
              <Option
                key={label}
                label={label}
                multiple
                color={
                  [
                    "#174D25",
                    "#57222D",
                    "#343D49",
                    "#472859",
                    "#194A43",
                    "#5B491A",
                    "#512245",
                  ][i]
                }
                selected={!!answers.aspirations?.includes(label)}
                onPress={() =>
                  answer({
                    aspirations: answers.aspirations?.includes(label)
                      ? answers.aspirations.filter((a) => a !== label)
                      : [...(answers.aspirations ?? []), label],
                  })
                }
              />
            ))}
          </View>
        );
        break;
      case "allergies":
        content = (
          <View style={{ gap: 10 }}>
            <Heading center>Anything you can’t eat?</Heading>
            <Copy muted style={{ textAlign: "center", marginTop: 4, marginBottom: 16 }}>
              An optional personal reminder. We don’t generate meals or check ingredients.
            </Copy>
            {allergyOptions.map((label) => (
              <Option
                key={label}
                label={label}
                multiple
                selected={!!answers.allergies?.includes(label)}
                onPress={() =>
                  answer({
                    allergies:
                      label === "None of these"
                        ? [label]
                        : answers.allergies?.includes(label)
                          ? answers.allergies.filter((a) => a !== label)
                          : [
                              ...(answers.allergies ?? []).filter(
                                (a) => a !== "None of these",
                              ),
                              label,
                            ],
                  })
                }
              />
            ))}
          </View>
        );
        break;
      case "fuel":
        content = (
          <View style={{ gap: 22 }}>
            <Tag>Your fuel checklist</Tag>
            <Heading center>Keep the basics close.</Heading>
            <Copy muted style={{ textAlign: "center" }}>
              A simple checklist, not a meal plan.
            </Copy>
            <View style={styles.panel}>
              <View style={styles.fuelRow}>
                <Droplets color={colors.lime} size={28} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Copy>Bring your water</Copy>
                  <Copy muted>Keep it within reach of your practice space.</Copy>
                </View>
              </View>
              <View style={styles.fuelRow}>
                <Utensils color={colors.lime} size={28} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Copy>Plan around your usual meals</Copy>
                  <Copy muted>
                    {answers.diet ? `${answers.diet} · ` : ""}
                    {answers.foodSource ?? "Your familiar food, your usual routine."}
                  </Copy>
                </View>
              </View>
              <View style={styles.fuelRow}>
                <Shield color={colors.lime} size={28} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Copy>Stick to food you know works for you</Copy>
                  <Copy muted>
                    {answers.allergies?.length &&
                    !answers.allergies.includes("None of these")
                      ? `Your reminder: ${answers.allergies.join(", ")}. Check ingredients yourself.`
                      : "Check ingredients and your own dietary needs."}
                  </Copy>
                </View>
              </View>
            </View>
          </View>
        );
        break;
      case "assessment":
        content = (
          <View style={{ gap: 20, paddingTop: 24 }}>
            <Tag>Your answers</Tag>
            <Heading>Your starting point{greeting}.</Heading>
            <Copy muted>
              Here’s what you told us. Skill ratings come from completed tests.
            </Copy>
            <View style={styles.panel}>
              <SummaryRow label="Position" value={draft.position ?? ""} />
              <SummaryRow label="Focus" value={draft.goal ?? ""} />
              <SummaryRow
                label="Schedule"
                value={`${draft.days?.length ?? 0} days · ${draft.minutes} min`}
              />
              <SummaryRow label="Setup" value={draft.space ?? ""} />
            </View>
          </View>
        );
        break;
      case "strengths":
        content = (
          <View style={{ gap: 22, paddingTop: 24 }}>
            <Tag>Your foundation</Tag>
            <Heading>This is what your plan is built on.</Heading>
            <Copy muted>A focus you chose. A week you can repeat.</Copy>
            <View style={styles.panel}>
              <Copy style={styles.cardTitle}>{answers.playstyle ?? draft.goal}</Copy>
              <Copy muted style={{ marginTop: 10 }}>
                {answers.ambition ?? "A clear focus and time to practice."}
              </Copy>
            </View>
            <Note title="Start with what you can repeat">
              {draft.days?.join(" · ")} · {draft.minutes} minutes a session.
            </Note>
          </View>
        );
        break;
      case "growth":
        content = (
          <View style={{ gap: 22, paddingTop: 24 }}>
            <Tag>Your next step</Tag>
            <Heading>Give your progress a starting line.</Heading>
            <Copy muted>
              Use Skill profile in Progress to record real tests, whenever you’re ready.
            </Copy>
            <View style={styles.panel}>
              {["Pace", "Shooting", "Passing", "Dribbling", "Defending", "Physical"].map(
                (skill) => (
                  <View key={skill} style={styles.summaryRow}>
                    <Copy style={{ flex: 1 }}>{skill}</Copy>
                    <Copy muted>
                      {data.assessments?.some((a) => a.skill === skill.toLowerCase())
                        ? "Test recorded"
                        : "Not assessed"}
                    </Copy>
                  </View>
                ),
              )}
            </View>
          </View>
        );
        break;
      case "snapshot":
        content = (
          <View style={{ gap: 16 }}>
            <Text
              accessibilityRole="header"
              style={[
                styles.heading,
                { fontSize: 24, lineHeight: 30, textAlign: "center" },
              ]}
            >
              Your Breakaway card
            </Text>
            <Copy muted style={{ textAlign: "center" }}>
              Choose your look.
            </Copy>
            <OnboardingPlayerCard
              name={name}
              position={answers.positionDetail ?? draft.position ?? "—"}
              look={answers.snapshotStyle}
              ratings={ratings}
            />
            <Copy muted style={{ textAlign: "center", fontSize: 12 }}>
              Saved test ratings. Unassessed skills show a dash.
            </Copy>
            <Text style={styles.smallLabel}>CHOOSE YOUR LOOK · OPTIONAL</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
            >
              {snapshotStyles.map((label) => (
                <Pressable
                  key={label}
                  accessibilityRole="radio"
                  accessibilityLabel={`${label} snapshot style`}
                  aria-checked={answers.snapshotStyle === label}
                  accessibilityState={{
                    checked: answers.snapshotStyle === label,
                    selected: answers.snapshotStyle === label,
                  }}
                  onPress={() => {
                    haptic("selection");
                    answer({ snapshotStyle: label });
                  }}
                  style={{
                    minHeight: 127,
                    width: 86,
                    borderWidth: 1,
                    borderColor:
                      answers.snapshotStyle === label ? colors.lime : "#FFFFFF18",
                    borderRadius: 12,
                    backgroundColor: "#FFFFFF04",
                    padding: 7,
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ width: 70, height: 91 }}>
                    <PlayerCardFinish look={label} />
                    {answers.snapshotStyle === label && (
                      <View
                        style={{
                          position: "absolute",
                          top: 0,
                          right: -4,
                          backgroundColor: colors.lime,
                          borderRadius: 12,
                          padding: 2,
                        }}
                      >
                        <Check size={14} color={colors.background} />
                      </View>
                    )}
                  </View>
                  <Copy style={{ fontSize: 11, lineHeight: 16 }}>{label}</Copy>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );
        break;
      case "plan":
        content = (
          <View style={{ gap: 20 }}>
            <Tag>Your session</Tag>
            <Heading>Ready when you are{greeting}.</Heading>
            <Copy muted>
              {draft.minutes} minutes · {draft.goal}
            </Copy>
            <View style={styles.panel}>
              <SummaryRow label="Warm-up" value="2:00" />
              {ids.map((id) => (
                <SummaryRow
                  key={id}
                  label={drills.find((d) => d.id === id)?.name ?? id}
                  value={time(getDrillDuration(draft.minutes ?? 15, ids.length))}
                />
              ))}
            </View>
            <Copy muted style={styles.footnote}>
              {nextData?.planCustomized
                ? "Your custom drill choices stay in place. "
                : ""}
              You can change your plan any time.
            </Copy>
          </View>
        );
        break;
    }
  const canSkip =
    optionalQuestion ||
    [
      "clubName",
      "measurements",
      "playstyle",
      "aspirations",
      "allergies",
      "notifications",
      "schedule",
    ].includes(step);
  const buttonLabel =
    step === "welcome"
      ? "Get started"
      : step === "intro"
        ? "I’m ready"
        : step === "plan"
          ? "Start my plan"
          : step === "brief"
            ? "Yes, let’s go!"
            : step === "aspirations"
              ? "Confirm"
              : step === "commitment"
                ? "Lock it in"
                : step === "schedule"
                  ? "Save my week"
                  : "Continue";
  const showTitle = !!title;
  return (
    <KeyboardAvoidingView
      style={[styles.root, purpleScreen && { backgroundColor: "#190D26" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />
      {photoScreen ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image
            source={photo}
            contentFit="cover"
            contentPosition={{ left: "50%", top: "50%" }}
            style={[
              StyleSheet.absoluteFill,
              { opacity: step === "welcome" ? 0.63 : 0.22 },
            ]}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: step === "welcome" ? "#080F0B55" : "#080F0B66" },
            ]}
          />
        </View>
      ) : null}
      <View style={[styles.header, { paddingTop: inset.top + 8 }]}>
        {purpleScreen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => {
              haptic("light");
              setIndex((i) => Math.max(i - 1, 0));
            }}
            style={styles.iconButton}
          >
            <ArrowLeft size={23} color={colors.white} />
          </Pressable>
        ) : (
          <Text style={styles.brand}>
            break<Text style={{ color: colors.lime }}>away</Text>
          </Text>
        )}
        {replay ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel onboarding"
            onPress={() => {
              haptic("light");
              onComplete?.();
            }}
            style={styles.iconButton}
          >
            <X size={22} color={colors.white} />
          </Pressable>
        ) : null}
      </View>
      {index > 0 && !purpleScreen ? (
        <View style={styles.progressRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => {
              haptic("light");
              setIndex((i) => i - 1);
            }}
            style={styles.iconButton}
          >
            <ArrowLeft size={23} color={colors.white} />
          </Pressable>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Onboarding progress"
            aria-valuemin={0}
            aria-valuemax={flowSteps.length - 1}
            aria-valuenow={index}
            accessibilityValue={{ min: 0, max: flowSteps.length - 1, now: index }}
            style={styles.progressTrack}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${(index / (flowSteps.length - 1)) * 100}%` },
              ]}
            />
          </View>
        </View>
      ) : null}
      <ScrollView
        key={step}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { flexGrow: 1 },
          step === "welcome" && { paddingTop: 0 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {showTitle ? (
          <View style={{ gap: 10, marginBottom: 30, paddingTop: 6 }}>
            <Text accessibilityRole="header" style={styles.question}>
              {title![0]}
            </Text>
            <Copy style={{ textAlign: "center", fontSize: 18, lineHeight: 26 }}>
              {title![1]}
            </Copy>
          </View>
        ) : null}
        {content}
      </ScrollView>
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(inset.bottom, 16) },
          purpleScreen && { backgroundColor: "#190D26" },
          step === "welcome" && { backgroundColor: "transparent" },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
          accessibilityState={{ disabled: !ready }}
          aria-disabled={!ready}
          disabled={!ready}
          onPress={advance}
          style={({ pressed }) => [
            styles.primary,
            !ready && styles.primaryDisabled,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.primaryText, !ready && { color: colors.muted }]}>
            {buttonLabel}
          </Text>
          <ArrowRight size={20} color={ready ? colors.background : colors.muted} />
        </Pressable>
        {canSkip ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Skip ${step}`}
            onPress={() => {
              if (step === "schedule" && invalidWeekTime) {
                answer({ week: undefined });
              }
              advance();
            }}
            style={styles.skip}
          >
            <Copy muted style={{ fontSize: 13 }}>
              Skip for now
            </Copy>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
export function ReplayOnboarding({ navigation }: { navigation: any }) {
  return <Onboarding replay onComplete={() => navigation.goBack()} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 24,
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    fontFamily: "Archivo_700Bold",
    fontSize: 24,
    lineHeight: 32,
    color: colors.white,
    letterSpacing: -0.8,
  },
  progressRow: {
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 12,
  },
  iconButton: { height: 48, width: 48, justifyContent: "center", alignItems: "center" },
  progressTrack: {
    height: 3,
    flex: 1,
    backgroundColor: "#263226",
    borderRadius: 2,
    marginRight: 12,
  },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: colors.white },
  content: { padding: 24, paddingTop: 12, paddingBottom: 24 },
  copy: {
    fontFamily: "Archivo_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: colors.white,
  },
  heading: {
    fontFamily: "Archivo_700Bold",
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -0.7,
    color: colors.white,
  },
  question: {
    fontFamily: "Archivo_700Bold",
    fontSize: 28,
    lineHeight: 35,
    letterSpacing: -0.4,
    color: colors.white,
    textAlign: "center",
  },
  welcomeTitle: {
    fontFamily: "Archivo_700Bold",
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.1,
    color: colors.white,
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#253319",
    borderWidth: 1,
    borderColor: "#3B4F23",
  },
  tagText: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.6,
    color: colors.lime,
  },
  accentRule: { width: 88, height: 3, backgroundColor: colors.lime, borderRadius: 2 },
  purplePanel: { backgroundColor: "#281A35", borderColor: "#4B355A" },
  panel: {
    backgroundColor: "#151E16E8",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 16,
  },
  option: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionSelected: { borderColor: colors.lime, backgroundColor: colors.selected },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#87947F",
    alignItems: "center",
    justifyContent: "center",
  },
  number: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 12,
    color: colors.background,
  },
  note: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.selected,
    alignItems: "center",
    justifyContent: "center",
  },
  footnote: { fontSize: 12, lineHeight: 18, marginTop: 16 },
  input: {
    fontFamily: "Archivo_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: colors.white,
    backgroundColor: colors.panel,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 60,
  },
  pitch: {
    height: 430,
    marginHorizontal: 2,
    marginVertical: 12,
    backgroundColor: "#151E16",
    borderRadius: 14,
  },
  position: {
    position: "absolute",
    width: 48,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "#2C352A",
    borderWidth: 1,
    borderColor: "#4E5A46",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: -24 }, { translateY: -22 }],
  },
  positionSelected: { backgroundColor: colors.lime, borderColor: colors.lime },
  positionText: { fontFamily: "Archivo_600SemiBold", fontSize: 12, color: colors.white },
  positionHero: {
    fontFamily: "Archivo_700Bold",
    fontSize: 84,
    lineHeight: 92,
    color: colors.lime,
    letterSpacing: -2,
  },
  styleCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  cardTitle: {
    fontFamily: "Archivo_700Bold",
    fontSize: 21,
    lineHeight: 27,
    color: colors.white,
  },
  skillPill: {
    borderRadius: 12,
    backgroundColor: colors.selected,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  segment: {
    flexDirection: "row",
    alignSelf: "center",
    padding: 4,
    borderRadius: 10,
    backgroundColor: colors.panel,
  },
  segmentItem: {
    minWidth: 108,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  smallLabel: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1,
    color: colors.muted,
  },
  bigNumber: {
    fontFamily: "Archivo_700Bold",
    fontSize: 38,
    lineHeight: 44,
    color: colors.white,
  },
  wheelRow: {
    height: 52,
    width: "100%",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  comparisonBar: {
    height: 210,
    width: "100%",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    minHeight: 48,
    paddingVertical: 10,
  },
  day: {
    flex: 1,
    minWidth: 44,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontFamily: "Archivo_600SemiBold", fontSize: 15, color: colors.white },
  scheduleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 4 },
  scheduleBlock: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: "#1A241A",
    padding: 12,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  fuelRow: {
    flexDirection: "row",
    gap: 16,
    paddingVertical: 16,
    alignItems: "flex-start",
  },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 0, backgroundColor: "#080F0BF2" },
  primary: {
    minHeight: 56,
    borderRadius: 30,
    backgroundColor: colors.lime,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 22,
  },
  primaryDisabled: { backgroundColor: "#293426" },
  primaryText: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 16,
    lineHeight: 24,
    color: colors.background,
    textAlign: "center",
  },
  skip: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 2 },
});
