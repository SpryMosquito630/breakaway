import { memo, useEffect, useMemo, useState } from "react";
import { AppState, Linking, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { createVideoPlayer, VideoView } from "expo-video";
import { Pause, Play, RotateCcw } from "lucide-react-native";
import { drillDemos, type DrillDemoAsset } from "../data/drill-demos";
import { Button, Chip, Disclosure, Link, useTheme } from "./ui";

// Mounted only while the user has explicitly opened the demo. Keep player events
// local: video playback never publishes updates to the practice clock/app state.
const DemoPlayer = memo(function DemoPlayer({ demo }: { demo: DrillDemoAsset }) {
  const { C, s } = useTheme();
  const focused = useIsFocused();
  const [playing, setPlaying] = useState(false);
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
    const play = player.addListener("playingChange", e => setPlaying(e.isPlaying));
    const status = player.addListener("statusChange", e => {
      setReady(e.status === "readyToPlay");
      setError(e.status === "error" ? "Demo unavailable. Follow the instructions and movement diagram below." : "");
    });
    setReady(player.status === "readyToPlay");
    const background = AppState.addEventListener("change", state => {
      if (state !== "active") player.pause();
    });
    return () => { play.remove(); status.remove(); background.remove(); player.pause(); player.release(); };
  }, [player]);
  useEffect(() => { if (!focused) player.pause(); }, [focused, player]);
  useEffect(() => { player.playbackRate = slow ? 0.5 : 1; }, [slow, player]);
  const start = (replay = false) => {
    try {
      if (replay || (player.duration > 0 && player.currentTime >= player.duration - 0.1)) player.currentTime = 0;
      player.play();
    } catch { setError("Could not start the demo. Close it and try again."); }
  };
  return <View style={{ gap: 12 }}>
    <VideoView player={player} nativeControls={false} contentFit="contain" style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "#101812", borderRadius: 12 }} accessibilityLabel={demo.description} />
    {error ? <Text accessibilityRole="alert" style={[s.small, { color: C.danger }]}>{error}</Text> : !ready ? <Text style={s.small}>Loading bundled demo…</Text> : null}
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      <View style={{ flex: 1, minWidth: 120 }}><Button label={playing ? "Pause demo" : "Play demo"} icon={playing ? Pause : Play} disabled={!ready || !focused || Boolean(error)} onPress={() => playing ? player.pause() : start()} /></View>
      <View style={{ flex: 1, minWidth: 100 }}><Button kind="secondary" label="Replay" icon={RotateCcw} disabled={!ready || !focused || Boolean(error)} onPress={() => start(true)} /></View>
    </View>
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      <Chip label="1× speed" selected={!slow} onPress={() => setSlow(false)} />
      <Chip label="0.5× speed" selected={slow} onPress={() => setSlow(true)} />
    </View>
    <Text style={s.body}>{demo.cue}</Text>
    <Text style={s.small}>{demo.description}</Text>
    <Disclosure label="Video credit and license">
      <Text style={s.small}>{demo.credit} · Pexels License. Trimmed/resized for offline playback. No coaching endorsement.</Text>
      <Link label="View source footage" onPress={() => { void Linking.openURL(demo.page).catch(() => setError("Could not open the source link.")); }} />
      <Link label="Pexels License" onPress={() => { void Linking.openURL("https://www.pexels.com/license/").catch(() => setError("Could not open the license link.")); }} />
    </Disclosure>
  </View>;
});

export const DrillDemo = memo(function DrillDemo({ id }: { id: string }) {
  const { s } = useTheme();
  const demo = drillDemos[id];
  if (!demo) return null;
  return <View style={{ gap: 4 }}>
    <Text style={s.h3}>{demo.title}</Text>
    <Disclosure label="Watch movement demo">
      <DemoPlayer key={id} demo={demo} />
    </Disclosure>
    <Text style={s.small}>Bundled video · plays offline · starts paused</Text>
  </View>;
});
