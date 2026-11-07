import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { createVideoPlayer, VideoView } from "expo-video";
import { useIsFocused } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import {
  Camera,
  ChevronRight,
  Film,
  Pause,
  Play,
  RotateCcw,
  Upload,
} from "lucide-react-native";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";
import { Button, Disclosure, Page } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import {
  frameAt,
  normalizedMotion,
  ReplayAnalysis,
  trailAt,
  validAnalysis,
} from "../domain/replay";
import sample from "../data/replay-sample.json";
import review from "../data/replay-review.json";
import { replays } from "../replays/storage";
import { SavedReplay, ReplayInput } from "../replays/repository";
import { haptic } from "../utils/haptics";

const SAMPLE = sample as ReplayAnalysis;
// Optional developer-hosted sample; never package the replay binary into training builds.
const SAMPLE_VIDEO = process.env.EXPO_PUBLIC_REPLAY_SAMPLE_URL ?? "";
const VOLT = "#C6EF2E",
  DARK = "#10271D",
  INVERSE = "#FFFFFF";
function serviceBase() {
  if (process.env.EXPO_PUBLIC_ANALYSIS_URL)
    return process.env.EXPO_PUBLIC_ANALYSIS_URL.replace(/\/$/, "");
  if (Platform.OS === "web" && typeof location !== "undefined")
    return `${location.origin}/api/replay`;
  const host = Constants.expoConfig?.hostUri;
  if (!host) return null;
  const hostname = host.split(":")[0];
  const secure =
    hostname.endsWith(".exp.direct") ||
    hostname.endsWith(".on.expo.app") ||
    hostname.endsWith(".ngrok-free.app") ||
    hostname.endsWith(".ngrok.app");
  return `${secure ? "https" : "http"}://${host}/api/replay`;
}

export function ReplayEntry({ onPress }: { onPress: () => void }) {
  const { C, s } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic("light");
        onPress();
      }}
      style={[
        styles.entry,
        { borderColor: C.lineStrong, backgroundColor: C.white },
      ]}
    >
      <Film size={23} color={C.green} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.h3}>Video replay</Text>
        <Text style={s.small}>Record, review and open saved replays.</Text>
      </View>
      <ChevronRight color={C.green} size={20} />
    </Pressable>
  );
}

