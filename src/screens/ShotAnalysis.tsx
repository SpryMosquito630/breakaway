import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { createVideoPlayer, VideoView } from "expo-video";
import { useIsFocused } from "@react-navigation/native";
import { Camera, Film, Pause, Play, RotateCcw, Upload } from "lucide-react-native";
import { Button, Disclosure, Page, useTheme } from "../components/ui";
import { ReplayAnalysis } from "../domain/replay";
import { replays } from "../replays/storage";
import { useApp } from "../state/AppState";
import { ShotPoseOverlay } from "../components/ShotPoseOverlay";
import {
  poseHasBody,
  poseMatchesVideo,
  shotPoseAt,
  validShotPose,
} from "../domain/shotPose";
import {
  clipForm,
  discoverService,
  requestService,
  type JointResult,
} from "../coachAi/service";
import { MAX_CLIP_BYTES, ReplayInput, SavedReplay } from "../replays/repository";

type Clip = {
  id: string;
  uri: string;
  input?: ReplayInput;
  width: number;
  height: number;
  duration: number;
  saved: boolean;
};

export function ShotAnalysis() {
  const { C, s } = useTheme();
  const [clip, setClip] = useState<Clip | null>(null);
  const [history, setHistory] = useState<SavedReplay[]>([]);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [picking, setPicking] = useState(false);
  const mounted = useRef(true);
  const opened = useRef<string | null>(null);
  const generation = useRef(0);
  const pickerPending = useRef(false);
  const currentId = useRef<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    const refresh = () =>
      void replays
        .list()
        .then((items) => {
          if (mounted.current) {
            setHistory(items);
            setHistoryError("");
          }
        })
        .catch((e) => {
          if (mounted.current) setHistoryError(e.message);
        });
    refresh();
    const unsubscribe = replays.subscribe(refresh);
    return () => {
      mounted.current = false;
      generation.current++;
      unsubscribe();
      if (opened.current) replays.release(opened.current);
    };
  }, []);
  function replace(next: Clip | null) {
    generation.current++;
    currentId.current = next?.id ?? null;
    if (opened.current) {
      replays.release(opened.current);
      opened.current = null;
    }
    setClip(next);
  }
  async function pick(camera: boolean) {
    if (pickerPending.current) return;
    pickerPending.current = true;
    const request = ++generation.current;
    setPicking(true);
    setError("");
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!mounted.current || request !== generation.current) return;
        if (!permission.granted) {
          setError(
            "Allow camera access in your device settings to record, or choose an existing video.",
          );
          return;
        }
      }
      const result = await (camera
        ? ImagePicker.launchCameraAsync({
            mediaTypes: ["videos"],
            videoMaxDuration: 30,
            videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
          })
        : ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["videos"],
            allowsMultipleSelection: false,
          }));
      if (result.canceled || !mounted.current || request !== generation.current) return;
      const asset = result.assets[0];
      const pickedDuration = (asset.duration ?? 0) / (Platform.OS === "web" ? 1 : 1000);
      if (pickedDuration > 30.05) {
        setError("Choose a clip up to 30 seconds.");
        return;
      }
      if ((asset.fileSize ?? 0) > MAX_CLIP_BYTES) {
        setError("Choose a video under 50 MB.");
        return;
      }
      replace({
        id: `replay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        uri: asset.uri,
        input: { uri: asset.uri, file: asset.file, mimeType: asset.mimeType },
        width: asset.width || 16,
        height: asset.height || 9,
        duration: pickedDuration,
        saved: false,
      });
    } catch {
      if (mounted.current && request === generation.current)
        setError("Could not open the video. Try again or choose another clip.");
    } finally {
      pickerPending.current = false;
      if (mounted.current) setPicking(false);
    }
  }
  async function open(item: SavedReplay) {
    const request = ++generation.current;
    setError("");
    try {
      const uri = await replays.open(item.id);
      if (!mounted.current || request !== generation.current) {
        replays.release(uri);
        return;
      }
      replace({
        id: item.id,
        uri,
        width: item.analysis.width,
        height: item.analysis.height,
        duration: item.analysis.duration,
        saved: true,
      });
      opened.current = uri;
    } catch (e) {
      if (mounted.current && request === generation.current)
        setError(e instanceof Error ? e.message : "Could not open this replay.");
    }
  }
  function remove(item: SavedReplay) {
    const action = () =>
      void replays
        .remove(item.id)
        .then(() => {
          if (mounted.current && currentId.current === item.id) replace(null);
        })
        .catch((e) => {
          if (mounted.current) setError(e.message);
        });
    const message =
      "This video and its saved replay will be permanently deleted from this device.";
    if (Platform.OS === "web") {
      if (window.confirm(message)) action();
    } else
      Alert.alert("Delete replay?", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: action },
      ]);
  }
  function clearHistory() {
    const action = () =>
      void replays
        .clear()
        .then(() => {
          if (mounted.current) {
            replace(null);
            setHistoryError("");
          }
        })
        .catch((e) => {
          if (mounted.current) setHistoryError(e.message);
        });
    const message =
      "All saved replay videos will be permanently deleted. Your training history will stay.";
    if (Platform.OS === "web") {
      if (window.confirm(message)) action();
    } else
      Alert.alert("Clear saved replays?", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Clear replays", style: "destructive", onPress: action },
      ]);
  }
  const pickerActions = (
    <View style={{ gap: 10 }}>
      <Button
        label="Record shot"
        icon={Camera}
        disabled={picking}
        onPress={() => void pick(true)}
      />
      <Button
        label="Choose video"
        icon={Upload}
        kind="secondary"
        disabled={picking}
        onPress={() => void pick(false)}
      />
      <Text style={s.small}>Up to 30 seconds · 50 MB. Videos stay on this device.</Text>
    </View>
  );
  return (
    <Page contentStyle={{ gap: 24, paddingTop: 4 }}>
      {clip ? (
        <ShotReview
          key={clip.id}
          clip={clip}
          picking={picking}
          onSaved={() =>
            setClip((current) =>
              current?.id === clip.id ? { ...current, saved: true } : current,
            )
          }
        />
      ) : (
        <>
          <View style={{ gap: 8 }}>
            <Text accessibilityRole="header" style={s.h2}>
              Review your shot in slow motion.
            </Text>
            <Text style={s.small}>Slow-motion review · optional body tracking.</Text>
          </View>
          {pickerActions}
          <View style={[styles.empty, { backgroundColor: C.soft }]}>
            <Film color={C.green} size={28} />
            <Text style={s.h3}>Your shot, frame by frame</Text>
            <Text style={s.body}>Pause at contact to take a closer look.</Text>
          </View>
        </>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
          {error}
        </Text>
      ) : null}
      {clip ? <Disclosure label="Choose another clip">{pickerActions}</Disclosure> : null}
      <Disclosure label="How to film your shot">
        <Text style={s.body}>
          Prop your phone safely to the side, outside the ball’s path. Keep your whole
          body and the ball in frame, with a little space for your follow-through.
        </Text>
        <Text style={s.small}>
          Use a clear practice area and check that nobody is in the line of your shot.
        </Text>
      </Disclosure>
      <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={s.h3}>
          Saved replays
        </Text>
        {history.length > 0 || historyError ? (
          <Text style={s.small}>
            {history.length}/10 clips · 200 MB total · no cloud backup
          </Text>
        ) : null}
        {history.length === 0 && !historyError ? (
          <Text style={s.body}>Save a shot after reviewing it to return to it here.</Text>
        ) : null}
        {history.map((item) => (
          <View key={item.id} style={[styles.historyRow, { borderBottomColor: C.line }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open replay from ${new Date(item.createdAt).toLocaleString()}`}
              onPress={() => void open(item)}
              style={styles.historyOpen}
            >
              <Text style={s.h3}>
                {item.analysis.detector === "manual-review" ? "Shot replay" : item.title}
              </Text>
              <Text style={s.small}>
                {new Date(item.createdAt).toLocaleDateString()} ·{" "}
                {item.analysis.duration.toFixed(1)}s
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete replay from ${new Date(item.createdAt).toLocaleString()}`}
              onPress={() => remove(item)}
              style={styles.delete}
            >
              <Text style={[s.small, { color: C.danger }]}>Delete</Text>
            </Pressable>
          </View>
        ))}
        {historyError ? (
          <>
            <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
              {historyError}
            </Text>
            <Button kind="secondary" label="Clear saved replays" onPress={clearHistory} />
          </>
        ) : null}
      </View>
    </Page>
  );
}

function ShotReview({
  clip,
  picking,
  onSaved,
}: {
  clip: Clip;
  picking: boolean;
  onSaved: () => void;
}) {
  const { C, s } = useTheme();
  const focused = useIsFocused();
  const { data } = useApp();
  const eligible = data.profile.ageBand === "13to17" || data.profile.ageBand === "adult";
  const [consent, setConsent] = useState(false);
  const [pose, setPose] = useState<JointResult | null>(null);
  const [poseBusy, setPoseBusy] = useState(false);
  const [poseError, setPoseError] = useState("");
  const [showPose, setShowPose] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [kickingFoot, setKickingFoot] = useState<"left" | "right" | null>(null);
  const poseAbort = useRef<AbortController | null>(null);
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(true);
  const [time, setTime] = useState(0);
  // The mounted player is authoritative; picker duration units differ by platform.
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: clip.width > 0 ? clip.width : 16,
    height: clip.height > 0 ? clip.height : 9,
  });
  const timelineWidth = useRef(1);
  const timelinePressX = useRef<number | null>(null);
  const [videoError, setVideoError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  const savingAbort = useRef<AbortController | null>(null);
  // This screen owns one player for the selected clip; avoid source replacement
  // during ordinary review renders (including body-overlay updates).
  const player = useMemo(() => {
    const p = createVideoPlayer(clip.uri);
    p.loop = false;
    p.muted = true;
    p.playbackRate = 0.5;
    return p;
  }, [clip.uri]);
  useEffect(() => {
    mounted.current = true;
    const readMetadata = () => {
      if (Number.isFinite(player.duration) && player.duration > 0)
        setDuration(player.duration);
      const size = player.availableVideoTracks[0]?.size;
      if (size?.width > 0 && size.height > 0) setDimensions(size);
    };
    const load = player.addListener("sourceLoad", (e) => {
      if (Number.isFinite(e.duration) && e.duration > 0) setDuration(e.duration);
      const size = e.availableVideoTracks[0]?.size;
      if (size?.width > 0 && size.height > 0) setDimensions(size);
    });
    const status = player.addListener("statusChange", (e) => {
      setLoaded(e.status === "readyToPlay");
      if (e.status === "readyToPlay") readMetadata();
      setVideoError(
        e.status === "error"
          ? "This video could not be played. Choose another clip."
          : "",
      );
    });
    const tick = player.addListener("timeUpdate", (e) => {
      setTime(e.currentTime);
      readMetadata();
    });
    const play = player.addListener("playingChange", (e) => setPlaying(e.isPlaying));
    player.timeUpdateEventInterval = 1 / 24;
    const background = AppState.addEventListener("change", (state) => {
      if (state !== "active") player.pause();
    });
    if (player.status === "readyToPlay") {
      setLoaded(true);
      readMetadata();
    }
    return () => {
      mounted.current = false;
      load.remove();
      status.remove();
      tick.remove();
      play.remove();
      background.remove();
      savingAbort.current?.abort();
      poseAbort.current?.abort();
      player.pause();
      player.timeUpdateEventInterval = 0;
      player.release();
    };
  }, [player]);
  useEffect(() => {
    if (!focused || picking) player.pause();
  }, [focused, picking, player]);
  useEffect(() => {
    if (!eligible) {
      poseAbort.current?.abort();
      setConsent(false);
      setPose(null);
    }
  }, [eligible]);
  async function analyzeBody() {
    if (!eligible || !consent || !usable || poseAbort.current) return;
    const abort = new AbortController();
    poseAbort.current = abort;
    setPoseBusy(true);
    setPoseError("");
    player.pause();
    const timeout = setTimeout(() => abort.abort(), 100000);
    try {
      const service = await discoverService(abort.signal);
      if (!service?.jointViewAvailable)
        throw new Error(
          "Body tracking is unavailable right now. You can still review and save your video.",
        );
      if (abort.signal.aborted) return;
      const form = await clipForm({
        uri: clip.uri,
        width: dimensions.width,
        height: dimensions.height,
        type: "video",
        duration: duration * 1000,
        file: clip.input?.file as File | undefined,
      });
      if (abort.signal.aborted) return;
      const result = await requestService<JointResult>(
        service,
        "pose",
        form,
        abort.signal,
      );
      if (abort.signal.aborted || !mounted.current) return;
      if (!validShotPose(result))
        throw new Error("The body tracking result could not be read. Try again.");
      if (!poseMatchesVideo(result, dimensions.width, dimensions.height, duration))
        throw new Error(
          "Tracking could not be aligned with this video. Try a new recording.",
        );
      if (!poseHasBody(result))
        throw new Error(
          "No clear body landmarks were found. Keep one whole person visible and try again.",
        );
      setPose(result);
      setShowPose(true);
      setShowLabels(true);
      seek(0);
    } catch (e) {
      if (mounted.current)
        setPoseError(
          abort.signal.aborted
            ? "Body tracking stopped. Your video is still available for review."
            : e instanceof Error
              ? e.message
              : "Body tracking could not finish. Try again.",
        );
    } finally {
      clearTimeout(timeout);
      poseAbort.current = null;
      if (mounted.current) setPoseBusy(false);
    }
  }
  function seek(next: number) {
    if (!Number.isFinite(next)) return;
    player.pause();
    const value = Math.max(0, Math.min(Math.max(0, duration - 0.001), next));
    player.seekBy(value - player.currentTime);
    // Read back the player clock; never draw a requested pose over an unseeked frame.
    setTime(player.currentTime);
  }
  async function save() {
    if (!clip.input || saving || !loaded || duration <= 0 || duration > 30.05) return;
    setSaving(true);
    setSaveError("");
    const abort = new AbortController();
    savingAbort.current = abort;
    const analysis: ReplayAnalysis = {
      width: dimensions.width,
      height: dimensions.height,
      duration,
      detector: "manual-review",
      frames: [{ time: 0, x: null, y: null, trackId: null, confidence: null }],
    };
    try {
      await replays.save(clip.id, clip.input, analysis, abort.signal);
      if (mounted.current) onSaved();
    } catch (e) {
      if (mounted.current)
        setSaveError(e instanceof Error ? e.message : "Could not save this video.");
    } finally {
      if (mounted.current) setSaving(false);
    }
  }
  const usable = loaded && duration > 0 && duration <= 30.05;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={s.h3}>
          Review your shot
        </Text>
        <Text style={s.small}>Video review · optional body tracking</Text>
      </View>
      <View style={[styles.video, { aspectRatio: dimensions.width / dimensions.height }]}>
        <VideoView
          player={player}
          nativeControls={false}
          contentFit="contain"
          surfaceType="textureView"
          style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        />
        {pose && showPose ? (
          <ShotPoseOverlay
            pose={pose}
            time={time}
            labels={showLabels}
            kickingFoot={kickingFoot}
          />
        ) : null}
      </View>
      {videoError ? (
        <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
          {videoError}
        </Text>
      ) : null}
      {(!loaded || duration <= 0) && !videoError ? (
        <Text style={s.small}>Loading video…</Text>
      ) : null}
      {duration > 30.05 ? (
        <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
          This clip is too long. Choose a video up to 30 seconds.
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Video position"
        accessibilityValue={{
          min: 0,
          max: Math.max(0, duration),
          now: Math.min(time, Math.max(0, duration)),
          text: `${time.toFixed(1)} of ${duration.toFixed(1)} seconds`,
        }}
        accessibilityActions={[
          { name: "increment", label: "Forward one second" },
          { name: "decrement", label: "Back one second" },
        ]}
        onAccessibilityAction={(event) =>
          seek(time + (event.nativeEvent.actionName === "increment" ? 1 : -1))
        }
        disabled={!usable}
        onLayout={(event) => {
          timelineWidth.current = event.nativeEvent.layout.width;
        }}
        // React Native Web's onPress receives a MouseEvent without locationX.
        // onPressIn receives the normalized responder coordinates on both platforms.
        onPressIn={(event) => {
          const x = event.nativeEvent.locationX;
          timelinePressX.current = Number.isFinite(x) ? x : null;
        }}
        onPress={(event) => {
          const x = timelinePressX.current ?? event.nativeEvent.locationX;
          timelinePressX.current = null;
          if (Number.isFinite(x) && timelineWidth.current > 0)
            seek(
              (Math.max(0, Math.min(timelineWidth.current, x)) / timelineWidth.current) *
                duration,
            );
        }}
        style={{ minHeight: 48, justifyContent: "center", gap: 8 }}
      >
        <View
          pointerEvents="none"
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: C.lineStrong,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 6,
              width: `${duration > 0 ? Math.max(0, Math.min(100, (time / duration) * 100)) : 0}%`,
              backgroundColor: C.green,
            }}
          />
        </View>
        <Text pointerEvents="none" style={s.small}>
          {duration > 0
            ? `${time.toFixed(1)}s / ${duration.toFixed(1)}s · Tap to seek`
            : "Loading video position…"}
        </Text>
      </Pressable>
      <View style={styles.controls}>
        <View style={{ flex: 1 }}>
          <Button
            label={
              playing
                ? "Pause"
                : duration > 0 && time >= duration - 0.1
                  ? "Replay"
                  : "Play"
            }
            icon={playing ? Pause : Play}
            disabled={!usable}
            onPress={() => {
              if (playing) player.pause();
              else {
                if (duration > 0 && time >= duration - 0.1)
                  player.seekBy(-player.currentTime);
                player.play();
              }
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={slow ? "Speed: 0.5×" : "Speed: 1×"}
            kind="secondary"
            disabled={!usable}
            onPress={() => {
              player.playbackRate = slow ? 1 : 0.5;
              setSlow(!slow);
            }}
          />
        </View>
      </View>
      <View style={styles.controls}>
        <View style={{ flex: 1 }}>
          <Button
            label="−0.04s"
            accessibilityLabel="Step back 0.04 seconds"
            kind="secondary"
            disabled={!usable}
            onPress={() => seek(time - 0.04)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Start"
            icon={RotateCcw}
            kind="secondary"
            disabled={!usable}
            onPress={() => seek(0)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="+0.04s"
            accessibilityLabel="Step forward 0.04 seconds"
            kind="secondary"
            disabled={!usable}
            onPress={() => seek(time + 0.04)}
          />
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Text style={s.h3}>Body tracking</Text>
        {pose ? (
          <>
            <View style={styles.toggleRow}>
              <Text style={[s.body, { flex: 1 }]}>Show body lines</Text>
              <Switch
                accessibilityLabel="Show body lines"
                value={showPose}
                onValueChange={setShowPose}
                trackColor={{ true: C.green }}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={[s.body, { flex: 1 }]}>Show movement labels</Text>
              <Switch
                accessibilityLabel="Show movement labels"
                value={showLabels}
                onValueChange={setShowLabels}
                trackColor={{ true: C.green }}
              />
            </View>
            {showLabels ? (
              <>
                <Text style={s.small}>
                  Which foot are you kicking with? This labels the legs; it does not
                  detect contact or judge technique.
                </Text>
                <View style={styles.controls}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={kickingFoot === "left" ? "Left foot ✓" : "Left foot"}
                      kind="secondary"
                      onPress={() => setKickingFoot("left")}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={kickingFoot === "right" ? "Right foot ✓" : "Right foot"}
                      kind="secondary"
                      onPress={() => setKickingFoot("right")}
                    />
                  </View>
                </View>
              </>
            ) : null}
            <Text style={s.small}>
              {showPose && !shotPoseAt(pose, time)
                ? "No nearby body sample at this moment."
                : "Estimated 2D landmarks · gaps hide uncertain joints."}{" "}
              Body lines are not a technique score. Saved replays keep the video only.
            </Text>
          </>
        ) : null}
        {!pose ? (
          <Text style={s.small}>
            See estimated body lines on your movement. Keep your whole body and the ball
            in view.
          </Text>
        ) : null}
        {eligible ? (
          <>
            <Text style={s.small}>
              Analyze movement sends this clip to the body tracking service. Temporary
              files are deleted after processing. No frames are sent to OpenAI.
            </Text>
            <View style={styles.toggleRow}>
              <Text style={[s.small, { flex: 1, paddingRight: 12 }]}>
                This is my clip and I agree to process it for body tracking.
              </Text>
              <Switch
                accessibilityLabel="I agree to process my clip for body tracking"
                value={consent}
                disabled={poseBusy}
                onValueChange={setConsent}
                trackColor={{ true: C.green }}
              />
            </View>
            <Button
              label={
                poseBusy
                  ? "Tracking movement…"
                  : pose
                    ? "Track again"
                    : "Analyze movement"
              }
              disabled={!consent || !usable || poseBusy}
              onPress={() => void analyzeBody()}
            />
            {poseBusy ? (
              <Button
                label="Cancel body tracking"
                kind="secondary"
                onPress={() => poseAbort.current?.abort()}
              />
            ) : null}
          </>
        ) : (
          <Text style={s.small}>
            {data.profile.ageBand === "under13"
              ? "Body tracking uploads are unavailable for your age range. Local video review stays available."
              : "Add an age range in training preferences to check body tracking availability. Local review stays available."}
          </Text>
        )}
        {poseError ? (
          <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
            {poseError}
          </Text>
        ) : null}
      </View>
      <Disclosure label="What to look for">
        <Text style={s.body}>Approach: is your run-up controlled?</Text>
        <Text style={s.body}>
          Contact: pause as your foot meets the ball. Where is your plant foot, and which
          part of your striking foot makes contact?
        </Text>
        <Text style={s.body}>
          Finish: step forward and watch how your kicking leg follows through and how you
          regain balance.
        </Text>
        <Text style={s.small}>
          Use these prompts to observe your movement. They are not an assessment or a
          technique score.
        </Text>
      </Disclosure>
      <Button
        label={
          clip.saved ? "Saved on this device" : saving ? "Saving replay…" : "Save replay"
        }
        disabled={clip.saved || saving || !usable}
        onPress={() => void save()}
      />
      {!clip.saved ? (
        <Text style={s.small}>
          Save keeps the video only; body tracking is not saved. Unsaved clips are
          temporary.
        </Text>
      ) : null}
      {saveError ? (
        <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
          {saveError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { padding: 20, borderRadius: 16, gap: 12 },
  historyRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1 },
  historyOpen: {
    flex: 1,
    minHeight: 72,
    paddingVertical: 12,
    gap: 4,
    justifyContent: "center",
  },
  delete: { minWidth: 56, minHeight: 48, alignItems: "center", justifyContent: "center" },
  video: {
    maxHeight: 420,
    width: "100%",
    backgroundColor: "#10271D",
    borderRadius: 12,
    overflow: "hidden",
  },
  controls: { flexDirection: "row", gap: 8 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingVertical: 4,
  },
});
