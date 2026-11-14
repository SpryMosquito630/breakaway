import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { drills } from "../src/data/drills";
import { keeperDrills } from "../src/domain/training";

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
    photographic: boolean;
    photographIdentity: string;
    transform: { generativeEdits: boolean };
    professionalAction?: boolean;
    subjects?: string[];
    sourcePage: string;
    subjectEvidence?: { primaryPhotoPage: string };
  }[];
  coverage: { uncoveredBuiltinDrillIds: string[] };
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
  unique(manifest.assets.map((asset) => asset.sha256));
  unique(manifest.assets.map((asset) => asset.photographIdentity));
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
    assert.equal(asset.photographic, true);
    assert.equal(asset.transform.generativeEdits, false);
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
  const expected = [...drills, ...keeperDrills].map((drill) => drill.id).sort();
  assert.deepEqual(media.map((item) => item.id).sort(), expected);
  assert.equal(expected.length, 30);
  assert.deepEqual(manifest.coverage.uncoveredBuiltinDrillIds, []);
  const demoRegistry = read("src/data/drill-demos.ts");
  for (const film of films.clips) {
    assert.ok(
      demoRegistry.includes(
        `poster: require("../../assets/drill-demos/${film.poster.file}")`,
      ),
    );
  }
});

// Guard the user requirement directly: keepers and every ground drill must keep
// their own genuine photographic asset; an authored diagram is never coverage.
test("all 30 built-in drills retain real photographic coverage without schematic substitutes", () => {
  const photoIds = new Set(manifest.assets.map((asset) => asset.drillId));
  const filmedIds = new Set(films.clips.flatMap((clip) => clip.drillIds));
  for (const drill of [...drills, ...keeperDrills]) {
    assert.ok(
      photoIds.has(drill.id) || filmedIds.has(drill.id),
      `Missing real photograph: ${drill.id}`,
    );
  }
  assert.equal(manifest.assets.length, 28);
  assert.equal(filmedIds.size, 2);
});

test("suitable carry, control, cut and passing references retain verified professional action", () => {
  for (const id of [
    "carry-scan",
    "inside-out",
    "inside-cut",
    "outside-cut",
    "partner",
    "weak-cut",
  ]) {
    const asset = manifest.assets.find((item) => item.drillId === id);
    assert.equal(asset?.professionalAction, true, id);
    assert.ok(asset?.subjects?.length, `Missing identified professional subject: ${id}`);
    assert.equal(asset?.subjectEvidence?.primaryPhotoPage, asset?.sourcePage);
  }
});
