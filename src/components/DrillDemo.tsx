import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Pressable, Text, View } from "react-native";
import { Pause, Play } from "lucide-react-native";
import { haptic } from "../utils/haptics";
import { Image } from "expo-image";
import { useIsFocused } from "@react-navigation/native";
import { createVideoPlayer, VideoView } from "expo-video";
import { getDrillDemo } from "../data/drill-demos";
import type { DirectDrillDemo } from "../domain/directDrillVideo";
import { createDirectDemoPlayback } from "../domain/directDemoPlayback";
import { OnlineDrillDemo } from "./OnlineDrillDemo";
import { Button, Chip, Disclosure, Link, useTheme } from "./ui";

// Mounted in pre-practice guidance, always paused initially. Keep player events
// local: video playback never publishes updates to the practice clock/app state.
const DemoPlayer = memo(function DemoPlayer({ demo }: { demo: DirectDrillDemo }) {
  const { C, s } = useTheme();
  const focused = useIsFocused();
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);
  const foreground = useRef(
    AppState.currentState !== "background" && AppState.currentState !== "inactive",
  );
  const focus = useRef(focused);
  focus.current = focused;
  const player = useMemo(() => {
    const p = createVideoPlayer(demo.kind === "remote" ? null : demo.source);
    p.loop = true;
    p.muted = true;
    return p;
  }, [demo.source, demo.kind]);
  const playback = useMemo(
    () => createDirectDemoPlayback(player, demo.source, demo.kind === "remote"),
    [player, demo.source, demo.kind],
  );
  useEffect(() => {
    mounted.current = true;
    playback.setActive(focus.current && foreground.current);
    const play = player.addListener("playingChange", (e) => {
      setPlaying(e.isPlaying);
      if (e.isPlaying) {
        setStarted(true);
      }
    });
    const status = player.addListener("statusChange", (e) => {
      setReady(e.status === "readyToPlay");
      setError(
        e.status === "error"
          ? "Demo unavailable. Follow the instructions and movement diagram below."
          : "",
      );
    });
    setReady(player.status === "readyToPlay");
    const background = AppState.addEventListener("change", (state) => {
      foreground.current = state === "active";
      playback.setActive(focus.current && foreground.current);
    });
    return () => {
      mounted.current = false;
      playback.dispose();
      play.remove();
      status.remove();
      background.remove();
      player.release();
    };
  }, [player, playback]);
  useEffect(() => {
    playback.setActive(focused && foreground.current);
  }, [focused, playback]);
  useEffect(() => {
    player.playbackRate = slow ? 0.5 : 1;
  }, [slow, player]);
  const start = async () => {
    setError("");
    setLoading(true);
    try {
      if (player.duration > 0 && player.currentTime >= player.duration - 0.1)
        player.currentTime = 0;
      await playback.start(Boolean(error));
    } catch {
      if (mounted.current)
        setError("Could not load the demo. Retry or follow the written steps.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  };
  const disabled = !focused || loading || (demo.kind === "local" && !ready && !error);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ width: "100%", aspectRatio: 16 / 9 }}>
        <VideoView
          player={player}
          nativeControls={false}
          contentFit="contain"
          style={{
            width: "100%",
            aspectRatio: 16 / 9,
            backgroundColor: "#101812",
            borderRadius: 12,
          }}
          accessibilityLabel={demo.description}
        />
        {!started || error ? (
          <Image
            source={demo.poster}
            contentFit="contain"
            pointerEvents="none"
            accessible={false}
            style={{ position: "absolute", inset: 0, borderRadius: 12 }}
          />
        ) : null}
        {!started && !error ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Play ${demo.title}`}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => {
              haptic("light");
              void start();
            }}
            style={({ pressed }) => ({
              position: "absolute",
              inset: 0,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              backgroundColor: pressed ? "#00000033" : "transparent",
            })}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#0B211BDD",
                borderWidth: 1,
                borderColor: "#FFFFFF99",
              }}
            >
              <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={[s.small, { color: C.danger }]}>
          {error}
        </Text>
      ) : loading || (demo.kind === "local" && !ready) ? (
        <Text style={s.small}>Loading demo…</Text>
      ) : null}
      <View
        style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" }}
      >
        <View style={{ flex: 1, minWidth: 140 }}>
          <Button
            kind="secondary"
            label={
              playing
                ? "Pause demo"
                : error
                  ? "Retry demo"
                  : loading
                    ? "Loading demo…"
                    : "Play demo"
            }
            icon={playing ? Pause : Play}
            disabled={disabled}
            onPress={() => (playing ? playback.pause() : void start())}
          />
        </View>
        <Chip label="Slow · 0.5×" selected={slow} onPress={() => setSlow(!slow)} />
      </View>
      {demo.kind === "remote" ? (
        <Text style={s.small}>
          Loads from {new URL(demo.source.uri).hostname} when you play · Internet
          required.
        </Text>
      ) : null}
      <Text style={s.small}>{demo.limit}</Text>
    </View>
  );
});

export const DrillDemo = memo(function DrillDemo({
  id,
  expanded = false,
}: {
  id: string;
  expanded?: boolean;
}) {
  const demo = getDrillDemo(id);
  if (!demo) return null;
  const content =
    demo.kind !== "youtube" ? (
      <DemoPlayer key={id} demo={demo} />
    ) : (
      <OnlineDrillDemo key={id} demo={demo} />
    );
  return (
    <View style={{ gap: 4 }}>
      {expanded ? (
        content
      ) : (
        <Disclosure label="Watch movement demo">{content}</Disclosure>
      )}
    </View>
  );
});

export function DrillDemoCredit({ id }: { id: string }) {
  const { C, s } = useTheme();
  const [error, setError] = useState("");
  const demo = getDrillDemo(id);
  if (!demo) return null;
  const openLink = (url: string) => {
    setError("");
    void Linking.openURL(url).catch(() => setError("Could not open the link."));
  };
  if (demo.kind === "youtube")
    return (
      <View style={{ gap: 8 }}>
        <Text style={s.small}>
          {demo.credit} · YouTube original. Official player/link only; no offline
          redistribution.
        </Text>
        <Link label="View original video" onPress={() => openLink(demo.page)} />
        <Link
          label="YouTube terms"
          onPress={() => openLink("https://www.youtube.com/t/terms")}
        />
        <Link
          label="Google privacy policy"
          onPress={() => openLink("https://policies.google.com/privacy")}
        />
        {error ? (
          <Text accessibilityRole="alert" style={[s.small, { color: C.danger }]}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.small}>
        {demo.credit} · {demo.license.name}. {demo.license.changes} No coaching
        endorsement.
      </Text>
      <Link label="View source footage" onPress={() => openLink(demo.page)} />
      <Link label={demo.license.name} onPress={() => openLink(demo.license.url)} />
      {error ? (
        <Text accessibilityRole="alert" style={[s.small, { color: C.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