export function Replay() {
  const { C, s } = useTheme();
  const [history, setHistory] = useState<SavedReplay[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const candidate = useRef<{ id: string; input: ReplayInput } | null>(null);
  const openedUri = useRef<string | null>(null);
  const mounted = useRef(true);
  const saveAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    const refresh = () => {
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
    };
    refresh();
    const unsubscribe = replays.subscribe(refresh);
    return () => {
      mounted.current = false;
      unsubscribe();
      saveAbort.current?.abort();
      if (openedUri.current) replays.release(openedUri.current);
    };
  }, []);
  async function openSaved(item: SavedReplay) {
    setHistoryError("");
    try {
      const uri = await replays.open(item.id);
      if (!mounted.current) {
        replays.release(uri);
        return;
      }
      player.pause();
      clearHold();
      if (openedUri.current) replays.release(openedUri.current);
      openedUri.current = uri;
      setSource(uri);
      setAnalysis(item.analysis);
      setIsSample(false);
      setSavedId(item.id);
      candidate.current = null;
      setClip(null);
      held.current.clear();
    } catch (e) {
      setHistoryError(
        e instanceof Error ? e.message : "Could not open replay.",
      );
    }
  }
  async function saveReplay() {
    if (!candidate.current || saving) return;
    setSaving(true);
    setError("");
    const abort = new AbortController();
    saveAbort.current = abort;
    try {
      const saved = await replays.save(
        candidate.current.id,
        candidate.current.input,
        analysis,
        abort.signal,
      );
      if (mounted.current && candidate.current?.id === saved.id)
        setSavedId(saved.id);
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "Could not save replay. Free device space and try again.",
        );
    } finally {
      if (mounted.current) setSaving(false);
    }
  }
  function deleteReplay(item: SavedReplay) {
    const remove = () => {
      void replays
        .remove(item.id)
        .then(() => {
          if (mounted.current && savedId === item.id) sampleAgain();
        })
        .catch((e) => {
          if (mounted.current) setHistoryError(e.message);
        });
    };
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Delete this saved replay and its video? This cannot be undone.",
        )
      )
        remove();
    } else
      Alert.alert(
        "Delete replay?",
        "The saved video and tracking results will be permanently deleted from this device.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: remove },
        ],
      );
  }
  function clearSavedReplays() {
    const clear = () => {
      void replays
        .clear()
        .then(() => {
          if (mounted.current) {
            sampleAgain();
            setHistoryError("");
          }
        })
        .catch(() => {
          if (mounted.current)
            setHistoryError(
              "Saved replays could not be cleared. Free device space and try again.",
            );
        });
    };
    const message =
      "All saved replay videos and tracking results will be permanently deleted. Your training history and preferences will stay.";
    if (Platform.OS === "web") {
      if (window.confirm(`Clear saved replays? ${message}`)) clear();
    } else
      Alert.alert("Clear saved replays?", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Clear saved replays", style: "destructive", onPress: clear },
      ]);
  }
  const [clip, setClip] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [analysis, setAnalysis] = useState<ReplayAnalysis>(SAMPLE);
  const [source, setSource] = useState<number | string>(SAMPLE_VIDEO);
  const [isSample, setIsSample] = useState(true);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(true);
  const [tracking, setTracking] = useState(true);
  const [holds, setHolds] = useState(false);
  const [hold, setHold] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [service, setService] = useState<{
    base: string;
    token: string;
  } | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [videoError, setVideoError] = useState("");
  const focused = useIsFocused();
  const held = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const graphWidth = useRef(320);
  // A fresh player starts paused. expo-video's web replaceAsync starts playback
  // and can leave its playing flag stale when the browser blocks that autoplay.
  const player = useMemo(() => {
    const p = createVideoPlayer(source);
    p.loop = false;
    p.muted = true;
    p.timeUpdateEventInterval = 1 / 24;
    p.playbackRate = 0.5;
    return p;
  }, [source]);
  const clearHold = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHold(null);
  };
  useEffect(() => {
    const base = serviceBase();
    if (!base) return;
    const abort = new AbortController();
    fetch(`${base}/health`, { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.available && process.env.EXPO_PUBLIC_ANALYSIS_TOKEN)
          setService({ base, token: process.env.EXPO_PUBLIC_ANALYSIS_TOKEN });
      })
      .catch(() => {});
    return () => abort.abort();
  }, [connectionAttempt, focused]);
  useEffect(() => {
    player.pause();
    setPlaying(false);
    setTime(0);
    const timeSub = player.addListener("timeUpdate", (event) =>
      setTime(event.currentTime),
    );
    const playSub = player.addListener("playingChange", (event) =>
      setPlaying(event.isPlaying),
    );
    const statusSub = player.addListener("statusChange", (event) =>
      setVideoError(
        event.status === "error"
          ? "This video could not be played. Try another clip."
          : "",
      ),
    );
    const background = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        player.pause();
        clearHold();
      }
    });
    return () => {
      timeSub.remove();
      playSub.remove();
      statusSub.remove();
      background.remove();
      if (timer.current) clearTimeout(timer.current);
      controller.current?.abort();
      player.release();
    };
  }, [player]);
  useEffect(() => {
    if (!focused) {
      player.pause();
      clearHold();
    }
  }, [focused, player]);
  useEffect(() => {
    player.playbackRate = slow ? 0.5 : 1;
  }, [slow, player]);
  useEffect(() => {
    if (!isSample || !holds || !playing) return;
    const moment = review.moments.find(
      (m) =>
        m.freeze_s > 0 &&
        time >= m.time &&
        time < m.time + 0.2 &&
        !held.current.has(m.id),
    );
    if (!moment) return;
    held.current.add(moment.id);
    player.pause();
    player.currentTime = moment.time;
    setTime(moment.time);
    setHold(moment.id);
    timer.current = setTimeout(() => {
      setHold(null);
      timer.current = null;
      if (focused) player.play();
    }, moment.freeze_s * 1000);
  }, [time, holds, playing, isSample, player, focused]);
  const index = frameAt(analysis, time);
  const point = analysis.frames[index];
  const trail = trailAt(analysis, index);
  const motion = useMemo(() => normalizedMotion(analysis), [analysis]);
  const graphPath = useMemo(() => {
    let d = "",
      pen = false;
    motion.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${(analysis.frames[i].time / analysis.duration) * 320},${65 - v * 52} `;
      pen = true;
    });
    return d;
  }, [motion, analysis]);
  const phase = isSample
    ? (review.phases.find((p) => time >= p.start && time < p.end) ??
      review.phases[review.phases.length - 1])
    : null;
  const moment = isSample
    ? (review.moments.find((m) => m.id === hold) ??
      review.moments.find((m) => time >= m.time && time < m.end))
    : null;
  function seek(next: number) {
    clearHold();
    player.pause();
    const t = Math.max(0, Math.min(analysis.duration - 0.01, next));
    player.currentTime = t;
    setTime(t);
  }
  async function pick(camera: boolean) {
    setError("");
    player.pause();
    clearHold();
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError(
            "Camera access is needed to record. You can choose an existing video instead.",
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
      if (result.canceled || !mounted.current) return;
      const asset = result.assets[0];
      if ((asset.duration ?? 0) > 30050) {
        setError("Choose a clip up to 30 seconds.");
        return;
      }
      if ((asset.fileSize ?? 0) > 50 * 1024 * 1024) {
        setError("Choose a video under 50 MB.");
        return;
      }
      setClip(asset);
    } catch {
      setError("Could not open the video picker. Try choosing another video.");
    }
  }
  async function analyze() {
    if (!clip || !service || busy) return;
    setBusy(true);
    setError("");
    player.pause();
    clearHold();
    const abort = new AbortController();
    controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 180000);
    try {
      const form = new FormData();
      if (Platform.OS === "web" && clip.file)
        form.append("video", clip.file, clip.fileName ?? "practice.mp4");
      else
        form.append("video", {
          uri: clip.uri,
          name: clip.fileName ?? "practice.mp4",
          type: clip.mimeType ?? "video/mp4",
        } as unknown as Blob);
      const response = await fetch(`${service.base}/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${service.token}` },
        body: form,
        signal: abort.signal,
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error?.message ||
            (typeof body.error === "string"
              ? body.error
              : "Analysis could not finish. Try a shorter clip."),
        );
      if (!validAnalysis(body))
        throw new Error("The analysis response could not be read.");
      if (abort.signal.aborted || !mounted.current) return;
      candidate.current = {
        id: `replay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        input: { uri: clip.uri, file: clip.file, mimeType: clip.mimeType },
      };
      setSavedId(null);
      setAnalysis(body);
      setSource(clip.uri);
      setIsSample(false);
      setClip(null);
      setTime(0);
      setPlaying(false);
      held.current.clear();
      setHold(null);
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : "Analysis stopped. Try again with a shorter clip.",
        );
    } finally {
      clearTimeout(timeout);
      controller.current = null;
      if (mounted.current) setBusy(false);
    }
  }
  function sampleAgain() {
    player.pause();
    clearHold();
    candidate.current = null;
    setSavedId(null);
    setSource(SAMPLE_VIDEO);
    setAnalysis(SAMPLE);
    setIsSample(true);
    setTime(0);
    setClip(null);
    held.current.clear();
  }
  return (
    <Page contentStyle={{ gap: 20, paddingTop: 4 }}>
      <View style={{ gap: 6 }}>
        <View style={s.row}>
          <Text style={s.h2}>
            {isSample ? "Footwork, frame by frame." : "Your practice replay"}
          </Text>
        </View>
        <Text style={s.small}>
          {isSample
            ? (SAMPLE_VIDEO ? "Sample · authored moments · automatic ball tracking" : "No developer sample URL configured. Choose your own clip below.")
            : "Your clip · automatic ball tracking"}
        </Text>
      </View>
      <Disclosure label={`My replays (${history.length})`}>
        <Text style={s.small}>
          Saved on this device · {history.length}/10 clips · up to 200 MB. No
          cloud backup.
        </Text>
        {history.length === 0 ? (
          <Text style={s.body}>
            Analyze a recording, then tap Save replay to keep the video and ball
            tracking for offline review.
          </Text>
        ) : null}
        {history.map((item) => (
          <View
            key={item.id}
            style={[styles.historyRow, { borderBottomColor: C.line }]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}, ${new Date(item.createdAt).toLocaleString()}`}
              disabled={busy || saving}
              onPress={() => void openSaved(item)}
              style={{
                flex: 1,
                minHeight: 60,
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Text style={s.h3}>{item.title}</Text>
              <Text style={s.small}>
                {new Date(item.createdAt).toLocaleString()} ·{" "}
                {item.analysis.duration.toFixed(1)}s
              </Text>
              <Text style={s.small}>
                {item.analysis.frames.filter((f) => f.x !== null).length}/
                {item.analysis.frames.length} frames tracked ·{" "}
                {(item.bytes / 1048576).toFixed(1)} MB
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete replay saved ${new Date(item.createdAt).toLocaleString()}`}
              disabled={busy || saving}
              onPress={() => deleteReplay(item)}
              style={{
                minHeight: 48,
                minWidth: 56,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={[s.small, { color: C.danger }]}>Delete</Text>
            </Pressable>
          </View>
        ))}
        {historyError ? (
          <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
            {historyError}
          </Text>
        ) : null}
        {historyError || history.length > 0 ? (
          <Button
            kind="secondary"
            label="Clear saved replays"
            disabled={busy || saving}
            onPress={clearSavedReplays}
          />
        ) : null}
      </Disclosure>
      {!isSample ? (
        <View style={{ gap: 8 }}>
          <Button
            label={
              savedId
                ? "Saved on this device"
                : saving
                  ? "Saving replay…"
                  : "Save replay"
            }
            disabled={!!savedId || saving || busy || !candidate.current}
            onPress={() => void saveReplay()}
          />
          <Text style={s.small}>
            {savedId
              ? "Video and tracking results are available offline in My replays."
              : "Keeps a local copy of this video and its ball tracking. Unsaved clips are temporary."}
          </Text>
        </View>
      ) : null}
      <View style={styles.replay}>
        <View
          style={[
            styles.stage,
            { aspectRatio: analysis.width / analysis.height },
          ]}
        >
          <VideoView
            player={player}
            nativeControls={false}
            contentFit="contain"
            surfaceType="textureView"
            style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
          />
          {tracking ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${analysis.width} ${analysis.height}`}
              >
                {trail.length > 1 ? (
                  <Polyline
                    points={trail
                      .map(
                        (f) =>
                          `${f.x! * analysis.width},${f.y! * analysis.height}`,
                      )
                      .join(" ")}
                    fill="none"
                    stroke={VOLT}
                    strokeWidth={analysis.width * 0.005}
                    strokeOpacity={0.7}
                  />
                ) : null}
                {point?.x !== null && point?.y !== null ? (
                  <>
                    <Circle
                      cx={point.x! * analysis.width}
                      cy={point.y! * analysis.height}
                      r={analysis.width * 0.038}
                      fill="none"
                      stroke="#10271D"
                      strokeWidth={analysis.width * 0.009}
                    />
                    <Circle
                      cx={point.x! * analysis.width}
                      cy={point.y! * analysis.height}
                      r={analysis.width * 0.038}
                      fill="none"
                      stroke={VOLT}
                      strokeWidth={analysis.width * 0.0045}
                    />
                  </>
                ) : null}
              </Svg>
            </View>
          ) : null}
          <View pointerEvents="none" style={styles.videoPhase}>
            <Text style={styles.videoPhaseLabel}>
              {isSample ? "PHASE" : "BALL TRACK"}
            </Text>
            <Text style={styles.videoPhaseName}>
              {phase?.label ?? (point?.x === null ? "Tracking lost" : "Replay")}
            </Text>
          </View>
          {moment && point.x !== null && point.y !== null ? (
            <View
              pointerEvents="none"
              style={[
                styles.anchor,
                {
                  left: `${Math.max(4, Math.min(58, point.x * 100 + 7))}%`,
                  top: `${Math.max(30, Math.min(72, point.y * 100 - 18))}%`,
                },
              ]}
            >
              <Text style={styles.badgeText}>{moment.short}</Text>
            </View>
          ) : null}
          {hold && moment ? (
            <View pointerEvents="none" style={styles.holdBadge}>
              <Text style={styles.badgeText}>HOLD · {moment.title}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.deck}>
          <View style={styles.deckRow}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.phase}>{phase?.label ?? "Ball replay"}</Text>
              <Text style={styles.inverseSmall}>
                {phase?.detail ??
                  (point?.x === null
                    ? "Ball not detected in this frame"
                    : "Measured ball position")}
              </Text>
            </View>
            <Text style={styles.clock}>
              {time.toFixed(2)} / {analysis.duration.toFixed(1)}s
            </Text>
          </View>
          <View style={styles.deckRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={playing ? "Pause replay" : "Play replay"}
              onPress={() => {
                haptic("light");
                clearHold();
                if (playing) {
                  player.pause();
                  setPlaying(false);
                } else {
                  if (time >= analysis.duration - 0.1) {
                    player.currentTime = 0;
                    setTime(0);
                    held.current.clear();
                  }
                  try {
                    player.play();
                    setPlaying(true);
                  } catch {
                    setPlaying(false);
                    setVideoError("Could not start playback. Try again.");
                  }
                }
              }}
              style={styles.play}
            >
              {playing ? (
                <Pause size={22} color={DARK} />
              ) : (
                <Play size={22} color={DARK} />
              )}
              <Text style={styles.playText}>{playing ? "Pause" : "Play"}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Replay from beginning"
              onPress={() => {
                seek(0);
                held.current.clear();
              }}
              style={styles.iconButton}
            >
              <RotateCcw color={INVERSE} size={21} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                slow ? "Switch to normal speed" : "Switch to half speed"
              }
              onPress={() => {
                haptic("selection");
                setSlow(!slow);
              }}
              style={styles.speed}
            >
              <Text style={styles.inverseLabel}>{slow ? "0.5×" : "1×"}</Text>
            </Pressable>
          </View>
          {videoError ? (
            <Text accessibilityRole="alert" style={styles.inverseSmall}>
              {videoError}
            </Text>
          ) : null}
          <View style={styles.deckRow}>
            <Text style={styles.inverseLabel}>Ball motion</Text>
            <Text style={styles.inverseSmall}>Image space · relative</Text>
          </View>
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel="Replay timeline. Tap graph to seek"
            accessibilityValue={{
              min: 0,
              max: analysis.duration,
              now: time,
              text: `${time.toFixed(1)} seconds`,
            }}
            accessibilityActions={[
              { name: "increment", label: "Forward half a second" },
              { name: "decrement", label: "Back half a second" },
            ]}
            onAccessibilityAction={(e) =>
              seek(
                time + (e.nativeEvent.actionName === "increment" ? 0.5 : -0.5),
              )
            }
            onPress={(e) =>
              seek(
                (e.nativeEvent.locationX / Math.max(1, graphWidth.current)) *
                  analysis.duration,
              )
            }
            onLayout={(e) => {
              graphWidth.current = e.nativeEvent.layout.width;
            }}
            style={{ height: 80 }}
          >
            <Svg
              width="100%"
              height={80}
              viewBox="0 0 320 80"
              preserveAspectRatio="none"
            >
              <Line x1={0} y1={65} x2={320} y2={65} stroke="#50715C" />
              <Path d={graphPath} stroke={VOLT} strokeWidth={2} fill="none" />
              <Line
                x1={(time / analysis.duration) * 320}
                x2={(time / analysis.duration) * 320}
                y1={0}
                y2={75}
                stroke={INVERSE}
                strokeWidth={1.5}
              />
            </Svg>
          </Pressable>
          {isSample ? (
            <View style={styles.phases}>
              {review.phases.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Seek to ${p.label}`}
                  accessibilityState={{ selected: phase?.id === p.id }}
                  onPress={() => seek(p.start)}
                  style={[
                    styles.phaseButton,
                    { backgroundColor: phase?.id === p.id ? VOLT : "#29483A" },
                  ]}
                >
                  <Text
                    style={[
                      styles.phaseLabel,
                      { color: phase?.id === p.id ? DARK : INVERSE },
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.h3}>Ball trail</Text>
          <Text style={s.small}>Gaps stay visible when tracking is lost.</Text>
        </View>
        <Switch
          accessibilityLabel="Show ball trail"
          value={tracking}
          onValueChange={setTracking}
          trackColor={{ true: C.green }}
        />
      </View>
      {isSample ? (
        <>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.h3}>Hold the detail</Text>
              <Text style={s.small}>Two one-second pauses during replay.</Text>
            </View>
            <Switch
              accessibilityLabel="Automatically hold two sample moments"
              value={holds}
              onValueChange={(value) => {
                clearHold();
                held.current.clear();
                setHolds(value);
              }}
              trackColor={{ true: C.green }}
            />
          </View>
          <View style={{ gap: 12 }}>
            <Text style={s.h2}>{moment?.title ?? "Look closer"}</Text>
            <Text style={s.body}>
              {moment?.body ??
                "Jump to a moment, then compare both sides at half speed."}
            </Text>
            {review.moments.map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                onPress={() => seek(m.time)}
                style={[styles.moment, { borderBottomColor: C.line }]}
              >
                <Text style={[s.small, { width: 44 }]}>
                  {m.time.toFixed(2)}s
                </Text>
                <Text style={[s.h3, { flex: 1 }]}>{m.title}</Text>
                <ChevronRight color={C.green} size={19} />
              </Pressable>
            ))}
            <Text style={s.small}>
              Sample moments are authored observations.
            </Text>
          </View>
        </>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={s.h2}>
            {analysis.frames.filter((f) => f.x !== null).length >= 3
              ? "Study your next touch"
              : "Not enough ball tracking"}
          </Text>
          <Text style={s.body}>
            {analysis.frames.filter((f) => f.x !== null).length >= 3
              ? "Scrub the motion graph and watch the ball at half speed. This replay measures ball position, without assigning a skill score."
              : "Too few frames contain a ball detection. Try a brighter, steady recording with the ball larger in frame. The original video is still available above."}
          </Text>
        </View>
      )}
      <View
        style={{
          gap: 12,
          borderTopWidth: 1,
          borderTopColor: C.line,
          paddingTop: 20,
        }}
      >
        <Text style={s.h2}>Review your own clip</Text>
        <Text style={s.body}>
          Keep the ball and your full body in frame. Include the move and two
          steps after it.
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Record"
              icon={Camera}
              kind="secondary"
              disabled={busy || saving}
              onPress={() => void pick(true)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Choose video"
              icon={Upload}
              kind="secondary"
              disabled={busy || saving}
              onPress={() => void pick(false)}
            />
          </View>
        </View>
        {clip ? (
          <View style={[styles.selection, { backgroundColor: C.soft }]}>
            <Text style={s.h3}>
              {clip.fileName ?? "Selected practice clip"}
            </Text>
            <Text style={s.small}>Up to 30 seconds · tap Analyze to send.</Text>
            <Text style={s.small}>
              Video processed on this computer; deleted after analysis. Replay
              uses your original clip.
            </Text>
            {busy ? (
              <>
                <ActivityIndicator
                  color={C.green}
                  accessibilityLabel="Tracking the ball"
                />
                <Text style={s.body}>Tracking the ball…</Text>
                <Button
                  label="Cancel analysis"
                  kind="secondary"
                  onPress={() => controller.current?.abort()}
                />
              </>
            ) : (
              <Button
                label="Analyze clip"
                disabled={!service || saving}
                onPress={() => void analyze()}
              />
            )}
          </View>
        ) : null}
        {!service ? (
          <View style={{ gap: 8 }}>
            <Text style={s.small}>
              Personal analysis needs this computer online. The sample replay
              works offline.
            </Text>
            <Button
              label="Reconnect analysis"
              kind="secondary"
              onPress={() => setConnectionAttempt((n) => n + 1)}
            />
          </View>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
            {error}
          </Text>
        ) : null}
        {!isSample ? (
          <Button
            kind="secondary"
            label="Open sample replay"
            disabled={busy || saving}
            onPress={sampleAgain}
          />
        ) : null}
      </View>
      <Disclosure label="How this replay works">
        <Text style={s.body}>
          The ring follows actual YOLOX Nano sports-ball detections. The graph
          shows adjacent ball-center movement relative to this clip’s largest
          movement. Camera motion is included; this is not physical speed.
        </Text>
        <Text style={s.body}>
          Missing detections break the trail. Detector scores are not
          correctness probabilities. This feature does not classify a cut,
          assess technique, or change your skill profile.
        </Text>
        {isSample ? (
          <>
            <Text style={s.small}>
              Sample: {sample.acceptedFrames}/{sample.totalFrames} frames
              accepted. Coverage is not accuracy. Phases and notes were marked
              through AI-assisted visual review.
            </Text>
            <Text style={s.small}>
              Footage: RDNE Stock project · Pexels 7187047.
            </Text>
            <Button
              label="Footage & license"
              kind="secondary"
              onPress={() => void Linking.openURL(review.credit.url)}
            />
          </>
        ) : null}
      </Disclosure>
    </Page>
  );
}
const styles = StyleSheet.create({
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 76,
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
    borderCurve: "continuous",
  },
  replay: {
    backgroundColor: DARK,
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  stage: { width: "100%", backgroundColor: "#08100D", overflow: "hidden" },
  deck: { padding: 16, gap: 14 },
  deckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
  },
  phase: {
    color: INVERSE,
    fontFamily: "Archivo_600SemiBold",
    fontSize: 21,
    lineHeight: 27,
  },
  inverseSmall: {
    color: "#D4E2D8",
    fontFamily: "Archivo_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  inverseLabel: {
    color: INVERSE,
    fontFamily: "Archivo_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  clock: {
    color: "#D4E2D8",
    fontFamily: "IBMPlexMono_400Regular",
    fontSize: 11,
  },
  play: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    flex: 1,
    backgroundColor: VOLT,
    borderRadius: 10,
    borderCurve: "continuous",
  },
  playText: { color: DARK, fontFamily: "Archivo_600SemiBold", fontSize: 15 },
  iconButton: {
    width: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  speed: {
    width: 58,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#6B8977",
    borderRadius: 10,
    borderCurve: "continuous",
  },
  phases: { flexDirection: "row", gap: 6 },
  phaseButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderCurve: "continuous",
  },
  phaseLabel: { fontFamily: "Archivo_500Medium", fontSize: 12 },
  videoPhase: {
    position: "absolute",
    top: 10,
    left: 12,
    backgroundColor: DARK,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  videoPhaseLabel: {
    fontFamily: "Archivo_500Medium",
    color: VOLT,
    fontSize: 10,
    lineHeight: 14,
  },
  videoPhaseName: {
    fontFamily: "Archivo_600SemiBold",
    color: INVERSE,
    fontSize: 17,
    lineHeight: 23,
  },
  anchor: {
    position: "absolute",
    backgroundColor: VOLT,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 6,
    maxWidth: "39%",
  },
  holdBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    maxWidth: "70%",
    backgroundColor: VOLT,
    borderRadius: 6,
    padding: 8,
  },
  badgeText: { color: DARK, fontFamily: "Archivo_600SemiBold", fontSize: 11 },
  moment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 56,
    borderBottomWidth: 1,
  },
  selection: {
    padding: 16,
    gap: 12,
    borderRadius: 12,
    borderCurve: "continuous",
  },
});
