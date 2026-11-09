import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  playerStyles,
  playerStylesForPosition,
  pitchPositions,
} from "../src/domain/playerStyles";
import {
  patchFlowDraft,
  isFlowStepReady,
  answerOptions,
  sanitizeOnboardingAnswers,
  type FlowDraft,
} from "../src/domain/onboardingFlow";
import { positions, initialData } from "../src/domain/model";
import { restoreAppData } from "../src/domain/storage";
import { drills } from "../src/data/drills";

const names = (
  position: Parameters<typeof playerStylesForPosition>[0],
  detail?: string,
) => playerStylesForPosition(position, detail).map((player) => player.name);

test("every detailed pitch role has deliberately chosen inspirations", () => {
  const expected = {
    ST: ["Erling Haaland", "Harry Kane", "Kylian Mbappé"],
    LW: ["Kylian Mbappé", "Mohamed Salah", "Bukayo Saka"],
    RW: ["Kylian Mbappé", "Mohamed Salah", "Bukayo Saka"],
    LM: ["Kylian Mbappé", "Mohamed Salah", "Bukayo Saka"],
    RM: ["Kylian Mbappé", "Mohamed Salah", "Bukayo Saka"],
    AM: ["Kevin De Bruyne", "Pedri", "Bukayo Saka"],
    CM: ["Kevin De Bruyne", "Pedri", "Declan Rice"],
    DM: ["Sergio Busquets", "Declan Rice"],
    LB: ["Andrew Robertson", "Theo Hernández", "Alphonso Davies"],
    RB: ["Achraf Hakimi", "Trent Alexander-Arnold", "Jules Koundé"],
    CB: ["Virgil van Dijk", "William Saliba", "Jules Koundé"],
    GK: ["Manuel Neuer", "Alisson Becker", "Thibaut Courtois"],
    Exploring: ["Kylian Mbappé", "Pedri", "Virgil van Dijk", "Manuel Neuer"],
  };
  assert.deepEqual([...pitchPositions].sort(), Object.keys(expected).sort());
  for (const [detail, choices] of Object.entries(expected)) {
    assert.deepEqual(names(undefined, detail), choices, detail);
    assert.equal(new Set(choices).size, choices.length);
    for (const playstyle of choices)
      assert.equal(
        isFlowStepReady({ answers: { positionDetail: detail, playstyle } }, "playstyle"),
        true,
      );
    assert.equal(
      isFlowStepReady({ answers: { positionDetail: detail } }, "playstyle"),
      false,
    );
  }
});

test("broad-only and legacy unknown pitch roles use representative fallbacks", () => {
  for (const position of positions) {
    const choices = names(position);
    assert.ok(choices.length >= 3, position);
    assert.deepEqual(names(position, "legacy-unknown"), choices);
    assert.equal(isFlowStepReady({ position }, "playstyle"), false);
  }
  assert.deepEqual(names(undefined), names("Still exploring"));
  assert.deepEqual(names("Goalkeeper"), names("Goalkeeper", "GK"));
  assert.ok(names("Defender").includes("Andrew Robertson"));
});

test("changing role atomically clears incompatible inspiration and retains compatible choices", () => {
  const draft: FlowDraft = {
    position: "Midfielder",
    goal: "Passing",
    answers: { positionDetail: "CM", playstyle: "Declan Rice", name: "Alex" },
  };
  const compatible = patchFlowDraft(draft, {
    position: "Midfielder",
    answers: { positionDetail: "DM" },
  });
  assert.equal(compatible.answers?.playstyle, "Declan Rice");
  const changed = patchFlowDraft(draft, {
    position: "Goalkeeper",
    answers: { positionDetail: "GK" },
  });
  assert.equal(changed.position, "Goalkeeper");
  assert.equal(changed.answers?.positionDetail, "GK");
  assert.equal(changed.answers?.playstyle, undefined);
  assert.equal(changed.answers?.name, "Alex");
  assert.equal(changed.goal, "Passing");
  assert.equal(isFlowStepReady(changed, "playstyle"), false);
  assert.equal(draft.answers?.playstyle, "Declan Rice");
  const broadOnly = patchFlowDraft(draft, { position: "Forward" });
  assert.equal(broadOnly.answers?.positionDetail, undefined);
  assert.equal(broadOnly.answers?.playstyle, undefined);
  const unchanged = patchFlowDraft(draft, { answers: { name: "Sam" } });
  assert.equal(unchanged.answers?.playstyle, "Declan Rice");
  assert.equal(
    patchFlowDraft({}, { position: "Forward", answers: { positionDetail: "ST" } }).answers
      ?.playstyle,
    undefined,
  );
});

test("a stale hidden selection cannot enable Continue even before normalization", () => {
  for (const playstyle of ["Kevin De Bruyne", "Erling Haaland", "invented player", ""]) {
    assert.equal(
      isFlowStepReady(
        { position: "Goalkeeper", answers: { positionDetail: "GK", playstyle } },
        "playstyle",
      ),
      false,
    );
  }
  assert.equal(
    isFlowStepReady(
      {
        position: "Goalkeeper",
        answers: { positionDetail: "GK", playstyle: "Manuel Neuer" },
      },
      "playstyle",
    ),
    true,
  );
});

test("all existing and new inspiration names round-trip without touching history", () => {
  const history = [
    {
      id: "kept",
      date: "2026-11-01T12:00:00Z",
      seconds: 180,
      done: 1,
      skipped: 0,
      total: 1,
      completed: true,
    },
  ];
  for (const player of playerStyles) {
    assert.ok(answerOptions.playstyle.includes(player.name));
    assert.deepEqual(sanitizeOnboardingAnswers({ playstyle: player.name }), {
      playstyle: player.name,
    });
    const restored = restoreAppData(
      JSON.stringify({
        ...initialData(),
        history,
        onboardingAnswers: { playstyle: player.name },
      }),
      drills,
    );
    assert.equal(restored.onboardingAnswers?.playstyle, player.name);
    assert.deepEqual(
      restored.history,
      restoreAppData(JSON.stringify({ ...initialData(), history }), drills).history,
    );
  }
  assert.equal(sanitizeOnboardingAnswers({ playstyle: "invented player" }), undefined);
});

test("every catalog photo has a stable bundled image and a linked license credit", () => {
  const manifest = JSON.parse(
    readFileSync(resolve("assets/player-styles/manifest.json"), "utf8"),
  ) as { file: string; author: string; sourceUrl: string; licenseUrl: string }[];
  const mapping = readFileSync(resolve("src/data/playerStyleImages.ts"), "utf8");
  for (const player of playerStyles) {
    const file = `${player.id}.jpg`;
    assert.ok(existsSync(resolve("assets/player-styles", file)), file);
    assert.ok(mapping.includes(`assets/player-styles/${file}`), file);
    const credit = manifest.find((entry) => entry.file === file);
    assert.ok(credit?.author, file);
    assert.match(credit.sourceUrl, /^https:\/\/commons.wikimedia.org\/wiki\/File:/);
    assert.match(credit.licenseUrl, /^https:\/\/creativecommons.org\//);
  }
});
