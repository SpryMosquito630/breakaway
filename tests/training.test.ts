import test from "node:test";
import assert from "node:assert/strict";
import {
  allowed,
  initialData,
  makeSession,
  matchPlan,
  positions,
  type Drill,
} from "../src/domain/model";
import { planForDate } from "../src/domain/planning";
import { drills } from "../src/data/drills";
import { restoreAppData } from "../src/domain/storage";
import {
  combinedCatalog,
  deleteCustomDrill,
  pathStage,
  playlistIssues,
  sanitizeCustomDrills,
  trainingPaths,
  trainingPlanToday,
  weeklyReview,
} from "../src/domain/training";
import { sessionForToday, sessionMinutesToday } from "../src/domain/sessionTime";
const custom: Drill = {
  id: "custom-one",
  name: "My touch",
  skill: "Ball control",
  gear: [],
  space: "Small space",
  level: "New to training",
  cue: "Keep it close",
  steps: ["Tap gently"],
  tip: "Reset",
  version: 1,
};
const now = new Date(2026, 10, 6, 12);
test("automatic combined-catalog plans reserve keeper handling for goalkeepers across focus, level and rotation", () => {
  const data = initialData();
  const catalog = combinedCatalog(drills, data);
  let keeperRecommended = false;
  for (const position of [...positions, undefined])
    for (const experience of ["New to training", "Some experience"])
      for (const goal of [
        "Ball control",
        "Passing",
        "Dribbling",
        "Weaker foot",
      ] as const) {
        const profile = {
          ...data.profile,
          position,
          experience,
          goal,
          days: ["Mon", "Wed", "Fri"],
          minutes: 15,
          space: "Open space",
          gear: ["markers", "partner"],
        };
        const generated = {
          ...data,
          profile,
          plan: matchPlan(catalog, profile),
          planCustomized: false,
        };
        for (let day = 2; day < 30; day++) {
          const date = new Date(2026, 10, day, 12);
          for (const ids of [
            generated.plan,
            planForDate(catalog, profile, [], date, false),
            trainingPlanToday(generated, catalog, date),
          ]) {
            assert.equal(ids.length, 3);
            assert.equal(new Set(ids).size, 3);
            assert.ok(
              ids.every((id) =>
                allowed(
                  catalog.find((d) => d.id === id)!,
                  profile,
                ),
              ),
            );
            const hasKeeper = ids.some((id) => id.startsWith("keeper-"));
            if (position === "Goalkeeper") keeperRecommended ||= hasKeeper;
            else
              assert.equal(
                hasKeeper,
                false,
                `${position ?? "unset"} / ${experience} / ${goal} / ${day}`,
              );
          }
        }
      }
  assert.ok(keeperRecommended, "goalkeepers still receive specialist drills");
});
test("explicit keeper path and manual choices remain available to other positions and keep equipment constraints", () => {
  const data = {
    ...initialData(),
    profile: {
      ...initialData().profile,
      position: "Midfielder" as const,
      experience: "Some experience",
      gear: ["markers"],
      space: "Open space",
    },
  };
  const catalog = combinedCatalog(drills, data);
  // The reported fresh onboarding setup must produce footwork, never a catch.
  assert.ok(
    trainingPlanToday(data, catalog, now).every((id) => !id.startsWith("keeper-")),
  );
  const manual = {
    ...data,
    plan: ["keeper-hold", "keeper-roll", "sole"],
    planCustomized: true,
  };
  assert.deepEqual(trainingPlanToday(manual, catalog, now), ["keeper-hold", "sole"]);
  assert.deepEqual(manual.plan, ["keeper-hold", "keeper-roll", "sole"]);
  assert.ok(
    trainingPlanToday(
      {
        ...data,
        trainingPreferences: { pathId: "keeper", weeklyTarget: 3, matchDays: [] },
      },
      catalog,
      now,
    ).includes("keeper-hold"),
  );
  const novice = { ...data.profile, experience: "New to training" };
  assert.ok(
    matchPlan(catalog, novice).every(
      (id) => catalog.find((d) => d.id === id)!.level === novice.experience,
    ),
  );
  assert.equal(playlistIssues(["keeper-hold"], catalog, data.profile).length, 0);
});
test("every authored path references real drills and constraints hold without selecting a path by default", () => {
  const data = initialData();
  const catalog = combinedCatalog(drills, data);
  assert.equal(data.trainingPreferences, undefined);
  for (const p of trainingPaths) {
    assert.equal(p.stages.length, 3);
    for (const stage of p.stages)
      for (const id of stage)
        assert.ok(
          catalog.some((d) => d.id === id),
          id,
        );
    const next = {
      ...data,
      trainingPreferences: { pathId: p.id, weeklyTarget: 3, matchDays: [] },
    };
    for (const id of trainingPlanToday(next, catalog, now)) {
      const d = catalog.find((d) => d.id === id)!;
      assert.equal(d.gear.length, 0);
      assert.equal(d.space, "Small space");
    }
  }
});
test("custom plans, favorites, playlists and frozen instructions survive restore and later edits", () => {
  const data = {
    ...initialData(),
    customDrills: [custom],
    plan: [custom.id],
    planCustomized: true,
    favorites: [custom.id],
    playlists: [{ id: "playlist-one", name: "Touches", ids: [custom.id] }],
  };
  const active = makeSession(data.plan, 10, now.getTime(), [custom]);
  const restored = restoreAppData(JSON.stringify({ ...data, active }), drills);
  assert.deepEqual(restored.plan, [custom.id]);
  assert.equal(restored.planCustomized, true);
  assert.deepEqual(restored.favorites, [custom.id]);
  assert.equal(restored.playlists?.length, 1);
  assert.equal(restored.active?.snapshots?.[custom.id].name, "My touch");
  assert.equal(deleteCustomDrill(restored, custom.id), restored);
  const changed = restoreAppData(
    JSON.stringify({
      ...restored,
      customDrills: [{ ...custom, name: "Edited", version: 2 }],
    }),
    drills,
  );
  assert.equal(changed.active?.snapshots?.[custom.id].name, "My touch");
  assert.equal(
    combinedCatalog(drills, changed).find((d) => d.id === custom.id)?.name,
    "Edited",
  );
});
test("malformed optional training fields do not erase valid history and custom input is bounded", () => {
  const data = initialData();
  data.history = [
    {
      id: "old",
      date: now.toISOString(),
      seconds: 50,
      done: 1,
      total: 1,
      skipped: 0,
      completed: true,
    },
  ];
  const restored = restoreAppData(
    JSON.stringify({
      ...data,
      customDrills: [{ id: "bad" }],
      favorites: {},
      playlists: [{}],
      trainingPreferences: { pathId: "bad" },
      dailyReadiness: {},
    }),
    drills,
  );
  assert.equal(restored.history.length, 1);
  assert.deepEqual(restored.customDrills, []);
  assert.deepEqual(restored.favorites, []);
  assert.deepEqual(restored.playlists, []);
  assert.equal(
    sanitizeCustomDrills([{ ...custom, name: "x".repeat(500) }])[0].name.length,
    80,
  );
  assert.equal(sanitizeCustomDrills([{ ...custom, gear: ["unknown"] }]).length, 0);
});
test("daily gear filters today without changing a manual plan and match/low energy caps new sessions only", () => {
  const data = {
    ...initialData(),
    profile: { ...initialData().profile, gear: ["wall"], minutes: 30 },
    plan: ["wall", "sole"],
    planCustomized: true,
    dailyReadiness: { date: "2026-11-06", energy: "Low" as const, gear: [] },
  };
  const catalog = combinedCatalog(drills, data);
  assert.deepEqual(trainingPlanToday(data, catalog, now), ["sole"]);
  assert.deepEqual(data.plan, ["wall", "sole"]);
  assert.equal(sessionMinutesToday(data, now), 10);
  assert.equal(sessionForToday(data, catalog, now).duration, 480);
  const active = makeSession(["wall"], 30, now.getTime(), catalog);
  assert.equal(sessionForToday({ ...data, active }, catalog, now), active);
  const match = {
    ...data,
    dailyReadiness: undefined,
    trainingPreferences: { weeklyTarget: 3, matchDays: ["Fri"] },
  };
  assert.equal(sessionMinutesToday(match, now), 10);
  assert.equal(sessionMinutesToday(match, new Date(2026, 10, 7, 12)), 30);
});
test("playlist eligibility prevents missing equipment or oversized combinations", () => {
  const data = initialData();
  const catalog = combinedCatalog(drills, { customDrills: [custom] });
  assert.equal(playlistIssues([custom.id], catalog, data.profile).length, 0);
  assert.ok(playlistIssues(["wall"], catalog, data.profile).length);
  assert.ok(playlistIssues(Array(9).fill("sole"), catalog, data.profile).length);
  assert.ok(playlistIssues([], catalog, data.profile).length);
});
test("weekly review and path stage count actual practice, reject partial and future results", () => {
  const data = initialData();
  data.trainingPreferences = { pathId: "weak-foot", weeklyTarget: 3, matchDays: [] };
  data.history = Array.from({ length: 3 }, (_, i) => ({
    id: String(i),
    date: new Date(2026, 10, 4 + i, 10).toISOString(),
    seconds: 100,
    done: 1,
    total: 1,
    skipped: 0,
    completed: true,
    effort: "Challenging",
    drills: [
      { id: "weak", version: 1, difficulty: 1, status: "done" as const, seconds: 100 },
    ],
  }));
  assert.equal(pathStage(data, now), 1);
  assert.equal(weeklyReview(data, now).count, 3);
  assert.equal(weeklyReview(data, now).minutes, 10);
  data.history.forEach((h) => (h.completed = false));
  assert.equal(pathStage(data, now), 0);
  assert.equal(weeklyReview(data, now).count, 0);
});
test("damaged custom payload cannot make valid history inaccessible through orphaned plans or active references", () => {
  const data = {
    ...initialData(),
    customDrills: [{ ...custom, gear: ["bad"] }],
    plan: [custom.id],
    planCustomized: true,
    active: makeSession([custom.id], 10, now.getTime(), [custom]),
    history: [
      {
        id: "kept",
        date: now.toISOString(),
        seconds: 60,
        done: 1,
        total: 1,
        skipped: 0,
        completed: true,
      },
    ],
  };
  const restored = restoreAppData(JSON.stringify(data), drills);
  assert.equal(restored.history[0].id, "kept");
  assert.equal(restored.active, null);
  assert.ok(restored.trainingRecoveryNotice);
  assert.ok(restored.plan.length);
  assert.equal(restored.planCustomized, false);
});
