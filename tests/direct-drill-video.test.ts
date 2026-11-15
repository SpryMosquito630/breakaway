import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validDirectDrillDemo,
  type RemoteDrillDemo,
} from "../src/domain/directDrillVideo";
import { createDirectDemoPlayback } from "../src/domain/directDemoPlayback";

const demo: RemoteDrillDemo = {
  kind: "remote",
  source: { uri: "https://media.example/cleared.mp4", contentType: "progressive" },
  poster: 7,
  title: "Sole control",
  credit: "Verified creator",
  page: "https://creator.example/source",
  cue: "Control the ball",
  description: "The reviewed contact",
  limit: "Use the written spacing",
  license: {
    name: "CC BY 3.0",
    url: "https://creativecommons.org/licenses/by/3.0/",
    changes: "Trimmed and muted",
  },
  rightsReviewedOn: "2026-11-14",
};
test("direct clips require recorded rights, change attribution and a valid media source", () => {
  assert.ok(validDirectDrillDemo(demo));
  assert.ok(validDirectDrillDemo({ ...demo, kind: "local", source: 8 }));
  assert.ok(
    validDirectDrillDemo({
      ...demo,
      kind: "local",
      source: "/assets/drill.mp4?platform=web",
      poster: { uri: "/assets/poster.jpg", width: 960, height: 540 },
    }),
  );
  assert.ok(
    validDirectDrillDemo({
      ...demo,
      kind: "local",
      source: { uri: "https://localhost/assets/drill.mp4" },
      poster: "/assets/poster.jpg",
    }),
  );
  assert.equal(validDirectDrillDemo({ ...demo, kind: "local", source: NaN }), false);
  assert.equal(validDirectDrillDemo({ ...demo, kind: "local", source: "" }), false);
  assert.equal(validDirectDrillDemo({ ...demo, poster: "javascript:alert(1)" }), false);
  assert.equal(validDirectDrillDemo({ ...demo, poster: {} as any }), false);
  assert.equal(
    validDirectDrillDemo({
      ...demo,
      source: { ...demo.source, uri: "http://media.example/clip.mp4" },
    }),
    false,
  );
  assert.equal(
    validDirectDrillDemo({
      ...demo,
      source: { ...demo.source, uri: "https://www.youtube.com/watch?v=abcdefghijk" },
    }),
    false,
  );
  assert.equal(
    validDirectDrillDemo({ ...demo, license: { ...demo.license, changes: "" } }),
    false,
  );
  assert.equal(validDirectDrillDemo({ ...demo, rightsReviewedOn: "" }), false);
});

test("remote media is untouched until Play and cannot resume after blur or unmount during loading", async () => {
  let finish!: () => void;
  let loads = 0;
  let plays = 0;
  let pauses = 0;
  const player = {
    replaceAsync: async (_source: string) => {
      loads++;
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    },
    play: () => {
      plays++;
    },
    pause: () => {
      pauses++;
    },
  };
  const playback = createDirectDemoPlayback(player, "public-direct-mp4", true);
  playback.setActive(true);
  assert.equal(loads, 0);
  const start = playback.start();
  assert.equal(loads, 1);
  assert.equal(plays, 0);
  playback.setActive(false);
  finish();
  assert.equal(await start, false);
  assert.equal(plays, 0);
  playback.setActive(true);
  assert.equal(plays, 0, "foreground return never starts playback");
  assert.equal(await playback.start(), true);
  assert.equal(plays, 1);
  assert.equal(loads, 1, "resume reuses the loaded source");
  const retry = playback.start(true);
  assert.equal(loads, 2);
  playback.dispose();
  finish();
  assert.equal(await retry, false);
  assert.equal(plays, 1);
  assert.ok(pauses >= 2);
});

test("a failed load can retry, and bundled media starts only on explicit Play", async () => {
  let attempts = 0;
  let plays = 0;
  const player = {
    play: () => plays++,
    pause: () => {},
    replaceAsync: async (_source: number) => {
      if (++attempts === 1) throw Error("network unavailable");
    },
  };
  const remote = createDirectDemoPlayback(player, 1, true);
  remote.setActive(true);
  await assert.rejects(remote.start());
  assert.equal(await remote.start(), true);
  assert.equal(plays, 1);
  const local = createDirectDemoPlayback(player, 2, false);
  local.setActive(true);
  assert.equal(plays, 1);
  assert.equal(await local.start(), true);
  assert.equal(plays, 2);
  assert.equal(attempts, 2, "bundled source does not load again before playback");
});

test("additional bundled clips match their reviewed provenance and registered asset paths", async () => {
  const { readFileSync } = await import("node:fs");
  const { createHash } = await import("node:crypto");
  const root = new URL("../", import.meta.url);
  const manifest = JSON.parse(
    readFileSync(new URL("assets/drill-clips/provenance.json", root), "utf8"),
  );
  const registry = readFileSync(new URL("src/data/drill-direct-demos.ts", root), "utf8");
  for (const clip of manifest.clips) {
    const asset = readFileSync(new URL(`assets/drill-clips/${clip.file}`, root));
    const poster = readFileSync(new URL(`assets/drill-clips/${clip.poster.file}`, root));
    assert.equal(
      createHash("sha256").update(asset).digest("hex"),
      clip.sha256,
      clip.drillId,
    );
    assert.equal(asset.byteLength, clip.bytes, clip.drillId);
    assert.equal(
      createHash("sha256").update(poster).digest("hex"),
      clip.poster.sha256,
      clip.drillId,
    );
    assert.ok(clip.durationSeconds > 0 && clip.durationSeconds <= 120, clip.drillId);
    assert.ok(
      clip.license.name && clip.license.url && clip.license.changes,
      clip.drillId,
    );
    assert.ok(clip.review && clip.rightsReviewedOn, clip.drillId);
    assert.ok(registry.includes(`../../assets/drill-clips/${clip.file}`), clip.drillId);
    assert.ok(
      registry.includes(`../../assets/drill-clips/${clip.poster.file}`),
      clip.drillId,
    );
  }
});
