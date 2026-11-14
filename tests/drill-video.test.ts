import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  canEmbedYoutubeDemo,
  validYoutubeDemo,
  youtubeDemoDocument,
  type YoutubeDrillDemo,
} from "../src/domain/drillVideo";

const demo: YoutubeDrillDemo = {
  kind: "youtube",
  videoId: "abcdefghijk",
  startSeconds: 12,
  endSeconds: 18,
  title: "Reviewed public example",
  credit: "Original creator",
  page: "https://www.youtube.com/watch?v=abcdefghijk",
  cue: "Soft touch",
  description: "Grounded ball movement",
  limit: "Follow written spacing",
  review: {
    status: "core",
    embeddable: true,
    verifiedOn: "2026-11-14",
    evidence: "Reviewed source frames",
  },
  madeForKids: false,
};

test("embedded demos require a reviewed core interval, recognized older age, and verified non-child-directed status", () => {
  assert.ok(validYoutubeDemo(demo));
  assert.equal(canEmbedYoutubeDemo(demo, "adult"), true);
  assert.equal(canEmbedYoutubeDemo(demo, "13to17"), true);
  assert.equal(canEmbedYoutubeDemo(demo, "under13"), false);
  assert.equal(canEmbedYoutubeDemo(demo), false);
  assert.equal(canEmbedYoutubeDemo({ ...demo, madeForKids: "unknown" }, "adult"), false);
  assert.equal(canEmbedYoutubeDemo({ ...demo, madeForKids: true }, "adult"), false);
  assert.equal(validYoutubeDemo({ ...demo, endSeconds: 12 }), false);
  assert.equal(validYoutubeDemo({ ...demo, endSeconds: Infinity }), false);
  assert.equal(validYoutubeDemo({ ...demo, startSeconds: -1 }), false);
  assert.equal(
    validYoutubeDemo({ ...demo, page: "https://unrelated.example/video" }),
    false,
  );
  assert.equal(
    validYoutubeDemo({ ...demo, review: { ...demo.review, evidence: "" } }),
    false,
  );
  assert.throws(() =>
    youtubeDemoDocument({ ...demo, videoId: "</script>" }, "https://app.example"),
  );
  assert.throws(() => youtubeDemoDocument(demo, 'https://app.example/\"bad'));
});

test("official player starts paused, loops only a user-played interval, and stops on hidden document", () => {
  let options: any;
  const loads: unknown[] = [];
  const paused: boolean[] = [];
  const reports: unknown[] = [];
  const listeners: Record<string, () => void> = {};
  const document: any = {
    hidden: false,
    addEventListener: (type: string, callback: () => void) => {
      listeners[type] = callback;
    },
    createElement: () => ({}),
    body: { appendChild: () => {} },
  };
  const player = {
    loadVideoById: (value: unknown) => loads.push(value),
    pauseVideo: () => paused.push(true),
  };
  const context: any = {
    document,
    window: {
      parent: { postMessage: (message: string) => reports.push(JSON.parse(message)) },
      addEventListener: (type: string, callback: () => void) => {
        listeners[type] = callback;
      },
    },
    YT: {
      PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
      Player: function (_id: string, config: any) {
        options = config;
        return player;
      },
    },
  };
  const html = youtubeDemoDocument(demo, "https://app.example");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
  vm.createContext(context);
  vm.runInContext(script, context);
  context.onYouTubeIframeAPIReady();
  assert.equal(options.host, "https://www.youtube-nocookie.com");
  assert.equal(options.playerVars.autoplay, 0);
  assert.equal(options.playerVars.controls, 1);
  options.events.onReady();
  assert.deepEqual(reports, [{ type: "ready" }]);
  options.events.onStateChange({ data: 0 });
  assert.equal(loads.length, 0, "initial ended event cannot initiate playback");
  options.events.onStateChange({ data: 1 });
  options.events.onStateChange({ data: 0 });
  assert.equal(loads.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(loads[0])), {
    videoId: demo.videoId,
    startSeconds: 12,
    endSeconds: 18,
  });
  options.events.onStateChange({ data: 2 });
  options.events.onStateChange({ data: 0 });
  assert.equal(loads.length, 1, "manual pause disables loop restart");
  options.events.onStateChange({ data: 1 });
  document.hidden = true;
  listeners.visibilitychange();
  assert.equal(paused.length, 1);
  options.events.onStateChange({ data: 0 });
  assert.equal(loads.length, 1, "hidden document cannot restart");
});

test("online registry includes only reviewed examples and preserves four explicit gaps", async () => {
  const { youtubeDrillDemos } = await import("../src/data/drill-online-demos");
  const entries = Object.entries(youtubeDrillDemos);
  assert.equal(entries.length, 24);
  for (const [id, entry] of entries) {
    assert.ok(validYoutubeDemo(entry), id);
    assert.equal(entry.madeForKids, "unknown", id);
    assert.equal(canEmbedYoutubeDemo(entry, "adult"), false, id);
    assert.ok(entry.limit.trim().length > 15, id);
  }
  for (const gap of ["push", "weak-roll", "pass-brake", "pass-angle"]) {
    assert.equal(youtubeDrillDemos[gap], undefined, gap);
  }
  assert.equal(
    youtubeDrillDemos.sole,
    undefined,
    "existing local sole example stays authoritative",
  );
  assert.equal(
    youtubeDrillDemos.slalom,
    undefined,
    "existing local slalom example stays authoritative",
  );
  assert.equal(youtubeDrillDemos["custom-example"], undefined);
});
