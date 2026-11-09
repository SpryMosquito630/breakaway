import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  AppState,
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
import { useIsFocused } from "@react-navigation/native";
import { OnboardingFeedbackToast } from "../components/OnboardingFeedbackToast";
import {
  feedbackAfterAnswer,
  feedbackAfterContinue,
  type OnboardingFeedback,
} from "../domain/onboardingFeedback";
import { MeasurementWheel } from "../components/MeasurementWheel";
import {
  canonicalMeasurement,
  displayMeasurement,
  measurementValues,
  measurementRowHeight,
  imperialFeet,
  inchesForFeet,
  imperialHeightFromCm,
  chooseImperialHeightPart,
  formatImperialHeight,
  type ImperialHeightDraft,
} from "../domain/measurementWheel";
import { WelcomeBackground } from "../components/WelcomeBackground";
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
  Zap,
  Flame,
  Brain,
  Heart,
  Star,
  TrendingUp,
  ChevronDown,
  GraduationCap,
  Landmark,
  Trophy,
  Bell,
} from "lucide-react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { useApp } from "../state/AppState";
import { days, goals, type Position, time, getDrillDuration } from "../domain/model";
import { profileFromDraft } from "../domain/onboarding";
import {
  answerOptions,
  patchFlowDraft,
  aspirations,
  allergyOptions,
  snapshotStyles,
  weekActivities,
  flowSteps,
  autoAdvanceSteps,
  secondaryActionForStep,
  finishOnboardingDraft,
  isFlowStepReady,
  type FlowDraft,
  type OnboardingAnswers,
} from "../domain/onboardingFlow";
import { playerStylesForPosition } from "../domain/playerStyles";
import { playerStyleImages } from "../data/playerStyleImages";
import {
  createQuestionAdvance,
  createSceneTransition,
  sceneTransitionForSteps,
} from "../domain/questionAdvance";
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
  panel: "#131714",
  selected: "#1E2B1A",
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
// A quiet light pool and pitch plane shared by the reference onboarding scenes.
function OnboardingAtmosphere({ purple }: { purple: boolean }) {
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      viewBox="0 0 444 960"
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient id="onboarding-base" x1="0" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor={purple ? "#24112D" : "#151D13"} />
          <Stop offset="1" stopColor={purple ? "#180C20" : "#0D130E"} />
        </LinearGradient>
        <RadialGradient
          id="onboarding-light"
          cx={purple ? "0" : "1"}
          cy="0"
          rx="0.95"
          ry="0.75"
        >
          <Stop
            offset="0"
            stopColor={purple ? "#60266B" : "#35451A"}
            stopOpacity={purple ? 0.5 : 0.35}
          />
          <Stop offset="1" stopColor={purple ? "#60266B" : "#35451A"} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="onboarding-stage" cx="0.65" cy="1" rx="0.8" ry="0.3">
          <Stop offset="0" stopColor="#9036A4" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#9036A4" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="onboarding-field" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#61366C" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#1D1127" stopOpacity="0.15" />
        </LinearGradient>
      </Defs>
      <Rect width="444" height="960" fill="url(#onboarding-base)" />
      <Rect width="444" height="960" fill="url(#onboarding-light)" />
      {purple ? (
        <>
          <Rect width="444" height="960" fill="url(#onboarding-stage)" />
          <Ellipse cx="228" cy="933" rx="310" ry="102" fill="url(#onboarding-field)" />
          <Path
            d="M147 833V778H296V833 M153 831V784H290V831 M147 778L158 789H285L296 778"
            stroke="#AC66BD"
            strokeWidth="2"
            opacity="0.3"
            fill="none"
          />
          <Path
            d="M147 833L34 960 M296 833L428 960 M97 889H355 M51 935H403"
            stroke="#9C65AC"
            strokeWidth="1"
            opacity="0.1"
            fill="none"
          />
          {[
            [63, 213, 2],
            [327, 153, 3],
            [384, 293, 1.6],
            [25, 473, 1.5],
            [307, 391, 1],
            [414, 768, 2.4],
            [80, 627, 1],
            [258, 229, 1.5],
            [364, 566, 1],
          ].map(([cx, cy, r], i) => (
            <Circle key={i} cx={cx} cy={cy} r={r} fill="#B94ACA" opacity="0.32" />
          ))}
        </>
      ) : null}
    </Svg>
  );
}
function BarFill({ id, top, bottom }: { id: string; top: string; bottom: string }) {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="1" stopColor={bottom} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" rx="18" fill={`url(#${id})`} />
    </Svg>
  );
}
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
function Tag({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <View style={[styles.tag, center && { alignSelf: "center" }]}>
      <Text style={styles.tagText}>• {children}</Text>
    </View>
  );
}
function FocusInput({
  purple = false,
  style,
  onFocus,
  onBlur,
  ...props
}: React.ComponentProps<typeof TextInput> & { purple?: boolean }) {
  const [focused, setFocused] = useState(false);
  const accent = purple ? "#BE6BDA" : colors.lime;
  return (
    <TextInput
      {...props}
      selectionColor={accent}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[style, focused && { borderColor: accent }]}
    />
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
  icon: Icon,
  editorial,
  purple = false,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  number?: number;
  color?: string;
  multiple?: boolean;
  icon?: typeof Target;
  editorial?: "level" | "commitment";
  purple?: boolean;
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
        number ? styles.numberedOption : null,
        editorial ? styles.editorialOption : null,
        editorial === "commitment" ? { minHeight: 68 } : null,
        color ? [styles.goalOption, { backgroundColor: color }] : null,
        selected && styles.optionSelected,
        selected && color ? { backgroundColor: color } : null,
        purple ? styles.purpleOption : null,
        purple && selected ? styles.purpleOptionSelected : null,
        pressed && { opacity: 0.78 },
      ]}
    >
      {Icon ? (
        <View style={editorial ? styles.levelIcon : styles.goalIcon}>
          <Icon size={editorial ? 21 : 18} color={editorial ? "#C3CABF" : colors.white} />
        </View>
      ) : null}
      {number ? (
        <View style={[styles.number, selected && { backgroundColor: colors.lime }]}>
          {selected ? (
            <Check size={14} color={colors.background} strokeWidth={3} />
          ) : (
            <Text style={styles.numberText}>{number}</Text>
          )}
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 4 }}>
        <Copy
          style={{
            fontFamily: number || editorial ? "Archivo_600SemiBold" : "Archivo_500Medium",
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {label}
        </Copy>
        {sub ? (
          <Copy
            muted
            style={{ fontSize: editorial ? 11 : 12, lineHeight: editorial ? 16 : 17 }}
          >
            {sub}
          </Copy>
        ) : null}
      </View>
      {!number ? (
        <View
          style={[
            styles.radio,
            color ? styles.goalRadio : null,
            editorial ? styles.editorialRadio : null,
            purple ? { borderColor: "#C8A6D288" } : null,
            selected && {
              backgroundColor: purple ? "#9F37C1" : colors.lime,
              borderColor: purple ? "#B96EE1" : colors.lime,
            },
          ]}
        >
          {selected ? (
            <Check
              size={14}
              color={purple ? colors.white : colors.background}
              strokeWidth={3}
            />
          ) : null}
        </View>
      ) : null}
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
export function Onboarding({
  onComplete,
  replay = false,
  focused = true,
}: { onComplete?: () => void; replay?: boolean; focused?: boolean } = {}) {
  const { data, update, catalog: drills } = useApp();
  const reminders = useReminders();
  const [remindersRequested, setRemindersRequested] = useState(false);
  const inset = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Measured from the 444×960 reference: 310×669 card, photo about 390px tall.
  const playerCardWidth = Math.min(width * 0.7, 360);
  const playerCardHeight = Math.max(500, height * 0.697);
  const playerPhotoHeight = playerCardHeight * 0.58;
  const playerCardInset = (width - playerCardWidth) / 2;
  const playerCardGap = width * 0.074;
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<FlowDraft>({});
  const [imperial, setImperial] = useState(false);
  const [heightPartsDraft, setHeightPartsDraft] = useState<ImperialHeightDraft>({});
  const heightPartsRef = useRef<ImperialHeightDraft>({});
  const [activeMeasurementWheel, setActiveMeasurementWheel] = useState<string | null>(
    null,
  );
  const [showPhotoCredits, setShowPhotoCredits] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<OnboardingFeedback | null>(null);
  const [reducedMotionEnabled, setReducedMotionEnabled] = useState(true);
  const [footerMeasure, setFooterMeasure] = useState({ index: -1, height: 0 });
  const [pendingAdvance] = useState(() => createQuestionAdvance());
  const [sceneMotion] = useState(() => createSceneTransition());
  const [slide] = useState(() => new Animated.Value(1));
  const [outgoing, setOutgoing] = useState<{
    index: number;
    node: React.ReactNode;
    direction: 1 | -1;
    motion: ReturnType<typeof sceneTransitionForSteps>;
  } | null>(null);
  const scene = useRef<React.ReactNode>(null);
  const transitionBusy = useRef(false);
  const currentIndex = useRef(0);
  const mounted = useRef(true);
  const foreground = useRef(AppState.currentState === "active");
  const focus = useRef(focused);
  const reduceMotion = useRef(true);
  const settleScene = () => {
    sceneMotion.cancel();
    transitionBusy.current = false;
    slide.setValue(1);
    if (mounted.current) setOutgoing(null);
  };
  const goTo = (next: number) => {
    pendingAdvance.cancel();
    const interrupted = transitionBusy.current;
    settleScene();
    if (next === currentIndex.current) return;
    if (
      !interrupted &&
      !reduceMotion.current &&
      focus.current &&
      foreground.current &&
      scene.current
    ) {
      transitionBusy.current = true;
      slide.setValue(0);
      setOutgoing({
        index: currentIndex.current,
        node: scene.current,
        direction: next > currentIndex.current ? 1 : -1,
        motion: sceneTransitionForSteps(flowSteps[currentIndex.current], flowSteps[next]),
      });
    }
    currentIndex.current = next;
    setIndex(next);
  };
  useLayoutEffect(() => {
    if (!outgoing) return;
    sceneMotion.start(
      (complete) => {
        const animation = Animated.timing(slide, {
          toValue: 1,
          duration: outgoing.motion.duration,
          easing: Easing.bezier(0.22, 0.61, 0.36, 1),
          useNativeDriver: Platform.OS !== "web",
        });
        animation.start(({ finished }) => {
          if (finished) complete();
        });
        return () => animation.stop();
      },
      () => {
        transitionBusy.current = false;
        slide.setValue(1);
        setOutgoing(null);
      },
    );
  }, [outgoing, sceneMotion, slide]);
  const goBack = () => {
    setFeedback(null);
    haptic("light");
    goTo(Math.max(0, currentIndex.current - 1));
  };
  useLayoutEffect(() => {
    focus.current = focused;
    if (!focused) {
      setFeedback(null);
      pendingAdvance.cancel();
      settleScene();
    }
  }, [focused, pendingAdvance]);
  useEffect(() => {
    mounted.current = true;
    let preferenceChanged = false;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted.current && !preferenceChanged) {
          reduceMotion.current = enabled;
          setReducedMotionEnabled(enabled);
        }
      })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        preferenceChanged = true;
        reduceMotion.current = enabled;
        setReducedMotionEnabled(enabled);
        if (enabled) settleScene();
      },
    );
    const state = AppState.addEventListener("change", (value) => {
      foreground.current = value === "active";
      if (!foreground.current) {
        setFeedback(null);
        pendingAdvance.cancel();
        settleScene();
      }
    });
    return () => {
      mounted.current = false;
      pendingAdvance.cancel();
      settleScene();
      motion.remove();
      state.remove();
    };
  }, [pendingAdvance]);
  useEffect(() => {
    if (Platform.OS !== "android" || index === 0) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [index]);
  const step = flowSteps[index];
  const automatic = autoAdvanceSteps.includes(step);
  const answers = draft.answers ?? {};
  const availablePlayerStyles = playerStylesForPosition(
    draft.position,
    answers.positionDetail,
  );
  const availablePhotoCredits = playerPhotoCredits.filter((credit) =>
    availablePlayerStyles.some((player) => `${player.id}.jpg` === credit.file),
  );
  const profile = profileFromDraft(draft);
  const field = fieldForStep.has(step) ? (step as keyof typeof answerOptions) : undefined;
  const selected = field ? answers[field] : undefined;
  const invalidWeekTime = Object.values(answers.week ?? {}).some(
    (row) => row?.time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.time),
  );
  const ready = isFlowStepReady(draft, step) && (step !== "schedule" || !invalidWeekTime);
  const ratings = skillProfile(false, data.assessments ?? []);
  const matchCount = Object.values(answers.week ?? {}).filter(
    (row) => row?.activity === "Match",
  ).length;
  const patch = (next: Partial<FlowDraft>) => {
    if (
      currentIndex.current !== index ||
      transitionBusy.current ||
      !mounted.current ||
      !focus.current ||
      !foreground.current
    )
      return;
    const apply = () => {
      setDraft((d) => patchFlowDraft(d, next));
      const message = feedbackAfterAnswer(step, patchFlowDraft(draft, next));
      if (message) setFeedback(message);
    };
    if (!automatic) {
      apply();
      return;
    }
    pendingAdvance.choose(
      apply,
      () => {
        if (
          mounted.current &&
          focus.current &&
          foreground.current &&
          currentIndex.current === index
        )
          goTo(index + 1);
      },
      reduceMotion.current ? 0 : 180,
    );
  };
  const answer = (next: Partial<OnboardingAnswers>) => patch({ answers: next });
  const heightParts =
    answers.heightCm === undefined
      ? heightPartsDraft
      : imperialHeightFromCm(answers.heightCm);
  const chooseHeightPart = (part: keyof ImperialHeightDraft, value: number) => {
    const previous = heightPartsRef.current;
    const next = chooseImperialHeightPart(previous, part, value);
    heightPartsRef.current = next.parts;
    setHeightPartsDraft(next.parts);
    answer({ heightCm: next.centimeters });
  };
  const chooseMetricHeight = (value: number) => {
    const centimeters = canonicalMeasurement("height", value, false);
    const parts = imperialHeightFromCm(centimeters);
    heightPartsRef.current = parts;
    setHeightPartsDraft(parts);
    answer({ heightCm: centimeters });
  };
  const wheelInteraction = (name: string, active: boolean) =>
    setActiveMeasurementWheel((current) =>
      active ? name : current === name ? null : current,
    );

  const advance = () => {
    if (currentIndex.current !== index || transitionBusy.current) return;
    pendingAdvance.cancel();
    if (step === "plan") {
      if (!profile) return;
      haptic("success");
      update((st) => finishOnboardingDraft(st, draft, drills, replay) ?? st);
      if (remindersRequested) void reminders.setEnabled(true);
      onComplete?.();
    } else {
      const message = feedbackAfterContinue(step, draft);
      if (message) setFeedback(message);
      haptic("medium");
      goTo(Math.min(index + 1, flowSteps.length - 1));
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
    "commitment",
    "positionConfirm",
    "assessment",
    "strengths",
    "growth",
    "fuel",
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
          <View
            style={{ gap: 12, marginBottom: 16, paddingTop: Math.max(20, height * 0.09) }}
          >
            <Tag>Your level</Tag>
            <Heading>What are you{"\n"}playing at?</Heading>
            <Copy muted>Your context. Your starting point.</Copy>
          </View>
        ) : null}
        {step === "commitment" ? (
          <View
            style={{ gap: 12, marginBottom: 18, paddingTop: Math.max(20, height * 0.09) }}
          >
            <Tag>Your commitment</Tag>
            <Heading>How far are you{"\n"}taking this?</Heading>
            <Copy muted>Choose what you can realistically protect.</Copy>
          </View>
        ) : null}
        <View style={{ gap: 12 }}>
          {options.map((option, i) => (
            <Option
              key={option}
              label={option}
              editorial={
                step === "level"
                  ? "level"
                  : step === "commitment"
                    ? "commitment"
                    : undefined
              }
              icon={
                step === "level"
                  ? [GraduationCap, Landmark, Shield, Trophy, Footprints][i]
                  : undefined
              }
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
                  "bodyGoal",
                  "foodSource",
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
            <Text style={styles.welcomeTitle}>Getting better{"\n"}starts here.</Text>
            <Copy>Individual practice. A clear plan. Your progress.</Copy>
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
            <FocusInput
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
                    patch({ position: p.position, answers: { positionDetail: p.short } });
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
                patch({
                  position: "Still exploring",
                  answers: { positionDetail: "Exploring" },
                });
              }}
            />
          </View>
        );
        break;
      case "positionConfirm":
        content = (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              minHeight: height * 0.65,
              paddingBottom: height * 0.04,
            }}
          >
            <View style={styles.positionConfirmPanel}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <CircleDot size={16} color={colors.lime} />
                <Text style={styles.tagText}>
                  {(draft.position === "Still exploring"
                    ? "YOUR POSITION"
                    : (draft.position ?? "YOUR POSITION")
                  ).toUpperCase()}
                </Text>
              </View>
              <Copy
                style={{
                  fontFamily: "Archivo_600SemiBold",
                  fontSize: 16,
                  lineHeight: 22,
                }}
              >
                {draft.position === "Still exploring"
                  ? "Room to find your game. Your first focus leads, with ball-work drills to help you explore."
                  : `Your ${draft.position?.toLowerCase()} focus. Your first goal leads, with supporting ball-work drills for your position.`}
              </Copy>
              {draft.position === "Goalkeeper" ? (
                <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
                  Ball work and distribution; no specialist keeper program.
                </Copy>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue"
                accessibilityState={{ disabled: !ready }}
                disabled={!ready}
                onPress={advance}
                style={({ pressed }) => [
                  styles.primary,
                  !ready && styles.primaryDisabled,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.primaryText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        );
        break;
      case "playstyle":
        content = (
          <>
            <ScrollView
              key={availablePlayerStyles.map((player) => player.id).join("-")}
              horizontal
              pagingEnabled={Platform.OS !== "web"}
              showsHorizontalScrollIndicator={false}
              style={{
                marginHorizontal: -24,
                marginTop: Math.max(24, height * 0.044 - 8),
                flexGrow: 0,
                flexShrink: 0,
                ...(Platform.OS === "web" ? { scrollSnapType: "x mandatory" } : {}),
              }}
              contentContainerStyle={{
                paddingHorizontal: playerCardInset,
                gap: playerCardGap,
                alignItems: "stretch",
              }}
              snapToInterval={playerCardWidth + playerCardGap}
              decelerationRate="fast"
            >
              {availablePlayerStyles.map((player) => (
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
                    {
                      width: playerCardWidth,
                      minHeight: playerCardHeight,
                      ...(Platform.OS === "web" ? { scrollSnapAlign: "center" } : {}),
                    },
                    answers.playstyle === player.name && { borderColor: colors.lime },
                  ]}
                >
                  <View>
                    <Image
                      source={playerStyleImages[player.id]}
                      contentFit="cover"
                      contentPosition="center"
                      accessibilityLabel={`${player.name}, playstyle inspiration`}
                      style={{ width: "100%", height: playerPhotoHeight }}
                    />
                    <Svg
                      pointerEvents="none"
                      width="100%"
                      height={72}
                      style={{ position: "absolute", bottom: 0 }}
                    >
                      <Defs>
                        <LinearGradient
                          id={`photo-fade-${player.id}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <Stop offset="0" stopColor="#111810" stopOpacity={0} />
                          <Stop offset="0.6" stopColor="#111810" stopOpacity={0} />
                          <Stop offset="0.85" stopColor="#111810" stopOpacity={0.12} />
                          <Stop offset="1" stopColor="#111810" stopOpacity={0.38} />
                        </LinearGradient>
                      </Defs>
                      <Rect
                        width="100%"
                        height="100%"
                        fill={`url(#photo-fade-${player.id})`}
                      />
                    </Svg>
                    <View style={styles.playstylePosition}>
                      <Text style={styles.playstylePositionText}>{player.position}</Text>
                    </View>
                    {answers.playstyle === player.name ? (
                      <View style={styles.playstyleCheck}>
                        <Check size={16} color={colors.background} />
                      </View>
                    ) : null}
                  </View>
                  <View style={{ padding: 14, paddingTop: 12, gap: 6 }}>
                    <Text style={styles.playstyleName}>{player.name}</Text>
                    <Text
                      style={{
                        fontFamily: "Archivo_600SemiBold",
                        fontSize: 10,
                        lineHeight: 15,
                        color: colors.lime,
                        letterSpacing: 0.7,
                      }}
                    >
                      {player.role}
                    </Text>
                    <Copy muted style={{ fontSize: 13, lineHeight: 17 }}>
                      {player.description}
                    </Copy>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                      {player.tags.map((t) => (
                        <View
                          key={t}
                          style={[
                            styles.skillPill,
                            { paddingHorizontal: 7, paddingVertical: 3 },
                          ]}
                        >
                          <Copy style={{ fontSize: 9, lineHeight: 12 }}>{t}</Copy>
                        </View>
                      ))}
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
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
                {availablePhotoCredits.map((credit) => (
                  <View key={credit.file} style={{ gap: 2, paddingTop: 8 }}>
                    <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
                      {`${availablePlayerStyles.find((player) => `${player.id}.jpg` === credit.file)?.name} · ${credit.author}`}
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
                  patch({
                    experience: i === 0 ? "New to training" : "Some experience",
                    answers: { years: label },
                  });
                }}
              />
            ))}
          </View>
        );
        break;
      case "measurements":
        content = (
          <View>
            <Text accessibilityRole="header" style={styles.measurementTitle}>
              Height & weight
            </Text>
            <Copy
              muted
              style={{ textAlign: "center", fontSize: 13, lineHeight: 18, marginTop: 8 }}
            >
              Optional · Saved only on this device.
            </Copy>
            <View style={[styles.segment, { marginTop: 14 }]}>
              {[false, true].map((mode) => (
                <Pressable
                  key={String(mode)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: imperial === mode }}
                  aria-pressed={imperial === mode}
                  onPress={() => {
                    haptic("selection");
                    setImperial(mode);
                  }}
                  style={[
                    styles.segmentItem,
                    imperial === mode && { backgroundColor: "#293128" },
                  ]}
                >
                  <Copy
                    style={{
                      fontSize: 12,
                      lineHeight: 18,
                      fontFamily: "Archivo_500Medium",
                    }}
                  >
                    {mode ? "Imperial" : "Metric"}
                  </Copy>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 22, marginTop: 10 }}>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={styles.measurementLabel}>HEIGHT</Text>
                <Text style={styles.measurementReadout}>
                  {imperial
                    ? formatImperialHeight(heightParts)
                    : (displayMeasurement("height", answers.heightCm, false) ?? "–")}
                </Text>
                <Text style={styles.measurementUnit}>{imperial ? "ft/in" : "cm"}</Text>
                <View
                  style={{ flexDirection: "row", gap: 5, width: "100%", marginTop: 12 }}
                >
                  {imperial ? (
                    <>
                      <MeasurementWheel
                        key="height-feet"
                        kind="height"
                        label="Feet"
                        unit="ft"
                        values={imperialFeet}
                        value={heightParts.feet}
                        showReadout={false}
                        formatValue={(value) => `${value}'`}
                        onChange={(value) => chooseHeightPart("feet", value)}
                        onInteractionChange={(active) => wheelInteraction("feet", active)}
                      />
                      <MeasurementWheel
                        key={`height-inches-${inchesForFeet(heightParts.feet)[0]}-${inchesForFeet(heightParts.feet).at(-1)}`}
                        kind="height"
                        label="Inches"
                        unit="in"
                        values={inchesForFeet(heightParts.feet)}
                        value={heightParts.inches}
                        showReadout={false}
                        formatValue={(value) => `${value}"`}
                        onChange={(value) => chooseHeightPart("inches", value)}
                        onInteractionChange={(active) =>
                          wheelInteraction("inches", active)
                        }
                      />
                    </>
                  ) : (
                    <MeasurementWheel
                      key="height-metric"
                      kind="height"
                      label="Height"
                      unit="cm"
                      values={measurementValues("height", false)}
                      value={displayMeasurement("height", answers.heightCm, false)}
                      showReadout={false}
                      onChange={chooseMetricHeight}
                      onInteractionChange={(active) => wheelInteraction("height", active)}
                    />
                  )}
                </View>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={styles.measurementLabel}>WEIGHT</Text>
                <Text style={styles.measurementReadout}>
                  {displayMeasurement("weight", answers.weightKg, imperial) ?? "–"}
                </Text>
                <Text style={styles.measurementUnit}>{imperial ? "lbs" : "kg"}</Text>
                <View
                  style={{
                    width: "100%",
                    height: measurementRowHeight * 3,
                    marginTop: 12,
                  }}
                >
                  <MeasurementWheel
                    key={`weight-${imperial ? "imperial" : "metric"}`}
                    kind="weight"
                    label="Weight"
                    unit={imperial ? "lbs" : "kg"}
                    values={measurementValues("weight", imperial)}
                    value={displayMeasurement("weight", answers.weightKg, imperial)}
                    showReadout={false}
                    onChange={(value) =>
                      answer({
                        weightKg: canonicalMeasurement("weight", value, imperial),
                      })
                    }
                    onInteractionChange={(active) => wheelInteraction("weight", active)}
                  />
                </View>
              </View>
            </View>
          </View>
        );
        break;
      case "planComparison":
        content = (
          <View style={{ gap: 24, paddingTop: 20 }}>
            <Heading>Random sessions don’t know your goal. A plan does.</Heading>
            <View
              style={{
                flexDirection: "row",
                gap: 20,
                alignItems: "flex-end",
                justifyContent: "center",
                paddingVertical: 24,
              }}
            >
              <View style={{ flex: 1, maxWidth: 100, gap: 12 }}>
                <View
                  style={[
                    styles.comparisonBar,
                    {
                      height: 122,
                      justifyContent: "flex-start",
                      padding: 14,
                      paddingTop: 18,
                    },
                  ]}
                >
                  <BarFill id="routine-random" top="#FA4765" bottom="#EB254A" />
                  <Copy
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      lineHeight: 18,
                      color: colors.background,
                    }}
                  >
                    Training at random
                  </Copy>
                </View>
                <Copy muted style={{ textAlign: "center", fontSize: 12, lineHeight: 18 }}>
                  Without a routine
                </Copy>
              </View>
              <View style={{ flex: 1, maxWidth: 100, gap: 12 }}>
                <View
                  style={[
                    styles.comparisonBar,
                    {
                      height: 228,
                      gap: 10,
                      justifyContent: "flex-start",
                      padding: 12,
                      paddingTop: 18,
                    },
                  ]}
                >
                  <BarFill id="routine-plan" top="#A6FF35" bottom="#14B84D" />
                  {["A clear focus", "Your chosen days", "Practice you can track"].map(
                    (label) => (
                      <View key={label} style={{ flexDirection: "row", gap: 8 }}>
                        <Check size={12} color={colors.background} />
                        <Copy
                          style={{
                            flex: 1,
                            fontSize: 12,
                            lineHeight: 18,
                            color: colors.background,
                          }}
                        >
                          {label}
                        </Copy>
                      </View>
                    ),
                  )}
                </View>
                <Copy style={{ textAlign: "center", fontSize: 12, lineHeight: 18 }}>
                  Your Breakaway plan
                </Copy>
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
          <View style={{ gap: 20, paddingTop: 16 }}>
            <Text accessibilityRole="header" style={styles.notificationHeading}>
              TURN ON REMINDERS.{"\n"}KEEP YOUR ROUTINE.
            </Text>
            <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
              Optional reminders on your training days.
            </Copy>
            <View style={styles.notificationScene}>
              <View style={styles.notificationPhone}>
                <View style={styles.notificationIsland} />
              </View>
              {[
                "Your next touch",
                "Keep your week moving",
                "Your practice, your pace",
              ].map((title, i) => (
                <View
                  key={title}
                  style={[
                    styles.notificationPreview,
                    {
                      top: 72 + i * 66,
                      left: 4 + i * 10,
                      right: 4 + i * 10,
                      opacity: 1 - i * 0.3,
                    },
                  ]}
                >
                  <View style={styles.notificationAppIcon}>
                    <Footprints size={23} color={colors.lime} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.notificationPreviewTitle}>{title}</Text>
                    <Text style={styles.notificationPreviewCopy}>
                      Your Breakaway session is ready.
                    </Text>
                  </View>
                  <Text style={{ color: "#B9BABA", fontSize: 9 }}>now</Text>
                </View>
              ))}
            </View>
            {reminders.supported ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Remind me to train"
                accessibilityState={{ checked: remindersRequested }}
                aria-checked={remindersRequested}
                onPress={() => {
                  haptic("selection");
                  setRemindersRequested((v) => !v);
                }}
                style={styles.reminderToggle}
              >
                <Bell size={16} color={colors.lime} />
                <Copy style={{ flex: 1, fontSize: 13 }}>Remind me on training days</Copy>
                <View
                  style={[
                    styles.radio,
                    remindersRequested && {
                      backgroundColor: colors.lime,
                      borderColor: colors.lime,
                    },
                  ]}
                >
                  {remindersRequested ? (
                    <Check size={12} color={colors.background} />
                  ) : null}
                </View>
              </Pressable>
            ) : (
              <Copy muted style={{ fontSize: 12 }}>
                Reminders work in the iOS and Android app.
              </Copy>
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
                  style={{ alignItems: "center", flex: 1, maxWidth: 105, gap: 12 }}
                >
                  <View
                    style={[
                      styles.comparisonBar,
                      {
                        height: 236,
                        justifyContent: "flex-start",
                        paddingHorizontal: 12,
                        paddingTop: 22,
                      },
                    ]}
                  >
                    <BarFill
                      id={`answers-${i}`}
                      top={i ? "#A6FF35" : "#457425"}
                      bottom={i ? "#16B64F" : "#0E4C29"}
                    />
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
          <View style={{ gap: 16 }}>
            <View style={{ alignItems: "center" }}>
              <Tag center>Your plan brief</Tag>
            </View>
            <Heading center>Let’s turn your answers into a week.</Heading>
            <View
              style={[
                styles.panel,
                styles.purplePanel,
                { backgroundColor: "#38402A55", gap: 8 },
              ]}
            >
              <Text style={styles.smallLabel}>YOU SAID</Text>
              <Copy style={{ fontFamily: "Archivo_500Medium" }}>
                {answers.commitment === "Steady"
                  ? "2–3 sessions a week"
                  : answers.commitment === "Serious"
                    ? "4–5 sessions a week"
                    : answers.commitment === "All in"
                      ? "Every day I can protect"
                      : "A week I can keep."}
              </Copy>
            </View>
            <View style={[styles.panel, styles.purplePanel]}>
              <Text style={[styles.smallLabel, { marginBottom: 6 }]}>BUILDING FROM</Text>
              <SummaryRow label="Focus" value={draft.goal ?? ""} />
              <SummaryRow label="Position" value={draft.position ?? ""} />
              <SummaryRow label="Experience" value={draft.experience ?? ""} />
              {answers.commitment ? (
                <SummaryRow label="Intention" value={answers.commitment} />
              ) : null}
            </View>
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
              <FocusInput
                purple
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
                  purple
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
          <View style={{ gap: 16 }}>
            <View style={{ alignItems: "center" }}>
              <Tag center>Your week</Tag>
            </View>
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
              <View
                style={{
                  gap: 6,
                  borderTopWidth: 1,
                  borderTopColor: "#FFFFFF08",
                  paddingTop: 12,
                }}
              >
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Footprints size={14} color={colors.lime} />
                  <Copy muted style={{ fontSize: 12, lineHeight: 18, width: 60 }}>
                    Training
                  </Copy>
                  <Copy style={{ flex: 1, fontSize: 12, lineHeight: 18 }}>
                    {draft.days?.length ? draft.days.join(" · ") : "Choose your days"}
                  </Copy>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <CalendarDays size={14} color={colors.muted} />
                  <Copy muted style={{ fontSize: 12, lineHeight: 18, width: 60 }}>
                    Recovery
                  </Copy>
                  <Copy style={{ flex: 1, fontSize: 12, lineHeight: 18 }}>
                    {draft.days?.length
                      ? days.filter((day) => !draft.days?.includes(day)).join(" · ") ||
                        "No days selected"
                      : "—"}
                  </Copy>
                </View>
              </View>
            </View>
          </View>
        );
        break;
      case "schedule":
        content = (
          <View style={{ gap: 18 }}>
            <View style={{ alignItems: "center" }}>
              <Tag center>Your week</Tag>
            </View>
            <Heading center>What’s already in it?</Heading>
            <Copy muted style={{ textAlign: "center" }}>
              Optional notes for your week. Your practice days stay as chosen.
            </Copy>
            <View style={[{ gap: 7 }]}>
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
                    <Copy
                      style={{
                        width: 38,
                        fontSize: 12,
                        fontFamily: "Archivo_600SemiBold",
                        color:
                          answers.week?.[day] && answers.week[day]?.activity !== "Rest"
                            ? colors.lime
                            : colors.muted,
                      }}
                    >
                      {day.toUpperCase()}
                    </Copy>
                    <View style={styles.scheduleBlock}>
                      <Copy muted={!answers.week?.[day]} style={{ flex: 1 }}>
                        {answers.week?.[day]?.activity ?? "Choose activity"}
                      </Copy>
                      <Copy muted style={{ fontSize: 12 }}>
                        {answers.week?.[day]?.time ?? ""}
                      </Copy>
                      <ChevronDown size={15} color={colors.muted} />
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
                        <FocusInput
                          purple
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
            <View
              style={[
                styles.purplePanel,
                { borderWidth: 1, flexDirection: "row", paddingVertical: 16 },
              ]}
            >
              {[
                [
                  Footprints,
                  Object.values(answers.week ?? {}).filter(
                    (entry) =>
                      entry?.activity === "Team training" ||
                      entry?.activity === "Other training",
                  ).length,
                  "noted sessions",
                  colors.lime,
                ],
                [CircleDot, matchCount, "matches", "#EF695D"],
                [
                  CalendarDays,
                  Object.values(answers.week ?? {}).filter(
                    (entry) => entry?.activity === "Rest",
                  ).length,
                  "rest",
                  colors.muted,
                ],
              ].map(([Icon, count, label, tint]) => {
                const SummaryIcon = Icon as typeof Target;
                return (
                  <View
                    key={String(label)}
                    style={{ flex: 1, alignItems: "center", gap: 5 }}
                  >
                    <SummaryIcon size={16} color={String(tint)} />
                    <Text style={[styles.cardTitle, { fontSize: 24, lineHeight: 28 }]}>
                      {String(count)}
                    </Text>
                    <Copy muted style={{ fontSize: 11, lineHeight: 16 }}>
                      {label === "noted sessions" && count === 1
                        ? "noted session"
                        : label === "matches" && count === 1
                          ? "match"
                          : String(label)}
                    </Copy>
                  </View>
                );
              })}
            </View>
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
          <View style={{ gap: 10 }}>
            <Heading center>Choose your goals</Heading>
            <Copy muted style={{ textAlign: "center", marginBottom: 12 }}>
              What matters to you? Select any, or skip.
            </Copy>
            {aspirations.map((label, i) => (
              <Option
                key={label}
                label={label}
                multiple
                icon={[Zap, Flame, CircleDot, Brain, Heart, Star, TrendingUp][i]}
                color={
                  [
                    "#246B2E",
                    "#801C2B",
                    "#42424F",
                    "#59276F",
                    "#216A5C",
                    "#896B15",
                    "#741B57",
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
          <View style={{ gap: 20, paddingTop: 6 }}>
            <Tag>Your fuel checklist</Tag>
            <Heading>Keep the basics close.</Heading>
            <View style={[styles.assessmentPanel, { gap: 8, paddingVertical: 20 }]}>
              <Text style={styles.smallLabel}>YOUR ROUTINE</Text>
              <Copy style={styles.cardTitle}>{answers.diet ?? "Your familiar food"}</Copy>
              <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
                {answers.foodSource ?? "Your usual meals, around your practice."}
              </Copy>
            </View>
            <View style={{ gap: 8 }}>
              <Copy style={{ fontFamily: "Archivo_600SemiBold" }}>Practice day</Copy>
              <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
                Keep water within reach. Plan around your usual meals.
              </Copy>
            </View>
            <View
              style={{ flexDirection: "row", gap: 9, justifyContent: "space-between" }}
            >
              {[
                [Droplets, "WATER"],
                [Utensils, "MEALS"],
                [CircleDot, "ROUTINE"],
                [Shield, "INGREDIENTS"],
              ].map(([Icon, label]) => {
                const FuelIcon = Icon as typeof Target;
                return (
                  <View
                    key={String(label)}
                    style={{ flex: 1, alignItems: "center", gap: 8 }}
                  >
                    <View
                      style={{
                        width: "100%",
                        aspectRatio: 1,
                        borderWidth: 3,
                        borderRadius: 100,
                        borderColor: colors.lime,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#10180ECC",
                      }}
                    >
                      <FuelIcon size={25} color={colors.white} />
                    </View>
                    <Text
                      style={{
                        fontFamily: "Archivo_600SemiBold",
                        fontSize: 8,
                        lineHeight: 12,
                        color: colors.muted,
                      }}
                    >
                      {String(label)}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Copy muted style={{ fontSize: 12, lineHeight: 19 }}>
              {answers.allergies?.length && !answers.allergies.includes("None of these")
                ? `Your reminder: ${answers.allergies.join(", ")}. Check ingredients yourself.`
                : "Check ingredients and your own dietary needs."}
            </Copy>
            <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
              A personal checklist. No calorie targets or meal plan.
            </Copy>
          </View>
        );
        break;
      case "assessment":
        content = (
          <View style={{ gap: 18, paddingTop: 6 }}>
            <Tag>Your answers</Tag>
            <Heading>Your starting point{greeting}.</Heading>
            <View style={styles.assessmentPanel}>
              {[
                ["Position", draft.position],
                ["Level", answers.level],
                ["Experience", answers.years ?? draft.experience],
                [
                  "Build",
                  answers.heightCm || answers.weightKg
                    ? [
                        answers.heightCm ? `${Math.round(answers.heightCm)} cm` : null,
                        answers.weightKg ? `${Math.round(answers.weightKg)} kg` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "Not shared",
                ],
                [
                  "Availability",
                  `${draft.days?.length ?? 0} days · ${draft.minutes ?? "—"} min`,
                ],
                ["Focus", draft.goal],
                ["Blocker", answers.blocker],
              ].map(([label, value]) => (
                <View
                  key={label}
                  style={{
                    flexDirection: "row",
                    gap: 9,
                    alignItems: "center",
                    minHeight: 27,
                  }}
                >
                  <Check size={13} color={colors.lime} />
                  <Copy muted style={{ flex: 1, fontSize: 12, lineHeight: 18 }}>
                    {label}
                  </Copy>
                  <Copy
                    style={{
                      maxWidth: "62%",
                      textAlign: "right",
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  >
                    {value ?? "Not answered"}
                  </Copy>
                </View>
              ))}
            </View>
            <Copy muted style={{ fontSize: 13, lineHeight: 20 }}>
              Your answers set the context. Skill ratings come from completed tests.
            </Copy>
          </View>
        );
        break;
      case "strengths":
        content = (
          <View style={{ gap: 18, paddingTop: 6 }}>
            <Tag>Your foundation</Tag>
            <Heading>This is what your plan is built on.</Heading>
            <Copy muted style={{ fontSize: 13, lineHeight: 20 }}>
              A focus you chose. A week you can repeat.
            </Copy>
            {[
              [
                "Your focus",
                draft.goal ?? "Your first focus",
                answers.playstyle
                  ? `Inspired by ${answers.playstyle}. ${answers.ambition ?? ""}`
                  : (answers.ambition ?? "A clear place to begin."),
              ],
              [
                "Your week",
                `${draft.days?.length ?? 0} days · ${draft.minutes ?? "—"} minutes`,
                draft.days?.join(" · ") ?? "Your chosen training days.",
              ],
            ].map(([label, value, detail]) => (
              <View
                key={label}
                style={[styles.assessmentPanel, { gap: 10, minHeight: 112 }]}
              >
                <Text style={styles.smallLabel}>{label.toUpperCase()}</Text>
                <Copy style={styles.cardTitle}>{value}</Copy>
                <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
                  {detail}
                </Copy>
              </View>
            ))}
            <View style={[styles.assessmentPanel, { gap: 8 }]}>
              <Text style={[styles.smallLabel, { color: colors.lime }]}>YOUR SETUP</Text>
              <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
                {draft.space} · {["Ball", ...(draft.gear ?? [])].join(" · ")}
              </Copy>
            </View>
          </View>
        );
        break;
      case "growth":
        content = (
          <View style={{ gap: 16, paddingTop: 6 }}>
            <Tag>Your next step</Tag>
            <Heading>Give your progress a starting line.</Heading>
            <Copy muted style={{ fontSize: 13, lineHeight: 20 }}>
              Record real tests in Skill profile, whenever you’re ready.
            </Copy>
            {[
              ["pace", "physical"],
              ["passing", "dribbling"],
              ["shooting", "defending"],
            ].map((group) => (
              <View
                key={group[0]}
                style={[styles.assessmentPanel, { gap: 10, borderColor: "#74816C33" }]}
              >
                {group.map((id) => {
                  const skill = ratings.skills.find((item) => item.id === id)!;
                  return (
                    <View key={id} style={{ gap: 6 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                        }}
                      >
                        <Copy style={{ fontSize: 13, lineHeight: 18 }}>{skill.name}</Copy>
                        <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
                          {skill.rating === null ? "Not assessed" : `${skill.rating}`}
                        </Copy>
                      </View>
                      <View
                        style={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: "#FFFFFF0A",
                          overflow: "hidden",
                        }}
                      >
                        {skill.rating !== null ? (
                          <View
                            style={{
                              height: 4,
                              width: `${skill.rating}%`,
                              borderRadius: 2,
                              backgroundColor: colors.muted,
                            }}
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
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
            <View style={{ paddingTop: 28, paddingBottom: 10 }}>
              <OnboardingPlayerCard
                name={name}
                position={answers.positionDetail ?? draft.position ?? "—"}
                look={answers.snapshotStyle}
                ratings={ratings}
              />
            </View>
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
  const secondaryLabel = secondaryActionForStep(step);
  const canSkip = secondaryLabel !== null;
  const buttonLabel =
    step === "diet" || step === "allergies" || step === "comparison"
      ? "Next"
      : step === "assessment"
        ? "Show me"
        : step === "strengths"
          ? "Now the harder part"
          : step === "growth"
            ? "Set my starting line"
            : step === "fuel"
              ? "Let’s build it"
              : step === "welcome"
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
  const currentScene = (
    <View style={{ flex: 1 }}>
      {step === "playstyle" ? (
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: Math.max(16, height * 0.0875 - inset.top - 48),
          }}
        >
          <Text accessibilityRole="header" style={styles.playstyleHeading}>
            Which playstyle fits you best?
          </Text>
          <Copy
            muted
            style={{ textAlign: "center", marginTop: 8, fontSize: 14, lineHeight: 20 }}
          >
            Pick what feels like your game.
          </Copy>
        </View>
      ) : null}
      <ScrollView
        key={step}
        scrollEnabled={step !== "measurements" || activeMeasurementWheel === null}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { flexGrow: 1 },
          (step === "welcome" || step === "measurements") && { paddingTop: 0 },
          step === "playstyle" && { paddingTop: 0 },
          title?.[0].startsWith("Question #") && { paddingHorizontal: 36 },
          purpleScreen && {
            paddingHorizontal: 20,
            paddingTop:
              step === "days" || step === "schedule" || step === "brief" ? 0 : 28,
          },
          automatic && !canSkip && { paddingBottom: Math.max(inset.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {showTitle ? (
          <View style={{ gap: 10, marginBottom: 24, paddingTop: 6 }}>
            <Text
              accessibilityRole="header"
              style={[
                styles.question,
                !title![0].startsWith("Question #") && { fontSize: 24, lineHeight: 30 },
              ]}
            >
              {title![0]}
            </Text>
            <Copy
              style={{
                textAlign:
                  title![0].startsWith("Question #") && title![1].length > 48
                    ? "left"
                    : "center",
                fontSize: title![0].startsWith("Question #") ? 18 : 13,
                lineHeight: title![0].startsWith("Question #") ? 24 : 19,
                color: title![0].startsWith("Question #") ? colors.white : colors.muted,
              }}
            >
              {title![1]}
            </Copy>
          </View>
        ) : null}
        {content}
      </ScrollView>
      {step !== "positionConfirm" && (!automatic || canSkip) ? (
        <View
          onLayout={({ nativeEvent }) => {
            if (currentIndex.current !== index) return;
            const height = nativeEvent.layout.height;
            setFooterMeasure((previous) =>
              previous.index === index && previous.height === height
                ? previous
                : { index, height },
            );
          }}
          style={[
            styles.footer,
            { paddingBottom: Math.max(inset.bottom, 16) },
            (purpleScreen || step === "notifications" || step === "comparison") && {
              backgroundColor: "transparent",
            },
            (step === "welcome" || step === "intro") && {
              backgroundColor: "transparent",
            },
          ]}
        >
          {!automatic ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={buttonLabel}
              accessibilityState={{ disabled: !ready }}
              aria-disabled={!ready}
              disabled={!ready}
              onPress={advance}
              style={({ pressed }) => [
                styles.primary,
                (step === "level" || step === "commitment") && {
                  minHeight: 54,
                  paddingVertical: 7,
                },
                purpleScreen && styles.purplePrimary,
                step === "comparison" && { backgroundColor: colors.white },
                !ready && styles.primaryDisabled,
                purpleScreen && !ready && styles.purplePrimaryDisabled,
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={{ alignItems: "center" }}>
                <Text
                  style={[
                    styles.primaryText,
                    purpleScreen && { color: colors.white },
                    !ready && { color: colors.muted },
                  ]}
                >
                  {buttonLabel}
                </Text>
                {!ready && (step === "level" || step === "commitment") ? (
                  <Text
                    style={{
                      fontFamily: "Archivo_400Regular",
                      fontSize: 10,
                      lineHeight: 13,
                      color: colors.muted,
                    }}
                  >
                    {step === "level"
                      ? "Tap the one that fits"
                      : "Pick your level to continue"}
                  </Text>
                ) : null}
              </View>
              {!purpleScreen &&
              step !== "measurements" &&
              step !== "level" &&
              step !== "commitment" ? (
                <ArrowRight size={20} color={ready ? colors.background : colors.muted} />
              ) : null}
            </Pressable>
          ) : null}
          {canSkip ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={secondaryLabel ?? undefined}
              onPress={() => {
                if (step === "notifications") setRemindersRequested(false);
                advance();
              }}
              style={styles.skip}
            >
              <Copy muted style={{ fontSize: 13 }}>
                {secondaryLabel}
              </Copy>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
  scene.current = currentScene;
  const footerHeight =
    step !== "positionConfirm" && (!automatic || canSkip)
      ? footerMeasure.index === index
        ? footerMeasure.height
        : Math.max(inset.bottom, 16) + 12 + 56 + (canSkip ? 46 : 0)
      : 0;
  const crossfadingIntro = outgoing?.motion.kind === "crossfade";
  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        purpleScreen && { backgroundColor: "#190D26" },
        (step === "notifications" || step === "comparison") && {
          backgroundColor: "#101113",
        },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />
      {!photoScreen && step !== "notifications" && step !== "comparison" ? (
        <OnboardingAtmosphere purple={purpleScreen} />
      ) : null}
      {photoScreen || crossfadingIntro ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: crossfadingIntro
                ? slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
                : 1,
            },
          ]}
        >
          {step === "welcome" ? (
            <WelcomeBackground focused={focused} />
          ) : (
            <Image
              source={photo}
              contentFit="cover"
              contentPosition={{ left: "50%", top: "50%" }}
              style={[
                StyleSheet.absoluteFill,
                { opacity: step === "positionConfirm" ? 0.9 : 0.55 },
              ]}
            />
          )}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: step === "welcome" ? "#080F0B55" : "#080F0B44" },
            ]}
          />
        </Animated.View>
      ) : null}
      <View
        style={[
          styles.header,
          {
            paddingTop:
              purpleScreen || step === "notifications" || step === "comparison"
                ? inset.top + 4
                : inset.top + 8,
          },
          step === "playstyle" && {
            paddingTop: inset.top,
            paddingHorizontal: 12,
            minHeight: inset.top + 48,
          },
        ]}
      >
        {purpleScreen ||
        step === "playstyle" ||
        step === "positionConfirm" ||
        step === "notifications" ||
        step === "comparison" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={goBack}
            style={styles.iconButton}
          >
            <ArrowLeft size={23} color={colors.white} />
          </Pressable>
        ) : (
          <Text style={styles.brand}>
            break<Text style={{ color: colors.lime }}>away</Text>
          </Text>
        )}
        {step === "notifications" ? (
          <Text
            pointerEvents="none"
            style={[
              styles.brand,
              {
                position: "absolute",
                left: 70,
                right: 70,
                textAlign: "center",
                bottom: 10,
                fontSize: 19,
                lineHeight: 28,
              },
            ]}
          >
            break<Text style={{ color: colors.lime }}>away</Text>
          </Text>
        ) : null}
        {replay && step !== "welcome" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel onboarding"
            onPress={() => {
              haptic("light");
              setFeedback(null);
              pendingAdvance.cancel();
              settleScene();
              onComplete?.();
            }}
            style={styles.iconButton}
          >
            <X size={22} color={colors.white} />
          </Pressable>
        ) : null}
      </View>
      {index > 0 &&
      !purpleScreen &&
      step !== "playstyle" &&
      step !== "positionConfirm" &&
      step !== "notifications" &&
      step !== "comparison" ? (
        <View style={styles.progressRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={goBack}
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
      <View style={{ flex: 1, overflow: "hidden" }}>
        {(outgoing
          ? [
              { index: outgoing.index, node: outgoing.node, old: true },
              { index, node: currentScene, old: false },
            ]
          : [{ index, node: currentScene, old: false }]
        ).map((item) => (
          <Animated.View
            key={item.index}
            pointerEvents={outgoing ? "none" : "auto"}
            accessibilityElementsHidden={!!outgoing}
            importantForAccessibility={outgoing ? "no-hide-descendants" : "auto"}
            aria-hidden={!!outgoing}
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: crossfadingIntro
                  ? slide.interpolate({
                      inputRange: [0, 1],
                      outputRange: item.old ? [1, 0] : [0, 1],
                    })
                  : 1,
                transform: [
                  {
                    translateX:
                      outgoing && !crossfadingIntro
                        ? slide.interpolate({
                            inputRange: [0, 1],
                            outputRange: item.old
                              ? [0, -outgoing.direction * width]
                              : [outgoing.direction * width, 0],
                          })
                        : 0,
                  },
                ],
              },
            ]}
          >
            {item.node}
          </Animated.View>
        ))}
      </View>
      {feedback ? (
        <OnboardingFeedbackToast
          message={feedback}
          reducedMotion={reducedMotionEnabled}
          bottom={Math.max(footerHeight, Math.max(inset.bottom, 16)) + 12}
          onHidden={() =>
            setFeedback((current) => (current === feedback ? null : current))
          }
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}
export function ReplayOnboarding({ navigation }: { navigation: any }) {
  const focused = useIsFocused();
  return <Onboarding replay focused={focused} onComplete={() => navigation.goBack()} />;
}

const styles = StyleSheet.create({
  assessmentPanel: {
    backgroundColor: "#172016E8",
    borderWidth: 1,
    borderColor: "#9AB84E26",
    borderRadius: 24,
    padding: 16,
  },
  notificationHeading: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 39,
    lineHeight: 48,
    color: colors.white,
  },
  notificationScene: { height: 300, marginTop: 8, marginHorizontal: 12 },
  notificationPhone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 26,
    right: 26,
    borderWidth: 2,
    borderColor: "#353739",
    borderRadius: 44,
    backgroundColor: "#0F1012",
    boxShadow: "0 -2px 3px rgba(255,255,255,0.06)",
  },
  notificationIsland: {
    height: 19,
    width: 76,
    borderRadius: 12,
    backgroundColor: "#0B0C0E",
    alignSelf: "center",
    marginTop: 12,
  },
  notificationPreview: {
    position: "absolute",
    minHeight: 61,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#292A2B",
    borderRadius: 17,
    padding: 12,
    boxShadow: "0 8px 16px rgba(0,0,0,0.16)",
  },
  notificationAppIcon: {
    height: 33,
    width: 33,
    borderRadius: 7,
    backgroundColor: "#0A100B",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationPreviewTitle: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 11,
    lineHeight: 15,
    color: colors.white,
  },
  notificationPreviewCopy: {
    fontFamily: "Archivo_400Regular",
    fontSize: 10,
    lineHeight: 14,
    color: "#D1D3D2",
  },
  reminderToggle: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  measurementTitle: {
    fontFamily: "Archivo_700Bold",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    color: colors.white,
    textAlign: "center",
  },
  measurementLabel: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
    color: "#8D978A",
  },
  measurementReadout: {
    fontFamily: "Archivo_700Bold",
    fontSize: 36,
    lineHeight: 42,
    color: colors.white,
    marginTop: 2,
  },
  measurementUnit: {
    fontFamily: "Archivo_500Medium",
    fontSize: 12,
    lineHeight: 18,
    color: colors.lime,
    marginTop: 1,
  },
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
    fontSize: 28,
    lineHeight: 34,
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
  purplePanel: {
    backgroundColor: "#FFFFFF0A",
    borderColor: "#FFFFFF0C",
    borderRadius: 20,
  },
  panel: {
    backgroundColor: "#151E16E8",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 16,
  },
  option: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: "transparent",
  },
  purpleOption: {
    backgroundColor: "#FFFFFF08",
    borderColor: "#FFFFFF10",
    borderRadius: 16,
  },
  purpleOptionSelected: {
    backgroundColor: "#67327966",
    borderColor: "#B96EE1",
    boxShadow: "0 0 8px rgba(185,110,225,0.12)",
  },
  editorialOption: {
    minHeight: 62,
    borderRadius: 24,
    gap: 12,
    backgroundColor: "#172018E8",
    borderColor: "#D8E7CC0A",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  levelIcon: {
    height: 37,
    width: 37,
    borderRadius: 12,
    backgroundColor: "#FFFFFF08",
    alignItems: "center",
    justifyContent: "center",
  },
  editorialRadio: { height: 23, width: 23, borderRadius: 12, borderColor: "#51634C33" },
  numberedOption: { minHeight: 55, paddingHorizontal: 10, gap: 10 },
  optionSelected: {
    borderColor: colors.lime,
    backgroundColor: colors.selected,
    boxShadow: "0 0 8px rgba(182,255,59,0.12)",
  },
  goalOption: { minHeight: 54, borderRadius: 30, paddingHorizontal: 16, gap: 11 },
  goalIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFFFFF1A",
    alignItems: "center",
    justifyContent: "center",
  },
  goalRadio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF1A",
    borderColor: "transparent",
  },
  radio: {
    width: 16,
    height: 16,
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
  positionConfirmPanel: {
    borderRadius: 26,
    padding: 20,
    gap: 16,
    backgroundColor: "#284333C9",
    borderWidth: 1,
    borderColor: "#D7F2CF33",
    boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
  },
  positionHero: {
    fontFamily: "Archivo_700Bold",
    fontSize: 84,
    lineHeight: 92,
    color: colors.lime,
    letterSpacing: -2,
  },
  playstyleHeading: {
    fontFamily: "Archivo_700Bold",
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0,
    color: colors.white,
    textAlign: "center",
  },
  playstyleName: {
    fontFamily: "Archivo_700Bold",
    fontSize: 18,
    lineHeight: 23,
    color: colors.white,
  },
  playstylePosition: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#111810B3",
  },
  playstylePositionText: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.5,
    color: colors.white,
  },
  playstyleCheck: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  styleCard: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#111810",
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
    borderRadius: 8,
    backgroundColor: "#111912",
  },
  segmentItem: {
    minWidth: 98,
    minHeight: 36,
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
    minHeight: 49,
    borderRadius: 16,
    backgroundColor: "#FFFFFF0A",
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontFamily: "Archivo_600SemiBold", fontSize: 15, color: colors.white },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF08",
    borderWidth: 1,
    borderColor: "#FFFFFF0D",
    borderRadius: 16,
  },
  scheduleBlock: {
    minHeight: 42,
    paddingVertical: 8,
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
    minHeight: 50,
    borderRadius: 30,
    backgroundColor: colors.lime,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 22,
  },
  primaryDisabled: { backgroundColor: "#293426" },
  purplePrimary: { backgroundColor: "#FFFFFF20", minHeight: 48 },
  purplePrimaryDisabled: { backgroundColor: "#FFFFFF0D" },
  primaryText: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 16,
    lineHeight: 24,
    color: colors.background,
    textAlign: "center",
  },
  skip: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 2 },
});
