import { memo, useEffect, useMemo, useState } from "react";
import { AppState, Linking, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { createVideoPlayer, VideoView } from "expo-video";
import { drillDemos, type DrillDemoAsset } from "../data/drill-demos";
import { Button, Chip, Disclosure, Link, useTheme } from "./ui";

// Mounted in pre-practice guidance, always paused initially. Keep player events
// local: video playback never publishes updates to the practice clock/app state.
const DemoPlayer = memo(function DemoPlayer({ demo }: { demo: DrillDemoAsset }) {
  const { C, s } = useTheme();
  const focused = useIsFocused();
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const player = useMemo(() => {
    const p = createVideoPlayer(demo.source);
    p.loop = false;
    p.muted = true;
    return p;
  }, [demo.source]);
  useEffect(() => {
    player.pause();
    const play = player.addListener("playingChange", (e) => {
      setPlaying(e.isPlaying);
      if (e.isPlaying) setEnded(false);
    });
    const end = player.addListener("playToEnd", () => {
      setPlaying(false);
      setEnded(true);
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
      end.remove();
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
      if (ended || (player.duration > 0 && player.currentTime >= player.duration - 0.1))
        player.currentTime = 0;
      setEnded(false);
      player.play();
    } catch {
      setError("Could not start the demo. Close it and try again.");
    }
  };
  return (
    <View style={{ gap: 12 }}>
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
            label={playing ? "Pause demo" : ended ? "Replay demo" : "Play demo"}
            disabled={!ready || !focused || Boolean(error)}
            onPress={() => (playing ? player.pause() : start())}
          />
        </View>
        <Chip label="Slow · 0.5×" selected={slow} onPress={() => setSlow(!slow)} />
      </View>
      <Text style={s.small}>{demo.description}</Text>
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
  const { s } = useTheme();
  const demo = drillDemos[id];
  if (!demo) return null;
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.h3}>{demo.title}</Text>
      <Text style={s.small}>Filmed example · offline · starts paused</Text>
      {expanded ? (
        <DemoPlayer key={id} demo={demo} />
      ) : (
        <Disclosure label="Watch movement demo">
          <DemoPlayer key={id} demo={demo} />
        </Disclosure>
      )}
    </View>
  );
});

export function DrillDemoCredit({ id }: { id: string }) {
  const { C, s } = useTheme();
  const [error, setError] = useState("");
  const demo = drillDemos[id];
  if (!demo) return null;
  const openLink = (url: string) => {
    setError("");
    void Linking.openURL(url).catch(() => setError("Could not open the link."));
  };
  return (
    <Disclosure label="Video credit and license">
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
    </Disclosure>
  );
}
