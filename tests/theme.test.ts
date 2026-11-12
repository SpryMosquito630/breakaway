import test from "node:test";
import assert from "node:assert/strict";
import { getPalette, restoreThemeMode } from "../src/theme/palette";
function luminance(hex: string) {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((value) => {
      const n = parseInt(value, 16) / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
for (const theme of ["light", "dark"] as const) {
  test(`${theme} control boundaries remain visible on input and page surfaces`, () => {
    const c = getPalette(theme);
    for (const surface of [c.white, c.bg])
      assert.ok(contrast(c.lineStrong, surface) >= 3);
  });
  test(`${theme} text stays readable on primary, lime, destructive and deep fills`, () => {
    const c = getPalette(theme);
    for (const [text, fill] of [
      [c.onPrimary, c.green],
      [c.onLime, c.lime],
      [c.onDanger, c.danger],
      [c.onDeep, c.deep],
    ])
      assert.ok(contrast(text, fill) >= 4.5, `${text} on ${fill}`);
    for (const text of [c.ink, c.muted])
      for (const fill of [c.bg, c.white]) assert.ok(contrast(text, fill) >= 4.5);
  });
}

test("fresh appearance uses forest while saved light, dark and system choices survive", () => {
  assert.equal(restoreThemeMode(null), "dark");
  assert.equal(restoreThemeMode("invalid"), "dark");
  for (const mode of ["light", "dark", "system"] as const)
    assert.equal(restoreThemeMode(mode), mode);
});
