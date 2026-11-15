import assert from "node:assert/strict";
import test from "node:test";
import {
  videoPreviewCallout,
  videoPreviewSize,
  videoPreviewTransform,
} from "../src/domain/videoPreview";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test("centered portrait cover crops top/bottom while contain shows the entire source", () => {
  const source = { width: 900, height: 1600 };
  const viewport = { width: 360, height: 240 };
  const fill = videoPreviewTransform(source, viewport, "cover");
  close(fill.scale, 0.4);
  close(fill.offsetX, 0);
  close(fill.offsetY, -200);
  // A source-center joint stays at the viewport center in either mode.
  for (const fit of ["cover", "contain"] as const) {
    const t = videoPreviewTransform(source, viewport, fit);
    close(450 * t.scale + t.offsetX, 180);
    close(800 * t.scale + t.offsetY, 120);
  }
  const full = videoPreviewTransform(source, viewport, "contain");
  close(full.offsetX, 112.5);
  close(full.offsetY, 0);
  close(1600 * full.scale, 240);
});

test("landscape cover crops side edges and contain letterboxes vertically", () => {
  const source = { width: 1600, height: 900 };
  const viewport = { width: 360, height: 240 };
  const fill = videoPreviewTransform(source, viewport, "cover");
  close(fill.offsetX, -100 / 3);
  close(fill.offsetY, 0);
  const fit = videoPreviewTransform(source, viewport, "contain");
  close(fit.offsetX, 0);
  close(fit.offsetY, 18.75);
  // Inverse-scaled overlay strokes render at the same size in both modes.
  close((2.3 / fill.scale) * fill.scale, 2.3);
  close((2.3 / fit.scale) * fit.scale, 2.3);
});

test("preview sizing preserves source in Fit and bounds Fill after window rotation", () => {
  const portrait = { width: 900, height: 1600 };
  for (const [width, height] of [
    [350, 844],
    [804, 390],
    [1000, 1200],
  ]) {
    for (const mode of ["cover", "contain"] as const) {
      const size = videoPreviewSize(portrait, width, height, mode);
      assert.ok(size.width <= width + 1e-8);
      assert.ok(size.height <= Math.max(180, Math.min(480, height * 0.46)) + 1e-8);
      close(size.width / size.height, mode === "cover" ? 1.5 : 900 / 1600);
    }
  }
  const landscape = videoPreviewSize({ width: 1600, height: 900 }, 350, 844, "contain");
  close(landscape.width, 350);
  close(landscape.height, 196.875);
});

test("portrait and landscape Fill callouts stay inside the visible viewport", () => {
  const viewport = { width: 350, height: 350 / 1.5 };
  for (const source of [
    { width: 854, height: 480 },
    { width: 900, height: 1600 },
  ]) {
    const t = videoPreviewTransform(source, viewport, "cover");
    const font = 14.5 / t.scale;
    const margin = font * 0.35;
    const width = font * (12 * 0.54 + 1.45);
    const height = font * 2.1;
    const anchor = { x: source.width / 2, y: source.height / 2 };
    for (const x of [margin, source.width - width - margin]) {
      for (const y of [0, source.height]) {
        const placed = videoPreviewCallout(
          source,
          viewport,
          "cover",
          anchor,
          { x, y, width, height },
          margin,
        );
        assert.ok(placed);
        assert.ok(placed.x * t.scale + t.offsetX >= margin * t.scale - 1e-8);
        assert.ok(placed.y * t.scale + t.offsetY >= margin * t.scale - 1e-8);
        assert.ok(
          (placed.x + width) * t.scale + t.offsetX <=
            viewport.width - margin * t.scale + 1e-8,
        );
        assert.ok(
          (placed.y + height) * t.scale + t.offsetY <=
            viewport.height - margin * t.scale + 1e-8,
        );
        close(font * t.scale, 14.5);
      }
    }
  }
});

test("callouts abstain for off-crop body anchors, but Fit retains those anchors", () => {
  const viewport = { width: 350, height: 350 / 1.5 };
  for (const [source, anchor] of [
    [
      { width: 854, height: 480 },
      { x: 0, y: 240 },
    ],
    [
      { width: 900, height: 1600 },
      { x: 450, y: 0 },
    ],
  ] as const) {
    const label = { x: 10, y: 10, width: 100, height: 35 };
    assert.equal(videoPreviewCallout(source, viewport, "cover", anchor, label, 5), null);
    assert.ok(videoPreviewCallout(source, viewport, "contain", anchor, label, 5));
  }
});

test("Fit callout placement retains existing source-edge spacing and clamping", () => {
  const source = { width: 854, height: 480 };
  const viewport = { width: 350, height: (350 * 480) / 854 };
  assert.deepEqual(
    videoPreviewCallout(
      source,
      viewport,
      "contain",
      { x: 427, y: 240 },
      { x: 10, y: 100, width: 200, height: 60 },
      10,
    ),
    { x: 10, y: 100 },
  );
  assert.equal(
    videoPreviewCallout(
      source,
      viewport,
      "contain",
      { x: 427, y: 240 },
      { x: 0, y: 0, width: 900, height: 60 },
      10,
    ),
    null,
  );
});
