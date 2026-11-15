import type { VideoPlayer } from "expo-video";

export type WelcomeVideoPlayer = Pick<
  VideoPlayer,
  | "loop"
  | "muted"
  | "volume"
  | "audioMixingMode"
  | "showNowPlayingNotification"
  | "staysActiveInBackground"
  | "keepScreenOnWhilePlaying"
  | "addListener"
  | "play"
  | "pause"
  | "release"
>;

/** Own just this decorative player; never change the app's audio or practice state. */
export function ownWelcomeVideo(player: WelcomeVideoPlayer, onUnavailable: () => void) {
  player.loop = true;
  player.muted = true;
  player.volume = 0;
  player.audioMixingMode = "mixWithOthers";
  player.showNowPlayingNotification = false;
  player.staysActiveInBackground = false;
  player.keepScreenOnWhilePlaying = false;
  let disposed = false;
  let failed = false;
  const unavailable = () => {
    if (disposed || failed) return;
    failed = true;
    player.pause();
    onUnavailable();
  };
  const status = player.addListener("statusChange", (event) => {
    if (event.status === "error") unavailable();
  });
  return {
    // Call only after VideoView has mounted: web players have no attached video before it.
    play() {
      if (disposed || failed) return;
      try {
        player.play();
      } catch {
        unavailable();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      status.remove();
      try {
        player.pause();
      } finally {
        player.release();
      }
    },
  };
}
