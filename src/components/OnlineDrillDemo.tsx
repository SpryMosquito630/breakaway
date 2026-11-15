import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { canEmbedYoutubeDemo, type YoutubeDrillDemo } from "../domain/drillVideo";
import { useApp } from "../state/AppState";
import { YoutubeDemoFrame } from "./YoutubeDemoFrame";
import { Button, Link, useTheme } from "./ui";

/** No provider request or frame exists before the player explicitly loads it. */
export function OnlineDrillDemo({ demo }: { demo: YoutubeDrillDemo }) {
  const { C, s } = useTheme();
  const { data } = useApp();
  const focused = useIsFocused();
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [width, setWidth] = useState(0);
  const eligible = canEmbedYoutubeDemo(demo, data.profile.ageBand);
  const close = useCallback(() => {
    setLoaded(false);
    setReady(false);
  }, []);
  const failed = useCallback(() => {
    close();
    setError("YouTube demo unavailable. Try again or open the original.");
  }, [close]);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") close();
    });
    return () => listener.remove();
  }, [close]);
  useEffect(() => {
    if (!focused || !eligible) close();
  }, [focused, eligible, close]);
  useEffect(() => {
    if (!loaded || ready) return;
    const timeout = setTimeout(failed, 20000);
    return () => clearTimeout(timeout);
  }, [loaded, ready, failed]);
  const openOriginal = () => {
    close();
    setError("");
    void Linking.openURL(`${demo.page}&t=${Math.floor(demo.startSeconds)}s`).catch(() =>
      setError("Could not open YouTube. Check your connection and try again."),
    );
  };
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.small}>Online demo · YouTube</Text>
      {loaded && eligible && focused ? (
        <>
          <View
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            style={{
              height: Math.max(200, (width * 9) / 16),
              minWidth: 200,
              backgroundColor: C.deep,
            }}
          >
            <YoutubeDemoFrame demo={demo} onError={failed} onReady={onReady} />
          </View>
          {!ready ? <Text style={s.small}>Loading YouTube…</Text> : null}
          <Link label="Close online demo" onPress={close} />
        </>
      ) : (
        <>
          <Text style={s.small}>
            {eligible
              ? "Loading connects to YouTube, which receives device and network information. Playback begins when you press Play in its player."
              : "Watch the public clip on YouTube. This opens another app or website with its own privacy terms."}
          </Text>
          <Button
            kind="secondary"
            label={
              eligible
                ? error
                  ? "Retry YouTube demo"
                  : "Load YouTube demo"
                : "Open original on YouTube"
            }
            onPress={
              eligible
                ? () => {
                    setError("");
                    setReady(false);
                    setLoaded(true);
                  }
                : openOriginal
            }
          />
        </>
      )}
      <Text style={s.small}>{demo.limit}</Text>
      {eligible ? <Link label="Open original on YouTube" onPress={openOriginal} /> : null}
      {error ? (
        <Text accessibilityRole="alert" style={[s.small, { color: C.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
