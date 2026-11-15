import test from "node:test";
import assert from "node:assert/strict";
import {
  ownWelcomeVideo,
  type WelcomeVideoPlayer,
} from "../src/components/welcomeVideoPlayback";

function mockPlayer(throwsOnPlay = false) {
  let status: ((event: { status: string }) => void) | undefined;
  const calls = { play: 0, pause: 0, release: 0, remove: 0 };
  const player = {
    loop: false,
    muted: false,
    volume: 1,
    audioMixingMode: "doNotMix",
    showNowPlayingNotification: true,
    staysActiveInBackground: true,
    keepScreenOnWhilePlaying: true,
    addListener(name: string, listener: (event: { status: string }) => void) {
      assert.equal(name, "statusChange");
      status = listener;
      return {
        remove: () => {
          calls.remove += 1;
        },
      };
    },
    play() {
      calls.play += 1;
      if (throwsOnPlay) throw Error("Playback unavailable");
    },
    pause() {
      calls.pause += 1;
    },
    release() {
      calls.release += 1;
    },
  };
  return { player, calls, emitError: () => status?.({ status: "error" }) };
}

test("welcome player is silent, looping, mixes with other audio and never owns background/idle playback", () => {
  const { player, calls } = mockPlayer();
  const video = ownWelcomeVideo(player as unknown as WelcomeVideoPlayer, () =>
    assert.fail("Unexpected fallback"),
  );
  assert.equal(player.loop, true);
  assert.equal(player.muted, true);
  assert.equal(player.volume, 0);
  assert.equal(player.audioMixingMode, "mixWithOthers");
  assert.equal(player.showNowPlayingNotification, false);
  assert.equal(player.staysActiveInBackground, false);
  assert.equal(player.keepScreenOnWhilePlaying, false);
  assert.equal(calls.play, 0, "Creation must not play before VideoView attaches");
  video.play();
  assert.equal(calls.play, 1);
  video.dispose();
  video.dispose();
  video.play();
  assert.deepEqual(calls, { play: 1, pause: 1, release: 1, remove: 1 });
});

test("media failure falls back once and cannot restart after failure or disposal", () => {
  const { player, calls, emitError } = mockPlayer();
  let fallbacks = 0;
  const video = ownWelcomeVideo(player as unknown as WelcomeVideoPlayer, () => {
    fallbacks += 1;
  });
  video.play();
  emitError();
  emitError();
  video.play();
  assert.equal(fallbacks, 1);
  assert.equal(calls.play, 1);
  assert.equal(calls.pause, 1);
  video.dispose();
  emitError();
  assert.equal(fallbacks, 1, "Late events must not update an unmounted component");
  assert.equal(calls.release, 1);
  assert.equal(calls.remove, 1);
});

test("play exception keeps the static fallback and still releases the owned player", () => {
  const { player, calls } = mockPlayer(true);
  let fallbacks = 0;
  const video = ownWelcomeVideo(player as unknown as WelcomeVideoPlayer, () => {
    fallbacks += 1;
  });
  video.play();
  video.play();
  assert.equal(fallbacks, 1);
  assert.equal(calls.play, 1);
  video.dispose();
  assert.equal(calls.release, 1);
  assert.equal(calls.remove, 1);
});
