import { useEffect, useState } from "react";
import { AccessibilityInfo, AppState, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { createVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import { ownWelcomeVideo } from "./welcomeVideoPlayback";

// Welcome-only licensed shot sequence: Ruben Velasco / Mixkit 2918.
// Rights, hashes and portrait crop review: assets/welcome/provenance.json and LICENSE.md.
const source = require("../../assets/welcome/shot-on-goal.mp4");
const poster = require("../../assets/welcome/shot-on-goal-poster.jpg");
type Playback = ReturnType<typeof ownWelcomeVideo>;

function WelcomeLoop() {
  const [video, setVideo] = useState<{
    player: VideoPlayer;
    playback: Playback;
  } | null>(null);
  const [firstFrame, setFirstFrame] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    // Effect ownership also recreates safely under React's development Strict Mode.
    let player: VideoPlayer | undefined;
    try {
      player = createVideoPlayer(source);
      const playback = ownWelcomeVideo(player, () => setUnavailable(true));
      setVideo({ player, playback });
      // Pause synchronously even if React cannot commit the background unmount yet.
      const state = AppState.addEventListener("change", (value) => {
        if (value !== "active") player?.pause();
      });
      return () => {
        state.remove();
        playback.dispose();
      };
    } catch {
      player?.release();
      setUnavailable(true);
    }
  }, []);
  useEffect(() => {
    video?.playback.play();
  }, [video]);
  return (
    <>
      {video && !unavailable ? (
        <VideoView
          player={video.player}
          nativeControls={false}
          contentFit="cover"
          surfaceType="textureView"
          allowsPictureInPicture={false}
          startsPictureInPictureAutomatically={false}
          fullscreenOptions={{ enable: false }}
          playsInline
          useExoShutter={false}
          onFirstFrameRender={() => setFirstFrame(true)}
          style={[
            StyleSheet.absoluteFill,
            { width: "100%", height: "100%", opacity: firstFrame ? 1 : 0 },
          ]}
        />
      ) : null}
      {!firstFrame || unavailable ? <WelcomePoster /> : null}
    </>
  );
}
function WelcomePoster() {
  return (
    <Image
      source={poster}
      contentFit="cover"
      accessible={false}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function WelcomeBackground({ focused }: { focused: boolean }) {
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    let mounted = true;
    let preferenceChanged = false;
    // Keep a static poster until the preference is known; never briefly autoplay first.
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted && !preferenceChanged) setReducedMotion(enabled);
      })
      .catch(() => {
        if (mounted && !preferenceChanged) setReducedMotion(true);
      });
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        preferenceChanged = true;
        setReducedMotion(enabled);
      },
    );
    const state = AppState.addEventListener("change", (value) => {
      setForeground(value === "active");
    });
    return () => {
      mounted = false;
      motion.remove();
      state.remove();
    };
  }, []);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[StyleSheet.absoluteFill, { opacity: 0.63, overflow: "hidden" }]}
    >
      {focused && foreground && reducedMotion === false ? (
        <WelcomeLoop />
      ) : (
        <WelcomePoster />
      )}
    </View>
  );
}
