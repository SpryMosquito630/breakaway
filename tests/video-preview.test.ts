import assert from "node:assert/strict";
import test from "node:test";
import { videoPreviewSize, videoPreviewTransform } from "../src/domain/videoPreview";

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
