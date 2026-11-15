import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { createVideoPlayer, VideoView } from "expo-video";
import Svg, { Circle, Line } from "react-native-svg";
import { Button, Page, Title } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../state/AppState";
import { trainingContext } from "../coachAi/guide";
import {
  clipForm,
  discoverService,
  requestService,
  type Feedback,
  type JointResult,
  type ServiceState,
} from "../coachAi/service";
import { feedbackStore, saveFeedback } from "../coachAi/store";
const edges = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 31],
  [28, 32],
];
export function PoseReview({ navigation }: { navigation: any }) {
  return <VideoReview mode="pose" navigation={navigation} />;
}
export function VideoReview({
  mode,
  navigation,
}: {
  mode: "coach" | "pose";
  navigation: any;
}) {
  const { s, C } = useTheme();
  const { data, catalog } = useApp();
  const saved = feedbackStore.useStore();
  const focused = useIsFocused();
  const [clip, setClip] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [service, setService] = useState<ServiceState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pose, setPose] = useState<JointResult | null>(null);
  const [time, setTime] = useState(0);
  const [savedNotice, setSavedNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  const picking = useRef(false);
  const generation = useRef(0);
  const player = useMemo(() => {
    const p = createVideoPlayer(clip?.uri ?? null);
    p.muted = true;
    p.loop = false;
    p.timeUpdateEventInterval = 0.1;
    return p;
  }, [clip?.uri]);
  useEffect(() => {
    const sub = player.addListener("timeUpdate", (e) => setTime(e.currentTime));
    const status = player.addListener("statusChange", (e) => {
      if (e.status === "error")
        setError("This clip could not be played. Choose another recording.");
    });
    return () => {
      sub.remove();
      status.remove();
      player.pause();
      player.release();
    };
  }, [player]);
  useEffect(() => {
    if (!focused) player.pause();
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") player.pause();
    });
    return () => sub.remove();
  }, [focused, player]);
  useEffect(() => {
    void connect();
    return () => {
      generation.current++;
      controller.current?.abort();
    };
  }, []);
  async function connect() {
    try {
      setService(await discoverService());
    } catch {
      setService(null);
    }
  }
  async function choose(camera: boolean) {
    if (busy || picking.current) return;
    picking.current = true;
    setError("");
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted)
          throw new Error(
            "Camera permission is needed to record. You can choose an existing video.",
          );
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["videos"],
        videoMaxDuration: 30,
        quality: 0.7,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.duration && asset.duration > 30050)
        throw new Error("Trim your clip to 30 seconds or less first.");
      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024)
        throw new Error("Choose a video smaller than 50 MB.");
      generation.current++;
      setClip(asset);
      setFeedback(null);
      setPose(null);
      setTime(0);
      setSavedNotice("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The clip could not be opened.");
    } finally {
      picking.current = false;
    }
  }
  async function analyze() {
    if (!clip || !service || busy) return;
    const epoch = generation.current;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    player.pause();
    const timeout = setTimeout(() => abort.abort(), 100000);
    try {
      const form = await clipForm(
        clip,
        mode === "coach" ? trainingContext(data, catalog) : undefined,
      );
      if (mode === "coach") {
        const value = await requestService<Feedback>(
          service,
          "coach",
          form,
          abort.signal,
        );
        if (epoch === generation.current) setFeedback(value);
      } else {
        const value = await requestService<JointResult>(
          service,
          "pose",
          form,
          abort.signal,
        );
        if (epoch === generation.current) setPose(value);
      }
    } catch (e) {
      if (epoch === generation.current)
        setError(e instanceof Error ? e.message : "Analysis failed. Try again.");
    } finally {
      clearTimeout(timeout);
      if (epoch === generation.current) setBusy(false);
    }
  }
  const row = pose?.frames.reduce<JointResult["frames"][number] | null>(
    (latest, frame) => (frame.timestampSeconds <= time ? frame : latest),
    null,
  );
  const points = row && time - row.timestampSeconds <= 0.3 ? row.joints : [];
  const ratio = pose
    ? pose.width / pose.height
    : clip?.width && clip.height
      ? clip.width / clip.height
      : 16 / 9;
  return (
    <Page>
      <Title
        title={mode === "pose" ? "Joint View" : "Video feedback"}
        eyebrow={mode === "pose" ? "EXPERIMENTAL • 2D LANDMARKS" : "OPTIONAL AI REVIEW"}
        body={
          mode === "pose"
            ? "See estimated joints on your own recording. Keep one whole person in frame."
            : "Get cautious observations from a few sampled frames, then practice and retest."
        }
      />
      <View style={{ gap: 14 }}>
        <Text style={s.body}>Choose or record up to 30 seconds · 50 MB maximum.</Text>
        <Button label="Choose video" disabled={busy} onPress={() => void choose(false)} />
        <Button
          label="Record video"
          kind="secondary"
          disabled={busy}
          onPress={() => void choose(true)}
        />
        {clip ? (
          <>
            <View
              style={{
                width: "100%",
                aspectRatio: ratio,
                maxHeight: 460,
                backgroundColor: "#10271D",
                position: "relative",
              }}
            >
              <VideoView
                player={player}
                nativeControls
                contentFit="contain"
                style={{ width: "100%", height: "100%" }}
              />
              {pose ? (
                <Svg
                  pointerEvents="none"
                  viewBox={`0 0 ${pose.width} ${pose.height}`}
                  preserveAspectRatio="xMidYMid meet"
                  style={{ position: "absolute", width: "100%", height: "100%" }}
                >
                  {edges.map(([a, b]) =>
                    points[a] && points[b] ? (
                      <Line
                        key={`${a}-${b}`}
                        x1={points[a]!.x * pose.width}
                        y1={points[a]!.y * pose.height}
                        x2={points[b]!.x * pose.width}
                        y2={points[b]!.y * pose.height}
                        stroke="#C6EF2E"
                        strokeWidth={Math.max(2, pose.width / 180)}
                      />
                    ) : null,
                  )}
                  {points.map((p, i) =>
                    p ? (
                      <Circle
                        key={i}
                        cx={p.x * pose.width}
                        cy={p.y * pose.height}
                        r={Math.max(3, pose.width / 100)}
                        fill="#C6EF2E"
                      />
                    ) : null,
                  )}
                </Svg>
              ) : null}
            </View>
            <Text style={s.small}>
              {time.toFixed(1)} s ·{" "}
              {mode === "pose"
                ? "Blank segments mean no reliable estimated joints."
                : "Your original clip stays on this device; a temporary upload is used for review."}
            </Text>
          </>
        ) : null}
        <Text style={s.small}>
          {mode === "coach"
            ? "Get AI feedback uploads this clip to your analysis computer. Up to eight reduced-size frames and training context are sent to OpenAI. Audio is not sent. Temporary service files are deleted after the request. Only send footage you have permission to share."
            : "Joint View uploads your clip to the connected analysis computer and runs MediaPipe locally. No frames go to OpenAI. Temporary service files are deleted after the request. Estimated visibility is confidence, not accuracy; this does not rate form, count reps or assess injuries."}
        </Text>
        <Button
          label={
            busy ? "Processing…" : mode === "pose" ? "Estimate joints" : "Get AI feedback"
          }
          disabled={
            !clip ||
            busy ||
            !(mode === "coach" ? service?.aiAvailable : service?.jointViewAvailable)
          }
          onPress={() => void analyze()}
        />
        {busy ? (
          <Button
            label="Cancel analysis"
            kind="secondary"
            onPress={() => {
              generation.current++;
              controller.current?.abort();
              setBusy(false);
              setError(
                "Canceled on this device. The bounded server request may finish before its temporary files are deleted.",
              );
            }}
          />
        ) : null}
        {!(mode === "coach" ? service?.aiAvailable : service?.jointViewAvailable) ? (
          <Text style={s.body}>
            {mode === "coach"
              ? "AI feedback is unavailable until the analysis computer has a server-side API key and selected model."
              : "Connect to the analysis computer with the verified MediaPipe model to use Joint View."}
          </Text>
        ) : null}
        <Button
          label="Check connection"
          kind="secondary"
          onPress={() => void connect()}
        />
        {error ? (
          <Text accessibilityRole="alert" style={s.body}>
            {error}
          </Text>
        ) : null}
        {pose ? (
          <>
            <Text style={s.h3}>
              {pose.fullBodyVisible
                ? "Whole-body visibility check passed"
                : "Whole body often missing — re-record with more space"}
            </Text>
            <Text style={s.body}>{pose.limitations}</Text>
            <Text style={s.small}>
              {Math.round(pose.visibleFrameFraction * 100)}% of samples passed the
              visibility check. This is not a skill score.
            </Text>
          </>
        ) : null}
        {feedback ? (
          <>
            <Text style={s.h3}>AI observations</Text>
            <Text selectable style={s.body}>
              {feedback.summary}
            </Text>
            <Text style={s.small}>{feedback.limitations}</Text>
            {feedback.observations.map((ob, i) => (
              <View
                key={i}
                style={{
                  padding: 16,
                  gap: 8,
                  borderWidth: 1,
                  borderColor: C.lineStrong,
                  borderRadius: 12,
                }}
              >
                <Button
                  label={`View ${ob.timestampSeconds.toFixed(1)} s`}
                  kind="secondary"
                  onPress={() => {
                    player.pause();
                    player.currentTime = ob.timestampSeconds;
                    setTime(ob.timestampSeconds);
                  }}
                />
                <Text selectable style={s.body}>
                  {ob.observation}
                </Text>
                <Text style={s.small}>{ob.uncertainty}</Text>
                {ob.drillId && catalog.some((d) => d.id === ob.drillId) ? (
                  <Button
                    label={`Practice ${catalog.find((d) => d.id === ob.drillId)?.name}`}
                    onPress={() => navigation.navigate("Detail", { id: ob.drillId })}
                  />
                ) : null}
              </View>
            ))}
            <Button
              label="Save feedback text"
              kind="secondary"
              onPress={() => {
                void saveFeedback(feedback).then((ok) =>
                  setSavedNotice(
                    ok
                      ? "Feedback saved on this device. Clip is not saved with this note."
                      : "Feedback could not be saved. Try again.",
                  ),
                );
              }}
            />
            <Text style={s.small}>{savedNotice}</Text>
          </>
        ) : null}
        <Button
          label="Retest a skill"
          kind="secondary"
          onPress={() => navigation.navigate("Assessment")}
        />
        {mode === "coach" && saved.data.length > 0 ? (
          <>
            <Text style={s.h3}>Saved feedback notes</Text>
            <Text style={s.small}>
              Text only. These notes are not linked to the current video.
            </Text>
            {saved.data.map((note) => (
              <View key={note.id} style={{ gap: 6, paddingVertical: 8 }}>
                <Text style={s.small}>{note.date.slice(0, 10)} · OpenAI feedback</Text>
                <Text style={s.body}>{note.feedback.summary}</Text>
                <Text style={s.small}>{note.feedback.limitations}</Text>
                <Button
                  label="Delete note"
                  kind="secondary"
                  onPress={() => {
                    void saved.update((old) => old.filter((n) => n.id !== note.id));
                  }}
                />
              </View>
            ))}
            {saved.error ? <Text style={s.body}>{saved.error}</Text> : null}
          </>
        ) : null}
      </View>
    </Page>
  );
}
