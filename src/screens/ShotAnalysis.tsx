import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type PressableProps,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { createVideoPlayer, VideoView } from "expo-video";
import { useIsFocused } from "@react-navigation/native";
import {
  Bookmark,
  Camera,
  ArrowLeftRight,
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
import {
  bodyTrackingDefaults,
  canStartBodyTracking,
  createShotTrackingStart,
} from "../domain/shotTracking";
import { createClipSaveLease, createClipUrlOwner } from "../domain/clipUrlOwner";
import { keyboardClipSeek } from "../domain/clipPlayback";
import { videoPreviewSize, type PreviewFit } from "../domain/videoPreview";
import { ShotPoseOverlay } from "../components/ShotPoseOverlay";
import { ShotSpeed } from "../components/ShotSpeed";
import { ShotTechnique } from "../components/ShotTechnique";
import {
  validShotTechnique,
  type ShotTechnique as TechniqueReview,
} from "../domain/shotTechnique";
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
  prepareShotReview,
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
  analyzeOnLoad: boolean;
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
  const clipUrls = useMemo(() => createClipUrlOwner((uri) => replays.release(uri)), []);
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
      clipUrls.clear();
      opened.current = null;
    };
  }, [clipUrls]);
  function replace(next: Clip | null) {
    generation.current++;
    currentId.current = next?.id ?? null;
    if (opened.current && opened.current !== next?.uri) clipUrls.release(opened.current);
    opened.current = next?.uri ?? null;
    setClip(next);
  }
  async function pick(camera: boolean) {
    if (pickerPending.current) return;
    pickerPending.current = true;
    const request = ++generation.current;
    setPicking(true);
    setError("");
    let pickerAssets: ImagePicker.ImagePickerAsset[] = [];
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
      pickerAssets = result.assets ?? [];
      pickerAssets.forEach((asset) => clipUrls.acquire(asset.uri));
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
        analyzeOnLoad: true,
      });
    } catch {
      if (mounted.current && request === generation.current)
        setError("Could not open the video. Try again or choose another clip.");
    } finally {
      pickerAssets.forEach((asset) => {
        if (asset.uri !== opened.current) clipUrls.release(asset.uri);
      });
      pickerPending.current = false;
      if (mounted.current) setPicking(false);
    }
  }
  async function open(item: SavedReplay) {
    const request = ++generation.current;
    setError("");
    try {
      const uri = await replays.open(item.id);
      clipUrls.acquire(uri);
      if (!mounted.current || request !== generation.current) {
        clipUrls.release(uri);
        return;
      }
      replace({
        id: item.id,
        uri,
        width: item.analysis.width,
        height: item.analysis.height,
        duration: item.analysis.duration,
        saved: true,
        analyzeOnLoad: false,
      });
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
    <View style={styles.captureActions}>
      <Text style={[s.small, { color: clip ? C.muted : C.onDeep }]}>
        Your selected video is processed for body tracking. When AI review is connected,
        video frames are also sent to Google Gemini for a technique estimate.
      </Text>
      <Button
        label={picking ? "Opening…" : "Record & analyze"}
        icon={Camera}
        kind="lime"
        disabled={picking}
        onPress={() => void pick(true)}
      />
      <Button
        label="Choose & analyze video"
        icon={Upload}
        kind="secondary"
        disabled={picking}
        onPress={() => void pick(false)}
      />
    </View>
  );
  return (
    <Page contentStyle={{ gap: clip ? 16 : 20, paddingTop: 4 }}>
      {clip ? (
        <ShotReview
          key={clip.id}
          clip={clip}
          picking={picking}
          replacementActions={pickerActions}
          onSaved={() =>
            setClip((current) =>
              current?.id === clip.id ? { ...current, saved: true } : current,
            )
          }
        />
      ) : (
        <>
          <View style={[styles.captureStage, { backgroundColor: C.deep }]}>
            <Text accessibilityRole="header" style={[s.h1, { color: C.onDeep }]}>
              Review your shot
            </Text>
            <Text style={[s.body, { color: C.onDeep }]}>
              Film from the side, with your whole body and ball in frame.
            </Text>
            {pickerActions}
          </View>
          <Text style={s.small}>
            Up to 30 seconds · Body tracking starts automatically.
          </Text>
        </>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
          {error}
        </Text>
      ) : null}
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
  replacementActions,
}: {
  replacementActions: ReactNode;
  clip: Clip;
  picking: boolean;
  onSaved: () => void;
}) {
  const { C, s } = useTheme();
  const focused = useIsFocused();
  const trackingStart = useMemo(
    () => createShotTrackingStart(clip.analyzeOnLoad),
    [clip.id, clip.analyzeOnLoad],
  );
  const [pose, setPose] = useState<JointResult | null>(null);
  const [poseBusy, setPoseBusy] = useState(false);
  const [poseError, setPoseError] = useState("");
  const [technique, setTechnique] = useState<TechniqueReview | null>(null);
  const [techniqueBusy, setTechniqueBusy] = useState(false);
  const [techniqueError, setTechniqueError] = useState("");
  const [showPose, setShowPose] = useState<boolean>(bodyTrackingDefaults.enabled);
  const [showLabels, setShowLabels] = useState(true);
  const [kickingFoot, setKickingFoot] = useState<"left" | "right" | null>(null);
  const poseAbort = useRef<AbortController | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.5);
  const { height: windowHeight, width: windowWidth, fontScale } = useWindowDimensions();
  const stackedMetrics = fontScale > 1.3 || windowWidth < 340;
  const [videoWidth, setVideoWidth] = useState(0);
  const [previewFit, setPreviewFit] = useState<PreviewFit>("cover");
  const [time, setTime] = useState(0);
  // The mounted player is authoritative; picker duration units differ by platform.
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: clip.width > 0 ? clip.width : 16,
    height: clip.height > 0 ? clip.height : 9,
  });
  // Preview-only framing; analysis and saved clips always use the full source.
  const previewSize = videoPreviewSize(
    dimensions,
    videoWidth || Math.max(1, windowWidth - 40),
    windowHeight,
    previewFit,
  );
  const timelineWidth = useRef(1);
  const timelinePressX = useRef<number | null>(null);
  const [videoError, setVideoError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [replacing, setReplacing] = useState(false);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  const saveLease = useMemo(() => createClipSaveLease(), []);
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
      saveLease.cancel();
      poseAbort.current?.abort();
      player.pause();
      player.timeUpdateEventInterval = 0;
      player.release();
    };
  }, [player]);
  useEffect(() => {
    if (!focused || picking) player.pause();
  }, [focused, picking, player]);
  async function analyzeBody() {
    if (
      !canStartBodyTracking({
        usable,
        busy: !!poseAbort.current,
      })
    )
      return;
    trackingStart.manual();
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
      if (abort.signal.aborted) throw new Error("Body tracking cancelled.");
      const form = await clipForm({
        uri: clip.uri,
        width: dimensions.width,
        height: dimensions.height,
        type: "video",
        duration: duration * 1000,
        file: clip.input?.file as File | undefined,
      });
      if (abort.signal.aborted) throw new Error("Body tracking cancelled.");
      let result: JointResult | null = null;
      const reviewService = await prepareShotReview(service);
      if (abort.signal.aborted || !mounted.current) return;
      if (reviewService) {
        setTechniqueBusy(true);
        setTechniqueError("");
        try {
          const review = await requestService<unknown>(
            reviewService,
            "shot-review",
            form,
            abort.signal,
          );
          if (abort.signal.aborted || !mounted.current) return;
          if (!validShotTechnique(review, duration))
            throw Error("The technique review could not be read. Try again.");
          setTechnique(review);
          result = review.pose ?? null;
        } catch (error) {
          if (abort.signal.aborted) throw error;
          if (mounted.current)
            setTechniqueError(
              error instanceof Error
                ? error.message
                : "Technique review could not finish.",
            );
        }
      } else {
        setTechniqueError(
          "AI technique review is unavailable on this connection. Body tracking and speed measurement still work.",
        );
      }
      if (!result)
        result = await requestService<JointResult>(service, "pose", form, abort.signal);
      if (abort.signal.aborted) throw new Error("Body tracking cancelled.");
      if (!mounted.current) return;
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
      if (mounted.current && abort.signal.aborted)
        setTechniqueError("Review stopped. Your video is still available.");
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
      if (mounted.current) {
        setPoseBusy(false);
        setTechniqueBusy(false);
      }
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
    if (!clip.input || !loaded || duration <= 0 || duration > 30.05) return;
    const abort = saveLease.begin();
    if (!abort) return;
    setSaving(true);
    setSaveError("");
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
      saveLease.finish(abort);
      if (mounted.current) setSaving(false);
    }
  }
  const usable = loaded && duration > 0 && duration <= 30.05;
  useEffect(() => {
    if (
      trackingStart.automatic({ usable, busy: !!poseAbort.current, focused, picking })
    ) {
      void analyzeBody();
    }
  }, [trackingStart, usable, focused, picking]);
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
        onLayout={({ nativeEvent }) => {
          const width = nativeEvent.layout.width;
          if (width > 0)
            setVideoWidth((previous) => (previous === width ? previous : width));
        }}
        style={styles.videoStage}
      >
        <View style={[styles.video, previewSize]}>
          <VideoView
            player={player}
            nativeControls={false}
            contentFit={previewFit}
            surfaceType="textureView"
            style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
          />
          {pose && showPose ? (
            <ShotPoseOverlay
              pose={pose}
              time={time}
              labels={showLabels}
              kickingFoot={kickingFoot}
              contentFit={previewFit}
              viewportSize={previewSize}
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={previewFit === "cover" ? "Show full video" : "Fill frame"}
            accessibilityHint={
              previewFit === "cover"
                ? "Fit the entire video without cropping."
                : "Enlarge the preview by cropping its edges."
            }
            onPress={() =>
              setPreviewFit((current) => (current === "cover" ? "contain" : "cover"))
            }
            style={({ pressed }) => [styles.previewFit, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Text style={styles.previewFitLabel}>
              {previewFit === "cover" ? "Fit" : "Fill"}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={[styles.metrics, stackedMetrics && styles.metricsStacked]}>
        <ShotSpeed
          key={clip.id}
          duration={duration}
          usable={usable}
          kickingFoot={kickingFoot}
          markTime={() => {
            player.pause();
            return player.currentTime;
          }}
        />
        <View style={[styles.techniqueInline, stackedMetrics && styles.techniqueStacked]}>
          <ShotTechnique
            review={technique}
            busy={techniqueBusy}
            error={techniqueError}
            onRetry={() => void analyzeBody()}
            onSeek={seek}
          />
        </View>
      </View>
      <View style={{ gap: 10 }}>
        {poseBusy ? (
          <View style={styles.transportRow}>
            <Text accessibilityLiveRegion="polite" style={s.h3}>
              Tracking movement…
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel body tracking"
              onPress={() => poseAbort.current?.abort()}
              style={styles.quietAction}
            >
              <Text style={[s.small, { color: C.ink }]}>Cancel</Text>
            </Pressable>
          </View>
        ) : poseError ? (
          <>
            <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
              {poseError}
            </Text>
            <Button
              label="Retry body tracking"
              kind="secondary"
              disabled={!usable}
              onPress={() => void analyzeBody()}
            />
          </>
        ) : !pose && clip.analyzeOnLoad ? (
          <Text accessibilityLiveRegion="polite" style={s.small}>
            Preparing body tracking…
          </Text>
        ) : !pose ? (
          <>
            <Text style={s.small}>
              Analyze processes this saved clip for body tracking and, when connected,
              sends video frames to Google Gemini for a technique estimate.
            </Text>
            <Button
              label="Analyze movement"
              kind="lime"
              disabled={!usable}
              onPress={() => void analyzeBody()}
            />
          </>
        ) : (
          <Text style={s.small}>Body tracking ready</Text>
        )}
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
        {...(Platform.OS === "web"
          ? {
              "aria-valuemin": 0,
              "aria-valuemax": Math.max(0, duration),
              "aria-valuenow": Math.max(0, Math.min(time, Math.max(0, duration))),
              "aria-valuetext": `${time.toFixed(1)} of ${duration.toFixed(1)} seconds`,
              onKeyDown: (
                event: Parameters<NonNullable<PressableProps["onKeyDown"]>>[0],
              ) => {
                const target = keyboardClipSeek(
                  event.nativeEvent.key,
                  player.currentTime,
                  duration,
                  usable,
                );
                if (target !== null) {
                  event.preventDefault();
                  seek(target);
                }
              },
            }
          : {})}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Playback speed ${speed} times. Change speed.`}
          disabled={!usable}
          onPress={() => {
            const next = speed === 0.5 ? 1 : speed === 1 ? 2 : 0.5;
            player.playbackRate = next;
            setSpeed(next);
          }}
          style={({ pressed }) => [
            styles.speedControl,
            { backgroundColor: C.soft, opacity: !usable ? 0.35 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[s.h3, { color: C.ink }]}>{speed}×</Text>
        </Pressable>
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
            {clip.saved ? "Saved" : saving ? "Saving…" : "Save"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Replace video"
          accessibilityState={{ expanded: replacing }}
          disabled={picking}
          onPress={() => {
            player.pause();
            setReplacing(!replacing);
          }}
          style={({ pressed }) => [
            styles.quietAction,
            { opacity: picking ? 0.4 : pressed ? 0.6 : 1 },
          ]}
        >
          <ArrowLeftRight size={17} color={C.muted} />
          <Text style={s.small}>Replace</Text>
        </Pressable>
      </View>
      {replacing ? replacementActions : null}
      {saveError ? (
        <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
          {saveError}
        </Text>
      ) : null}
      {pose ? (
        <Disclosure label="Tracking options">
          <Text style={s.small}>
            Estimated 2D landmarks. Track again processes this clip and may send frames to
            Gemini. Save keeps the video only.
          </Text>
          <Button
            label="Track again"
            kind="secondary"
            disabled={!usable || poseBusy}
            onPress={() => void analyzeBody()}
          />
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
        </Disclosure>
      ) : null}
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
      {...(Platform.OS === "web" ? { "aria-pressed": selected } : {})}
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
  metrics: {
    marginTop: 14,
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "stretch",
    padding: 16,
    gap: 12,
    borderRadius: 16,
    backgroundColor: "#F6F8F5",
  },
  metricsStacked: { flexDirection: "column" },
  techniqueInline: { flexBasis: 128, flexShrink: 0 },
  techniqueStacked: { flexBasis: "auto", flexShrink: 1 },
  captureStage: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  captureActions: { gap: 12 },
  historyRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1 },
  historyOpen: {
    flex: 1,
    minHeight: 72,
    paddingVertical: 12,
    gap: 4,
    justifyContent: "center",
  },
  delete: { minWidth: 56, minHeight: 48, alignItems: "center", justifyContent: "center" },
  videoStage: { width: "100%", alignItems: "center" },
  video: {
    backgroundColor: "#000000",
    borderRadius: 16,
    overflow: "hidden",
  },
  previewFit: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
  },
  previewFitLabel: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  transportGroup: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconControl: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  playControl: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  speedControl: {
    minWidth: 56,
    minHeight: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  quietAction: {
    minHeight: 48,
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
