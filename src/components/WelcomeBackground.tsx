import { useEffect, useState } from "react";
import { AccessibilityInfo, AppState, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { createVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import { ownWelcomeVideo } from "./welcomeVideoPlayback";

// Rights and crop evidence are recorded beside each bundled asset.
const media = {
  welcome: {
    video: require("../../assets/welcome/shot-on-goal.mp4"),
    poster: require("../../assets/welcome/shot-on-goal-poster.jpg"),
  },
  position: {
    video: require("../../assets/position-confirmation/goal.mp4"),
    poster: require("../../assets/position-confirmation/goal-poster.jpg"),
  },
};
type Scene = keyof typeof media;
type Playback = ReturnType<typeof ownWelcomeVideo>;

function WelcomeLoop({ scene }: { scene: Scene }) {
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
      player = createVideoPlayer(media[scene].video);
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
  }, [scene]);
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
      {!firstFrame || unavailable ? <WelcomePoster scene={scene} /> : null}
    </>
  );
}
function WelcomePoster({ scene }: { scene: Scene }) {
  return (
    <Image
      source={media[scene].poster}
      contentFit="cover"
      accessible={false}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function WelcomeBackground({ focused }: { focused: boolean }) {
  return <OnboardingVideoBackground focused={focused} scene="welcome" opacity={0.63} />;
}

export function PositionConfirmationBackground({ focused }: { focused: boolean }) {
  return <OnboardingVideoBackground focused={focused} scene="position" opacity={0.9} />;
}

function OnboardingVideoBackground({
  focused,
  opacity,
  scene,
}: {
  focused: boolean;
  opacity: number;
  scene: Scene;
}) {
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
      style={[StyleSheet.absoluteFill, { opacity, overflow: "hidden" }]}
    >
      {focused && foreground && reducedMotion === false ? (
        <WelcomeLoop key={scene} scene={scene} />
      ) : (
        <WelcomePoster scene={scene} />
      )}
    </View>
  );
}
