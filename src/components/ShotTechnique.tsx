import { useState } from "react";
import { ChevronRight } from "lucide-react-native";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ShotTechnique as Review } from "../domain/shotTechnique";
import { Button, useTheme } from "./ui";
import { haptic } from "../utils/haptics";

const labels = {
  body_control: "Body control",
  striking_action: "Striking action",
  follow_through: "Follow-through",
};
export function ShotTechnique({
  review,
  busy,
  error,
  connectionRequired,
  retryDisabled,
  onRetry,
  onSeek,
}: {
  review: Review | null;
  busy: boolean;
  error: string;
  connectionRequired: boolean;
  retryDisabled: boolean;
  onRetry: () => void;
  onSeek: (time: number) => void;
}) {
  const { C, s } = useTheme();
  const [open, setOpen] = useState(false);
  const score = review?.score ?? null;
  const status = busy
    ? "Reviewing…"
    : score !== null
      ? "AI estimate"
      : connectionRequired
        ? "Not connected"
        : error
          ? "Unavailable"
          : review
            ? "Not scored"
            : "Not reviewed";
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Technique score, ${score ?? (review ? "not scored" : "not reviewed")}. ${status}. View details.`}
        accessibilityState={{ expanded: open, busy }}
        onPress={() => {
          haptic("selection");
          setOpen(true);
        }}
        style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.78 : 1 }]}
      >
        <Text style={[styles.label, { color: C.muted }]}>Technique</Text>
        <View style={styles.reading}>
          <Text
            accessibilityLiveRegion="polite"
            style={[score === null ? styles.empty : styles.value, { color: C.ink }]}
          >
            {score ?? status}
          </Text>
          {score !== null ? (
            <Text style={[styles.unit, { color: C.muted }]}>/100</Text>
          ) : null}
        </View>
        <View style={styles.action}>
          <Text style={[styles.caption, { color: C.green }]}>
            {score !== null && busy ? "AI estimate · Reviewing…" : "AI estimate"}
          </Text>
          <ChevronRight size={14} color={C.green} aria-hidden={true} />
        </View>
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
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={() => setOpen(false)}
            style={[styles.sheet, { backgroundColor: C.bg }]}
          >
            <View style={[s.row, { paddingHorizontal: 20, paddingTop: 8 }]}>
              <Text accessibilityRole="header" style={s.h2}>
                Technique
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close technique details"
                onPress={() => setOpen(false)}
                style={styles.close}
              >
                <Text style={[s.h3, { color: C.green }]}>Done</Text>
              </Pressable>
            </View>
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 16 }}
            >
              <Text style={s.small}>
                AI coaching estimate · Subjective, not a validated technique test.
              </Text>
              {review ? (
                <>
                  <Text style={s.h3}>
                    {review.shotStyle === "unknown"
                      ? "Shot type not clear"
                      : review.shotStyle.replaceAll("_", " ")}
                  </Text>
                  <Text style={s.body}>{review.summary}</Text>
                  {review.categories.map((c) => (
                    <View key={c.id} style={{ gap: 6 }}>
                      <View style={s.row}>
                        <Text style={s.h3}>{labels[c.id]}</Text>
                        <Text style={s.h3}>
                          {c.score === null ? "—" : `${c.score}/100`}
                        </Text>
                      </View>
                      <Text style={s.body}>{c.reason}</Text>
                      {c.timestampSeconds !== null ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`View ${labels[c.id]} at ${c.timestampSeconds.toFixed(2)} seconds`}
                          style={styles.close}
                          onPress={() => {
                            onSeek(c.timestampSeconds!);
                            setOpen(false);
                          }}
                        >
                          <Text style={[s.small, { color: C.green }]}>
                            {c.timestampSeconds.toFixed(2)} s · View moment
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                  {review.improvement ? (
                    <View style={{ gap: 6 }}>
                      <Text style={s.h3}>Next shot</Text>
                      <Text style={s.body}>{review.improvement.text}</Text>
                    </View>
                  ) : null}
                  <Text style={s.small}>{review.limitations}</Text>
                </>
              ) : (
                <Text accessibilityRole={error ? "alert" : undefined} style={s.body}>
                  {busy
                    ? "Reviewing the visible shot sequence…"
                    : error || "Analyze movement to review this video’s technique."}
                </Text>
              )}
              <Text style={s.small}>
                Review sends video frames to Google Gemini. Local temporary files are
                deleted after processing.
              </Text>
              {!busy ? (
                <Button
                  label={review ? "Review again" : "Retry technique review"}
                  kind="secondary"
                  disabled={retryDisabled}
                  onPress={() => {
                    setOpen(false);
                    onRetry();
                  }}
                />
              ) : null}
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
    gap: 4,
    flexWrap: "wrap",
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
  close: { minHeight: 48, paddingHorizontal: 12, justifyContent: "center" },
});
