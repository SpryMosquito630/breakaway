import test from "node:test";
import assert from "node:assert/strict";
import { validShotTechnique, type ShotTechnique } from "../src/domain/shotTechnique";
const result = (): ShotTechnique => ({
  source: "gemini",
  subjective: true,
  label: "AI coaching estimate",
  score: 75,
  confidence: "medium",
  shotStyle: "instep",
  summary: "Synthetic visible sequence",
  limitations: "Subjective test fixture",
  categories: [
    {
      id: "body_control",
      score: 75,
      reason: "Visible body control",
      timestampSeconds: 0.2,
    },
    {
      id: "striking_action",
      score: 75,
      reason: "Visible striking action",
      timestampSeconds: 0.4,
    },
    {
      id: "follow_through",
      score: 75,
      reason: "Visible continuation",
      timestampSeconds: 0.6,
    },
  ],
  improvement: { text: "Synthetic visible improvement", timestampSeconds: 0.6 },
  durationSeconds: 1,
  sampledFrames: 5,
});
test("technique score is accepted only with a consistent subjective total and timestamped categories", () => {
  const value = result();
  assert.equal(validShotTechnique(value, 1), true);
  for (const corrupt of [
    { ...value, score: 99 },
    { ...value, confidence: "low" },
    { ...value, subjective: false },
    { ...value, durationSeconds: 3 },
    { ...value, improvement: { text: "Invalid time", timestampSeconds: 2 } },
    { ...value, categories: [...value.categories.slice(0, 2), value.categories[0]] },
    {
      ...value,
      categories: value.categories.map((c) => ({ ...c, timestampSeconds: null })),
    },
  ])
    assert.equal(validShotTechnique(corrupt, 1), false);
});
test("insufficient evidence never becomes a zero or a partially scored total", () => {
  const value = {
    ...result(),
    score: null,
    confidence: "low" as const,
    categories: result().categories.map((c) => ({ ...c, score: null })),
    improvement: null,
  };
  assert.equal(validShotTechnique(value, 1), true);
  assert.equal(validShotTechnique({ ...value, score: 0 }, 1), false);
  assert.equal(
    validShotTechnique({ ...value, categories: result().categories }, 1),
    false,
  );
});
test("malformed ratings and out of clip evidence are rejected", () => {
  for (const bad of [-1, 101, NaN, Infinity, 2.5, "75"])
    assert.equal(validShotTechnique({ ...result(), score: bad }, 1), false);
  assert.equal(
    validShotTechnique(
      {
        ...result(),
        categories: result().categories.map((c) => ({ ...c, timestampSeconds: 2 })),
      },
      1,
    ),
    false,
  );
  assert.equal(validShotTechnique(null, 1), false);
});
