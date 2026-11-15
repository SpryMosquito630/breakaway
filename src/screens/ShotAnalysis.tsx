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
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { createVideoPlayer, VideoView } from "expo-video";
import { useIsFocused } from "@react-navigation/native";
import {
  Bookmark,
  Camera,
  Film,
  Pause,
  Play,
  RotateCcw,
  StepBack,
  StepForward,
  Upload,
} from "lucide-react-native";
import { Button, Disclosure, Page, useTheme } from "../components/ui";
import { haptic } from "../utils/haptics";
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

const NEON = "#B6FF00";

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
      <View style={styles.captureActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Record shot"
          disabled={picking}
          onPress={() => void pick(true)}
          style={({ pressed }) => [
            styles.captureChoice,
            { opacity: picking ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <View style={[styles.captureCircle, { backgroundColor: NEON }]}>
            <Camera size={25} color={C.onLime} />
          </View>
          <Text style={[s.small, { color: C.ink }]}>Record shot</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose video"
          disabled={picking}
          onPress={() => void pick(false)}
          style={({ pressed }) => [
            styles.captureChoice,
            { opacity: picking ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <View style={[styles.captureCircle, { backgroundColor: C.soft }]}>
            <Upload size={23} color={C.ink} />
          </View>
          <Text style={[s.small, { color: C.ink }]}>Choose video</Text>
        </Pressable>
      </View>
    </View>
  );
  return (
    <Page contentStyle={{ gap: clip ? 16 : 20, paddingTop: 4 }}>
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
          <View style={{ gap: 6 }}>
            <Text accessibilityRole="header" style={s.h1}>
              Film your shot
            </Text>
          </View>
          <View style={[styles.captureStage, { backgroundColor: C.soft }]}>
            <View
              style={[
                styles.corner,
                {
                  top: 16,
                  left: 16,
                  borderTopWidth: 2,
                  borderLeftWidth: 2,
                  borderColor: C.lineStrong,
                },
              ]}
            />
            <View
              style={[
                styles.corner,
                {
                  top: 16,
                  right: 16,
                  borderTopWidth: 2,
                  borderRightWidth: 2,
                  borderColor: C.lineStrong,
                },
              ]}
            />
            <View
              style={[
                styles.corner,
                {
                  bottom: 16,
                  left: 16,
                  borderBottomWidth: 2,
                  borderLeftWidth: 2,
                  borderColor: C.lineStrong,
                },
              ]}
            />
            <View
              style={[
                styles.corner,
                {
                  bottom: 16,
                  right: 16,
                  borderBottomWidth: 2,
                  borderRightWidth: 2,
                  borderColor: C.lineStrong,
                },
              ]}
            />
            <Film color={C.muted} size={38} strokeWidth={1.25} />
            <Text style={[s.body, { textAlign: "center" }]}>
              Keep your body and ball in frame.
            </Text>
          </View>
          {pickerActions}
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
          Film from the side with your body and ball visible. Keep your phone clear of the
          shot.
        </Text>
        <Text style={s.small}>
          Up to 30 seconds · 50 MB. Saved replays stay on this device, up to 10 clips or
          200 MB.
        </Text>
      </Disclosure>
      {history.length > 0 || historyError ? (
        <View style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={s.h3}>
            Saved replays
          </Text>
          {history.map((item) => (
            <View
              key={item.id}
              style={[styles.historyRow, { borderBottomColor: C.line }]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open replay from ${new Date(item.createdAt).toLocaleString()}`}
                onPress={() => void open(item)}
                style={styles.historyOpen}
              >
                <Text style={s.h3}>
                  {item.analysis.detector === "manual-review"
                    ? "Shot replay"
                    : item.title}
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
              <Button
                kind="secondary"
                label="Clear saved replays"
                onPress={clearHistory}
              />
            </>
          ) : null}
        </View>
      ) : null}
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
  const [speed, setSpeed] = useState(0.5);
  const { height: windowHeight } = useWindowDimensions();
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
  const togglePlayback = () => {
    if (playing) player.pause();
    else {
      if (duration > 0 && time >= duration - 0.1) player.seekBy(-player.currentTime);
      player.play();
    }
  };
  const playbackLabel = playing
    ? "Pause"
    : duration > 0 && time >= duration - 0.1
      ? "Replay"
      : "Play";
  return (
    <View style={{ gap: 12 }}>
      <View
        style={[
          styles.video,
          {
            aspectRatio: dimensions.width / dimensions.height,
            maxHeight: Math.max(360, Math.min(620, windowHeight * 0.66)),
          },
        ]}
      >
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
              backgroundColor: NEON,
              borderWidth: 1,
              borderColor: C.green,
            }}
          />
        </View>
        <Text
          pointerEvents="none"
          style={[s.small, { textAlign: "right", fontVariant: ["tabular-nums"] }]}
        >
          {duration > 0
            ? `${time.toFixed(1)}s / ${duration.toFixed(1)}s`
            : "Loading video position…"}
        </Text>
      </Pressable>
      <View style={styles.transportRow}>
        <View style={styles.transportGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Step back 0.04 seconds"
            disabled={!usable}
            onPress={() => seek(time - 0.04)}
            style={({ pressed }) => [
              styles.iconControl,
              { opacity: !usable ? 0.35 : pressed ? 0.65 : 1 },
            ]}
          >
            <StepBack size={21} color={C.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playbackLabel}
            disabled={!usable}
            onPress={togglePlayback}
            style={({ pressed }) => [
              styles.playControl,
              { backgroundColor: NEON, opacity: !usable ? 0.35 : pressed ? 0.7 : 1 },
            ]}
          >
            {playing ? (
              <Pause size={23} color={C.onLime} fill={C.onLime} />
            ) : (
              <Play size={23} color={C.onLime} fill={C.onLime} />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Step forward 0.04 seconds"
            disabled={!usable}
            onPress={() => seek(time + 0.04)}
            style={({ pressed }) => [
              styles.iconControl,
              { opacity: !usable ? 0.35 : pressed ? 0.65 : 1 },
            ]}
          >
            <StepForward size={21} color={C.ink} />
          </Pressable>
        </View>
        <View style={[styles.speedGroup, { backgroundColor: C.soft }]}>
          {[0.5, 1, 2].map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={`Playback speed ${value} times`}
              accessibilityState={{ checked: speed === value }}
              disabled={!usable}
              onPress={() => {
                player.playbackRate = value;
                setSpeed(value);
              }}
              style={({ pressed }) => [
                styles.speedControl,
                {
                  backgroundColor: speed === value ? NEON : "transparent",
                  opacity: !usable ? 0.35 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={[
                  s.small,
                  {
                    fontFamily: "Archivo_600SemiBold",
                    color: speed === value ? C.onLime : C.muted,
                  },
                ]}
              >
                {value}×
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={[styles.summaryRow, { borderBottomColor: C.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to start of video"
          disabled={!usable}
          onPress={() => seek(0)}
          style={styles.quietAction}
        >
          <RotateCcw size={16} color={C.muted} />
          <Text style={s.small}>Restart</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clip.saved ? "Saved on this device" : "Save replay"}
          accessibilityState={{ disabled: clip.saved || saving || !usable }}
          disabled={clip.saved || saving || !usable}
          onPress={() => void save()}
          style={({ pressed }) => [styles.quietAction, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Bookmark
            size={17}
            color={clip.saved ? C.green : C.ink}
            fill={clip.saved ? C.green : "transparent"}
          />
          <Text style={[s.small, { color: C.ink }]}>
            {clip.saved ? "Saved" : saving ? "Saving…" : "Save replay"}
          </Text>
        </Pressable>
      </View>
      {saveError ? (
        <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
          {saveError}
        </Text>
      ) : null}
      {pose ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TrackingChip
              label="Body lines"
              selected={showPose}
              onPress={() => setShowPose(!showPose)}
            />
            <TrackingChip
              label="Labels"
              selected={showLabels}
              onPress={() => setShowLabels(!showLabels)}
            />
          </View>
          {showLabels ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Text style={s.small}>Kicking foot</Text>
              <TrackingChip
                label="Left"
                selected={kickingFoot === "left"}
                onPress={() => setKickingFoot("left")}
              />
              <TrackingChip
                label="Right"
                selected={kickingFoot === "right"}
                onPress={() => setKickingFoot("right")}
              />
            </View>
          ) : null}
          {showPose && !shotPoseAt(pose, time) ? (
            <Text style={s.small}>No nearby body sample at this moment.</Text>
          ) : null}
        </View>
      ) : null}
      {poseBusy ? (
        <View style={styles.transportRow}>
          <Text style={s.small}>Tracking movement…</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel body tracking"
            onPress={() => poseAbort.current?.abort()}
            style={styles.quietAction}
          >
            <Text style={[s.small, { color: C.ink }]}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}
      <Disclosure label={pose ? "Tracking options" : "Add body tracking"}>
        {eligible ? (
          <>
            <Text style={s.small}>
              This clip is sent to the tracking service. Temporary files are deleted after
              processing.
            </Text>
            <View style={styles.toggleRow}>
              <Text style={[s.small, { flex: 1, paddingRight: 12 }]}>
                This is my clip. I agree to body tracking.
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
              kind="secondary"
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
        <Text style={s.small}>
          Estimated 2D landmarks, not a technique score. Save keeps the video only.
        </Text>
        <Text style={s.small}>Choose your kicking foot to label the legs.</Text>
      </Disclosure>
      {poseError ? (
        <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
          {poseError}
        </Text>
      ) : null}
      <Disclosure label="Review notes">
        <Text style={s.body}>Watch your run-up, plant foot and follow-through.</Text>
      </Disclosure>
    </View>
  );
}

function TrackingChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { C, s } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic("selection");
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 28,
        backgroundColor: selected ? NEON : C.white,
        borderWidth: 1,
        borderColor: selected ? C.green : C.lineStrong,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={[
          s.small,
          { fontFamily: "Archivo_600SemiBold", color: selected ? C.onLime : C.muted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  captureStage: {
    height: 280,
    width: "100%",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 44,
    gap: 16,
  },
  corner: { position: "absolute", width: 24, height: 24 },
  captureActions: { flexDirection: "row", justifyContent: "center", gap: 40 },
  captureChoice: { alignItems: "center", gap: 8, paddingVertical: 4, minWidth: 88 },
  captureCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
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
    width: "100%",
    backgroundColor: "#10271D",
    borderRadius: 12,
    overflow: "hidden",
  },
  controls: { flexDirection: "row", gap: 8 },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  transportGroup: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconControl: { width: 44, height: 48, alignItems: "center", justifyContent: "center" },
  playControl: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  speedGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    padding: 3,
  },
  speedControl: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  quietAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 4,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingVertical: 4,
  },
});
