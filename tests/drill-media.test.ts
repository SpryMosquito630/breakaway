import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { drills } from "../src/data/drills";
import { drillMovements } from "../src/data/drill-movements";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const manifest = JSON.parse(read("assets/drill-photos/provenance.json")) as {
  assets: {
    drillId: string;
    file: string;
    sourceId: string;
    sha256: string;
    bytes: number;
    dimensions: number[];
  }[];
  diagramOrIconDrillIds: string[];
};
const films = JSON.parse(read("assets/drill-demos/provenance.json")) as {
  clips: { drillIds: string[]; pexelsId: number; poster: { file: string } }[];
};
const registry = read("src/data/drill-media.ts");

test("each drill photo uses a distinct original and an explicit matching registry entry", () => {
  const unique = (values: string[]) => assert.equal(new Set(values).size, values.length);
  unique(manifest.assets.map((asset) => asset.drillId));
  unique(manifest.assets.map((asset) => asset.sourceId));
  unique(manifest.assets.map((asset) => asset.file));
  for (const asset of manifest.assets) {
    assert.ok(
      registry
        .replace(/["'\s]/g, "")
        .includes(
          `${asset.drillId}:{source:require(../../assets/drill-photos/${asset.file})`,
        ),
    );
    const data = readFileSync(new URL(`assets/drill-photos/${asset.file}`, root));
    assert.equal(createHash("sha256").update(data).digest("hex"), asset.sha256);
    assert.equal(data.byteLength, asset.bytes);
    assert.ok(asset.bytes <= 120 * 1024);
    assert.ok(asset.dimensions[0] <= 900);
  }
  assert.equal(
    [...registry.matchAll(/require\("\.\.\/\.\.\/assets\/drill-photos\//g)].length,
    manifest.assets.length,
  );
  assert.deepEqual(
    readdirSync(new URL("assets/drill-photos", root))
      .filter((file) => file.endsWith(".webp"))
      .sort(),
    manifest.assets.map((asset) => asset.file).sort(),
  );
});

test("effective photos and video posters are never shared between drills", () => {
  const media = [
    ...manifest.assets.map((asset) => ({
      id: asset.drillId,
      path: `photo/${asset.file}`,
      original: `pexels/${asset.sourceId}`,
    })),
    ...films.clips.flatMap((film) =>
      film.drillIds.map((id) => ({
        id,
        path: `film/${film.poster.file}`,
        original: `pexels/${film.pexelsId}`,
      })),
    ),
  ];
  for (const key of ["id", "path", "original"] as const) {
    assert.equal(
      new Set(media.map((item) => item[key])).size,
      media.length,
      `Repeated ${key}`,
    );
  }
  const ids = new Set(media.map((item) => item.id));
  for (const drill of drills) {
    if (!ids.has(drill.id)) {
      assert.ok(manifest.diagramOrIconDrillIds.includes(drill.id), drill.id);
      assert.ok(
        drillMovements[drill.id],
        `No authored movement fallback for ${drill.id}`,
      );
    }
  }
});
