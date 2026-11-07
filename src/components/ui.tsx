import React, { useState } from "react";
import { ScrollView, Text, View, Pressable, TextInput, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeftRight,
  Check,
  ChevronRight,
  ChevronDown,
  CircleDot,
  Footprints,
  Route,
  Search,
  LucideIcon,
} from "lucide-react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { haptic, type HapticFeedback } from "../utils/haptics";
import { Drill } from "../domain/model";
export { palette as C } from "../theme/palette";
import { palette as C } from "../theme/palette";
import { createStyles } from "../theme/styles";
export const s = createStyles(C);
import { useTheme } from "../theme/ThemeProvider";
export { useTheme } from "../theme/ThemeProvider";

export function Page({
  children,
  footer,
  contentStyle,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
}) {
  const { s } = useTheme();

  const inset = useSafeAreaInsets();
  return (
    <View style={s.page}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={s.page}
        contentContainerStyle={[s.content, contentStyle]}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={[s.footer, { paddingBottom: Math.max(inset.bottom, 16) }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}
export function Title({
  title,
  body,
  eyebrow,
}: {
  title: string;
  body?: string;
  eyebrow?: string;
}) {
  const { s } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      {eyebrow ? <Text style={s.small}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={s.h1}>
        {title}
      </Text>
      {body ? <Text style={s.body}>{body}</Text> : null}
    </View>
  );
}
export function Button({
  label,
  onPress,
  kind = "primary",
  disabled = false,
  icon: Icon,
  feedback,
  size = "default",
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  feedback?: HapticFeedback;
  size?: "default" | "large";
  accessibilityLabel?: string;
  kind?: "primary" | "secondary" | "lime" | "danger";
  disabled?: boolean;
  icon?: LucideIcon;
}) {
  const { C } = useTheme();

  const dark = kind === "primary" || kind === "danger";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        haptic(
          feedback ??
            (kind === "danger" ? "warning" : kind === "secondary" ? "light" : "medium"),
        );
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: size === "large" ? 68 : 52,
        borderRadius: 10,
        borderWidth: kind === "secondary" ? 1 : 0,
        borderColor: C.lineStrong,
        paddingHorizontal: 18,
        paddingVertical: 14,
        flexDirection: "row",
        gap: 10,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor:
          kind === "lime"
            ? C.lime
            : kind === "secondary"
              ? C.soft
              : kind === "danger"
                ? C.danger
                : C.green,
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: "Archivo_600SemiBold",
          fontSize: size === "large" ? 18 : 15,
          lineHeight: size === "large" ? 24 : 22,
          color:
            kind === "danger"
              ? C.onDanger
              : dark
                ? C.onPrimary
                : kind === "lime"
                  ? C.onLime
                  : C.ink,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
      {Icon ? (
        <Icon
          size={size === "large" ? 22 : 18}
          color={
            kind === "danger"
              ? C.onDanger
              : dark
                ? C.onPrimary
                : kind === "lime"
                  ? C.onLime
                  : C.ink
          }
          strokeWidth={2}
        />
      ) : null}
    </Pressable>
  );
}
export function IconButton({
  label,
  onPress,
  icon: Icon,
  color,
  feedback,
}: {
  label: string;
  onPress: () => void;
  feedback?: HapticFeedback;
  icon: LucideIcon;
  color?: string;
}) {
  const { C } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic(feedback ?? "selection");
        onPress();
      }}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        backgroundColor: pressed ? C.soft : "transparent",
      })}
    >
      <Icon size={21} color={color ?? C.ink} strokeWidth={1.8} />
    </Pressable>
  );
}
export function Link({
  label,
  onPress,
  feedback,
}: {
  label: string;
  onPress: () => void;
  feedback?: HapticFeedback;
}) {
  const { C } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic(feedback ?? "light");
        onPress();
      }}
      style={{ minHeight: 48, justifyContent: "center" }}
    >
      <Text
        style={{
          fontFamily: "Archivo_600SemiBold",
          color: C.green,
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Chip({
  label,
  selected,
  onPress,
  feedback,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  feedback?: HapticFeedback;
}) {
  const { C } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic(feedback ?? "selection");
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 48,
        borderWidth: 1,
        borderColor: selected ? C.green : C.lineStrong,
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderRadius: 10,
        backgroundColor: selected ? C.green : pressed ? C.line : C.white,
        justifyContent: "center",
      })}
    >
      <Text
        style={{
          fontFamily: "Archivo_500Medium",
          fontSize: 14,
          lineHeight: 22,
          color: selected ? C.onPrimary : C.muted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Choice({
  label,
  detail,
  selected,
  onPress,
  multiple = false,
  feedback,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  feedback?: HapticFeedback;
  multiple?: boolean;
}) {
  const { C, s } = useTheme();

  return (
    <Pressable
      accessibilityRole={multiple ? "checkbox" : "radio"}
      accessibilityState={multiple ? { checked: selected } : { selected }}
      onPress={() => {
        haptic(feedback ?? "selection");
        onPress();
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        padding: 16,
        minHeight: 68,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: selected ? C.green : C.lineStrong,
        backgroundColor: selected ? C.pitchSoft : pressed ? C.soft : C.white,
      })}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.h3}>{label}</Text>
        {detail ? <Text style={s.small}>{detail}</Text> : null}
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: multiple ? 6 : 11,
          borderWidth: selected ? 0 : 1.5,
          borderColor: C.lineStrong,
          backgroundColor: selected ? C.green : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? <Check size={14} color={C.onPrimary} strokeWidth={2.5} /> : null}
      </View>
    </Pressable>
  );
}
export function Note({ children }: { children: React.ReactNode }) {
  const { s } = useTheme();

  return (
    <View style={s.note}>
      <Text style={s.body}>{children}</Text>
    </View>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  number = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  number?: boolean;
  placeholder?: string;
}) {
  const { C, s } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      <Text style={s.h3}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={number ? "number-pad" : "default"}
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
      />
    </View>
  );
}
export function SearchField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (s: string) => void;
}) {
  const { C } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.lineStrong,
        borderRadius: 12,
        paddingHorizontal: 14,
        minHeight: 50,
      }}
    >
      <Search size={19} color={C.muted} />
      <TextInput
        accessibilityLabel="Search drills"
        value={value}
        onChangeText={onChangeText}
        placeholder="Search drills"
        placeholderTextColor={C.muted}
        style={{
          flex: 1,
          fontFamily: "Archivo_400Regular",
          fontSize: 15,
          minHeight: 50,
          color: C.ink,
        }}
      />
    </View>
  );
}
const categoryIcons: Record<string, LucideIcon> = {
  "Ball control": CircleDot,
  Passing: ArrowLeftRight,
  Dribbling: Route,
  "Weaker foot": Footprints,
};
export function DrillRow({
  drill,
  onPress,
  action,
  duration,
  trailing,
  feedback,
}: {
  drill: Drill;
  onPress: () => void;
  feedback?: HapticFeedback;
  action?: string;
  duration?: string;
  trailing?: React.ReactNode;
}) {
  const { C, s } = useTheme();

  const Icon = categoryIcons[drill.skill] || CircleDot;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 72,
        borderBottomWidth: 1,
        borderColor: C.line,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${action || "View"} ${drill.name}`}
        onPress={() => {
          haptic(feedback ?? "selection");
          onPress();
        }}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 14,
          backgroundColor: pressed ? C.soft : "transparent",
        })}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: C.pitchSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={20} color={C.green} strokeWidth={1.7} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.h3}>{drill.name}</Text>
          <Text style={s.small}>
            {duration ? `${duration} · ` : ""}
            {drill.gear.length
              ? drill.gear
                  .map((g) =>
                    g === "wall" ? "Wall" : g === "markers" ? "Markers" : "Partner",
                  )
                  .join(" + ")
              : "Ball only"}
          </Text>
        </View>
        {!trailing ? <ChevronRight size={17} color={C.muted} /> : null}
      </Pressable>
      {trailing}
    </View>
  );
}
export function SettingRow({
  label,
  value,
  onPress,
  icon: Icon,
  danger = false,
  feedback,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  feedback?: HapticFeedback;
  icon?: LucideIcon;
  danger?: boolean;
}) {
  const { C, s } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic(feedback ?? "selection");
        onPress();
      }}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 16,
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: pressed ? C.soft : C.white,
        borderBottomWidth: 1,
        borderColor: C.line,
      })}
    >
      {Icon ? (
        <Icon size={20} color={danger ? C.danger : C.green} strokeWidth={1.8} />
      ) : null}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[s.h3, danger ? { color: C.danger } : null]}>{label}</Text>
        {value ? <Text style={s.small}>{value}</Text> : null}
      </View>
      <ChevronRight size={17} color={C.muted} />
    </Pressable>
  );
}
export function Disclosure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { C, s } = useTheme();

  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          haptic("selection");
          setOpen(!open);
        }}
        style={[s.row, { minHeight: 48 }]}
      >
        <Text style={s.h3}>{label}</Text>
        <ChevronDown
          size={18}
          color={C.muted}
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </Pressable>
      {open ? (
        <View style={{ gap: 12, paddingTop: 8, paddingBottom: 16 }}>{children}</View>
      ) : null}
    </View>
  );
}
export function Steps({ drill }: { drill: Drill }) {
  const { C, s } = useTheme();

  return (
    <View style={{ gap: 16 }}>
      {drill.steps.map((step, i) => (
        <View key={step} style={{ flexDirection: "row", gap: 12 }}>
          <Text style={[s.small, { width: 16, paddingTop: 2 }]}>{i + 1}</Text>
          <Text style={[s.body, { flex: 1, color: C.ink }]}>{step}</Text>
        </View>
      ))}
    </View>
  );
}
export function Diagram({ drill }: { drill?: Drill; small?: boolean }) {
  const { C } = useTheme();

  const id = drill?.id || "inside";
  const stationary = ["inside", "sole", "weak"].includes(id);
  const path =
    id === "inside"
      ? "M120 100 L200 100"
      : id === "sole"
        ? "M110 90 Q160 55 205 90"
        : id === "weak"
          ? "M110 135 L145 105 L125 75 L165 45"
          : id === "wall"
            ? "M145 145 L125 45 L195 140"
            : id === "turn"
              ? "M85 140 L150 60 Q195 45 180 90 L120 140"
              : id === "gates"
                ? "M70 145 L100 65 L210 135 L245 50"
                : id === "partner"
                  ? "M90 130 L230 60"
                  : "M80 135 L230 55";
  return (
    <View
      accessible
      accessibilityLabel={`Movement diagram: ${drill?.name || "inside touches"}`}
      style={{
        height: 180,
        backgroundColor: C.pitchSoft,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 320 180">
        {!stationary ? (
          <Rect
            x="30"
            y="20"
            width="260"
            height="140"
            rx="12"
            stroke={C.lineStrong}
            strokeDasharray="4 5"
            fill="none"
          />
        ) : null}
        {stationary ? (
          <>
            <Path
              d="M102 120 Q93 98 104 84 Q113 78 116 90 L122 115 Q116 128 102 120Z M214 120 Q225 98 214 84 Q205 78 202 90 L196 115 Q202 128 214 120Z"
              fill={id === "weak" ? C.lime : C.green}
            />
            <SvgText x="160" y="150" textAnchor="middle" fill={C.green} fontSize="11">
              {id === "weak" ? "Less comfortable foot" : "Keep the ball close"}
            </SvgText>
          </>
        ) : null}
        {id === "wall" ? (
          <Line x1="80" y1="30" x2="235" y2="30" stroke={C.green} strokeWidth="8" />
        ) : null}
        {id === "partner" ? <Circle cx="235" cy="50" r="11" fill={C.green} /> : null}
        {id === "gates" ? (
          <>
            <Path
              d="M80 68 L87 52 L94 68Z M115 68 L122 52 L129 68Z M200 135 L207 119 L214 135Z M235 135 L242 119 L249 135Z"
              fill={C.green}
            />
          </>
        ) : null}
        <Path
          d={path}
          stroke={C.green}
          strokeWidth="2.5"
          strokeDasharray="6 5"
          fill="none"
        />
        <Circle
          cx={stationary ? 160 : 90}
          cy={stationary ? 100 : 130}
          r="11"
          fill={C.white}
          stroke={C.green}
          strokeWidth="1.5"
        />
        <Path
          d={
            stationary
              ? "M160 93 L167 98 L164 106 H156 L153 98Z"
              : "M90 123 L97 128 L94 136 H86 L83 128Z"
          }
          fill={C.green}
        />
      </Svg>
    </View>
  );
}
export function Disclaimer() {
  const { s } = useTheme();
  return (
    <Text style={s.small}>
      Starter drills are illustrative, not coach reviewed. Use a clear space and stop if
      you feel pain.
    </Text>
  );
}
