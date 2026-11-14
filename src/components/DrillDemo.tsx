import { memo, useEffect, useMemo, useState } from "react";
import { AppState, Linking, Pressable, Text, View } from "react-native";
import { Pause, Play } from "lucide-react-native";
import { haptic } from "../utils/haptics";
import { Image } from "expo-image";
import { useIsFocused } from "@react-navigation/native";
import { createVideoPlayer, VideoView } from "expo-video";
import { getDrillDemo, type DrillDemoAsset } from "../data/drill-demos";
import { OnlineDrillDemo } from "./OnlineDrillDemo";
import { Button, Chip, Disclosure, Link, useTheme } from "./ui";

// Mounted in pre-practice guidance, always paused initially. Keep player events
// local: video playback never publishes updates to the practice clock/app state.
const DemoPlayer = memo(function DemoPlayer({ demo }: { demo: DrillDemoAsset }) {
  const { C, s } = useTheme();
  const focused = useIsFocused();
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const player = useMemo(() => {
    const p = createVideoPlayer(demo.source);
    p.loop = true;
    p.muted = true;
    return p;
  }, [demo.source]);
  useEffect(() => {
    player.pause();
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
      if (state !== "active") player.pause();
    });
    return () => {
      play.remove();
      status.remove();
      background.remove();
      player.pause();
      player.release();
    };
  }, [player]);
  useEffect(() => {
    if (!focused) player.pause();
  }, [focused, player]);
  useEffect(() => {
    player.playbackRate = slow ? 0.5 : 1;
  }, [slow, player]);
  const start = () => {
    try {
      if (player.duration > 0 && player.currentTime >= player.duration - 0.1)
        player.currentTime = 0;
      player.play();
    } catch {
      setError("Could not start the demo. Close it and try again.");
    }
  };
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
            accessibilityState={{ disabled: !ready || !focused }}
            disabled={!ready || !focused}
            onPress={() => {
              haptic("light");
              start();
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
      ) : !ready ? (
        <Text style={s.small}>Loading bundled demo…</Text>
      ) : null}
      <View
        style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" }}
      >
        <View style={{ flex: 1, minWidth: 140 }}>
          <Button
            kind="secondary"
            label={playing ? "Pause demo" : "Play demo"}
            icon={playing ? Pause : Play}
            disabled={!ready || !focused || Boolean(error)}
            onPress={() => (playing ? player.pause() : start())}
          />
        </View>
        <Chip label="Slow · 0.5×" selected={slow} onPress={() => setSlow(!slow)} />
      </View>
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
    demo.kind === "local" ? (
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
        {demo.credit} · Pexels License. Trimmed/resized for offline playback. No coaching
        endorsement.
      </Text>
      <Link label="View source footage" onPress={() => openLink(demo.page)} />
      <Link
        label="Pexels License"
        onPress={() => openLink("https://www.pexels.com/license/")}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[s.small, { color: C.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
