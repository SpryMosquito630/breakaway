import { useReducer, useState } from "react";
import { ChevronRight } from "lucide-react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "./ui";
import { emptyShotSpeed, estimateShotSpeed, shotSpeedReducer } from "../domain/shotSpeed";
import { haptic } from "../utils/haptics";

export function ShotSpeed({
  duration,
  usable,
  markTime,
  kickingFoot,
}: {
  kickingFoot?: "left" | "right" | null;
  duration: number;
  usable: boolean;
  /** Pause and read the player clock at the instant the user marks a point. */
  markTime: () => number;
}) {
  const { C, s } = useTheme();
  const [open, setOpen] = useState(false);
  const [measurement, dispatch] = useReducer(shotSpeedReducer, undefined, emptyShotSpeed);
  const result = estimateShotSpeed(measurement, usable ? duration : 0);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Shot speed, ${result.kmh === null ? "not measured" : `${result.kmh.toFixed(0)} kilometres per hour, estimated average`}. Set distance and timing.`}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          haptic("selection");
          setOpen(true);
        }}
        style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.78 : 1 }]}
      >
        <Text style={[styles.label, { color: C.muted }]}>Shot speed</Text>
        <View style={styles.reading}>
          <Text
            accessibilityLiveRegion="polite"
            style={[result.kmh === null ? styles.empty : styles.value, { color: C.ink }]}
          >
            {result.kmh === null ? "Not measured" : result.kmh.toFixed(0)}
          </Text>
          {result.kmh !== null ? (
            <Text style={[styles.unit, { color: C.muted }]}>km/h</Text>
          ) : null}
        </View>
        <View style={styles.action}>
          <Text style={[styles.caption, { color: C.green }]}>
            {result.kmh === null ? "Measure manually" : "Manual estimate"}
          </Text>
          <ChevronRight size={14} color={C.green} aria-hidden={true} />
        </View>
        {kickingFoot ? (
          <Text style={[styles.caption, { color: C.muted }]}>
            {kickingFoot === "left" ? "Left foot" : "Right foot"}
          </Text>
        ) : null}
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.shade}>
          <Pressable
            accessible={false}
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={() => setOpen(false)}
            style={[styles.sheet, { backgroundColor: C.bg }]}
          >
            <View style={[s.row, styles.header]}>
              <Text accessibilityRole="header" style={s.h2}>
                Shot speed
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close shot speed setup"
                onPress={() => setOpen(false)}
                style={styles.reset}
              >
                <Text style={[s.h3, { color: C.green }]}>Done</Text>
              </Pressable>
            </View>
            <ScrollView
              automaticallyAdjustKeyboardInsets
              keyboardShouldPersistTaps="handled"
              style={styles.scroll}
              contentContainerStyle={styles.setup}
            >
              <Text style={s.h3}>Estimated average · manual distance and timing</Text>
              <Text style={s.small}>
                Measure between two visible points on a straight ball flight. Curves and
                lobs can understate speed. Pause at the first point, open this tile and
                mark Start. Repeat for End. Marking returns to the replay.
              </Text>
              <Text style={s.h3}>Distance between points (m)</Text>
              <TextInput
                accessibilityLabel="Measured distance between ball positions in metres"
                value={measurement.distance}
                onChangeText={(value) => dispatch({ type: "distance", value })}
                keyboardType="decimal-pad"
                placeholder="Metres"
                placeholderTextColor={C.muted}
                style={s.input}
              />
              <View style={styles.marks}>
                {(["start", "end"] as const).map((type) => (
                  <Pressable
                    key={type}
                    accessibilityRole="button"
                    accessibilityLabel={`Mark ${type} at current video time`}
                    accessibilityState={{ disabled: !usable }}
                    disabled={!usable}
                    onPress={() => {
                      const time = markTime();
                      dispatch({ type, time });
                      setOpen(false);
                      haptic("selection");
                    }}
                    style={({ pressed }) => [
                      styles.mark,
                      {
                        borderColor: C.lineStrong,
                        backgroundColor: C.white,
                        opacity: !usable ? 0.4 : pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <Text style={s.h3}>{type === "start" ? "Start" : "End"}</Text>
                    <Text style={s.small}>
                      {measurement[type] === null
                        ? "Not marked"
                        : `${measurement[type].toFixed(2)} s`}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text accessibilityLiveRegion="polite" style={s.small}>
                {result.message}
              </Text>
              <View style={s.row}>
                <Text style={[s.small, styles.explanation]}>
                  Distance ÷ elapsed time × 3.6. Estimates depend on your measurements.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reset speed measurement"
                  onPress={() => {
                    dispatch({ type: "reset" });
                    haptic("selection");
                  }}
                  style={styles.reset}
                >
                  <Text style={[s.small, { color: C.ink }]}>Reset</Text>
                </Pressable>
              </View>
              <Text style={s.small}>
                Temporary measurement · Save keeps the video only.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 96,
    gap: 6,
    paddingVertical: 12,
  },
  label: {
    fontFamily: "Archivo_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  reading: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 5,
    minHeight: 34,
  },
  value: {
    fontFamily: "Archivo_600SemiBold",
    fontVariant: ["tabular-nums"],
    fontSize: 28,
    lineHeight: 34,
  },
  empty: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 18,
    lineHeight: 26,
  },
  unit: {
    fontFamily: "Archivo_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 2, flexWrap: "wrap" },
  caption: {
    fontFamily: "Archivo_400Regular",
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },
  shade: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "85%",
    borderRadius: 16,
    overflow: "hidden",
  },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  scroll: { flexGrow: 0 },
  setup: { gap: 12, padding: 20, paddingTop: 8 },
  marks: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mark: {
    flex: 1,
    minWidth: 110,
    minHeight: 64,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
  },
  reset: { minHeight: 48, paddingHorizontal: 12, justifyContent: "center" },
  explanation: { flex: 1 },
});
