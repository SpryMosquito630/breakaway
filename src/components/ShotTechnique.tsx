import { useState } from "react";
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
  onRetry,
  onSeek,
}: {
  review: Review | null;
  busy: boolean;
  error: string;
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
      : error
        ? "Unavailable"
        : "Not graded";
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Technique score, ${review?.score ?? "not graded"}. ${status}. View details.`}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          haptic("selection");
          setOpen(true);
        }}
        style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.78 : 1 }]}
      >
        <View style={styles.badgeContent}>
          <Text style={styles.label}>TECHNIQUE</Text>
          <View style={styles.reading}>
            <Text accessibilityLiveRegion="polite" style={styles.value}>
              {score ?? "—"}
            </Text>
            <Text style={styles.unit}>/100</Text>
          </View>
          <Text style={styles.status}>{status}</Text>
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
                    : error || "Choose a video to start your shot review."}
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
    minWidth: 0,
    borderRadius: 16,
    backgroundColor: "#DDF3E8",
    padding: 4,
    borderWidth: 3,
    borderColor: "#F6F8F5",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
  },
  badgeContent: {
    minHeight: 108,
    borderWidth: 1,
    borderColor: "#A6D4BE",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 3,
  },
  label: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    color: "#236348",
  },
  reading: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  value: {
    fontFamily: "IBMPlexMono_500Medium",
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
    color: "#176442",
  },
  unit: {
    fontFamily: "Archivo_500Medium",
    fontSize: 11,
    lineHeight: 16,
    color: "#236348",
  },
  status: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 12,
    lineHeight: 17,
    color: "#176442",
    textAlign: "center",
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
