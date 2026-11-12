import test from "node:test";
import assert from "node:assert/strict";
import { drills } from "../src/data/drills";
import { initialData, allowed, makeSession, type AppData } from "../src/domain/model";
import {
  answerOptions,
  allergyOptions,
  aspirations,
  snapshotStyles,
  weekActivities,
  finishOnboardingDraft,
  patchFlowDraft,
  isFlowStepReady,
  sanitizeOnboardingAnswers,
  type FlowDraft,
  type OnboardingAnswers,
} from "../src/domain/onboardingFlow";
import { restoreAppData } from "../src/domain/storage";
import { buildTrainingPayload, parseTrainingPayload } from "../src/connected/sync";
import { trainingContext } from "../src/coachAi/guide";
import { measurementDefaultsForEntry } from "../src/domain/measurementWheel";

test("reference measurement defaults stay in the draft and Skip clears both while keeping other answers", () => {
  const before: FlowDraft = { answers: { name: "Player" } };
  const entered = patchFlowDraft(before, {
    answers: measurementDefaultsForEntry(before.answers ?? {}),
  });
  assert.deepEqual(entered.answers, { name: "Player", heightCm: 175, weightKg: 70 });
  assert.deepEqual(before.answers, { name: "Player" });
  const edited = patchFlowDraft(entered, {
    answers: { heightCm: 182.9, weightKg: 81.6 },
  });
  const reopened = patchFlowDraft(edited, {
    answers: measurementDefaultsForEntry(edited.answers ?? {}),
  });
  assert.equal(reopened.answers?.heightCm, 182.9);
  assert.equal(reopened.answers?.weightKg, 81.6);
  const skipped = patchFlowDraft(reopened, {
    answers: { heightCm: undefined, weightKg: undefined },
  });
  assert.equal(skipped.answers?.heightCm, undefined);
  assert.equal(skipped.answers?.weightKg, undefined);
  assert.equal(skipped.answers?.name, "Player");
});

const draft = (): FlowDraft => ({
  ageBand: "13to17",
  position: "Midfielder",
  goal: "Passing",
  experience: "Some experience",
  days: ["Tue", "Sat"],
  minutes: 20,
  gear: ["wall"],
  space: "Small space",
});
const privateAnswers = (): OnboardingAnswers => ({
  ...Object.fromEntries(
    Object.entries(answerOptions).map(([key, values]) => [key, values[0]]),
  ),
  name: "Private Nickname",
  clubName: "Private Club",
  positionDetail: "CM",
  heightCm: 173.5,
  weightKg: 62.1,
  aspirations: aspirations.slice(0, 2),
  allergies: allergyOptions.slice(0, 2),
  snapshotStyle: snapshotStyles[0],
  week: { Tue: { activity: weekActivities[1], time: "18:00" } },
});

test("fresh flow has no core answers and requires every training constraint", () => {
  for (const step of [
    "identity",
    "position",
    "focus",
    "experience",
    "days",
    "duration",
    "space",
    "equipment",
    "plan",
  ] as const)
    assert.equal(isFlowStepReady({}, step), false, step);
  assert.equal(finishOnboardingDraft(initialData(), {}, drills), null);
  for (const key of Object.keys(draft()) as (keyof FlowDraft)[])
    assert.equal(
      finishOnboardingDraft(initialData(), { ...draft(), [key]: undefined }, drills),
      null,
      key,
    );
  const completed = finishOnboardingDraft(initialData(), draft(), drills)!;
  assert.deepEqual(completed.profile, draft());
  assert.ok(completed.plan.length > 0);
  assert.ok(
    completed.plan.every((id) =>
      allowed(
        drills.find((drill) => drill.id === id)!,
        completed.profile,
      ),
    ),
  );
});

test("optional answers round-trip locally and malformed fields do not discard valid siblings", () => {
  const answers = privateAnswers();
  assert.deepEqual(sanitizeOnboardingAnswers(answers), answers);
  const completed = finishOnboardingDraft(
    initialData(),
    { ...draft(), answers },
    drills,
  )!;
  assert.deepEqual(
    restoreAppData(JSON.stringify(completed), drills).onboardingAnswers,
    answers,
  );
  const clean = sanitizeOnboardingAnswers({
    ...answers,
    name: " \u0000 Alex\n ",
    heightCm: Number.NaN,
    weightKg: Number.POSITIVE_INFINITY,
    diet: "unknown dietary option",
    positionDetail: "not a pitch position",
    aspirations: [aspirations[0], aspirations[0], "unknown aspiration", null],
    arbitrarySecret: "must not survive",
  })!;
  assert.equal(clean.name, "Alex");
  assert.equal(clean.clubName, answers.clubName);
  assert.equal(clean.frequency, answers.frequency);
  for (const key of ["heightCm", "weightKg", "diet", "positionDetail", "arbitrarySecret"])
    assert.equal(key in clean, false, key);
  assert.deepEqual(clean.aspirations, [aspirations[0]]);
  for (const raw of [null, [], "invalid", 42])
    assert.equal(sanitizeOnboardingAnswers(raw), undefined);
});

test("completed replay preserves progress, custom choices, active session fields and child restriction", () => {
  const current: AppData = {
    ...initialData(),
    onboarded: true,
    profile: { ...draft(), ageBand: "under13" } as AppData["profile"],
    plan: ["weak", "sole", "inside"],
    planCustomized: true,
    history: [
      {
        id: "retained",
        date: "2026-11-01T12:00:00Z",
        seconds: 180,
        done: 1,
        skipped: 0,
        total: 1,
        completed: true,
      },
    ],
    assessments: [
      {
        id: "passing-result",
        date: "2026-11-01T12:00:00Z",
        skill: "passing",
        protocolVersion: 1,
        value: 12,
      },
    ],
    benchmarks: [{ id: "benchmark", date: "2026-11-01T12:00:00Z", count: 10 }],
    favorites: ["sole"],
    active: makeSession(["sole"], 20, 12345, drills),
  };
  const completed = finishOnboardingDraft(
    current,
    { ...draft(), ageBand: "adult", position: "Forward", answers: privateAnswers() },
    drills,
    true,
  )!;
  assert.equal(completed.profile.ageBand, "under13");
  assert.equal(completed.profile.position, "Forward");
  assert.equal(completed.planCustomized, true);
  for (const key of [
    "plan",
    "history",
    "assessments",
    "benchmarks",
    "favorites",
    "active",
  ] as const)
    assert.deepEqual(completed[key], current[key], key);
  assert.deepEqual(completed.onboardingAnswers, privateAnswers());
});

test("weekly commitments and card styles validate independently without creating training defaults", () => {
  for (const playstyle of answerOptions.playstyle)
    assert.deepEqual(sanitizeOnboardingAnswers({ playstyle }), { playstyle });
  for (const snapshotStyle of snapshotStyles)
    assert.deepEqual(sanitizeOnboardingAnswers({ snapshotStyle }), { snapshotStyle });
  const clean = sanitizeOnboardingAnswers({
    name: "Keep this note",
    snapshotStyle: "unknown style",
    allergies: [allergyOptions[0], allergyOptions[0], "unknown ingredient", null],
    week: {
      Tue: { activity: weekActivities[1], time: "18:00", secret: "discard" },
      Wed: { activity: weekActivities[2], time: "24:61" },
      Thu: { activity: "unknown activity", time: "10:00" },
      Fri: null,
      NotADay: { activity: weekActivities[0], time: "09:00" },
    },
  })!;
  assert.equal(clean.name, "Keep this note");
  assert.equal("snapshotStyle" in clean, false);
  assert.deepEqual(clean.allergies, [allergyOptions[0]]);
  assert.deepEqual(clean.week, {
    Tue: { activity: weekActivities[1], time: "18:00" },
    Wed: { activity: weekActivities[2] },
  });
  const withoutNotes = finishOnboardingDraft(initialData(), draft(), drills)!;
  const withNotes = finishOnboardingDraft(
    initialData(),
    { ...draft(), answers: privateAnswers() },
    drills,
  )!;
  assert.deepEqual(withNotes.profile, withoutNotes.profile);
  assert.deepEqual(withNotes.plan, withoutNotes.plan);
  const { onboardingAnswers: savedNotes, ...trainingWithNotes } = withNotes;
  const { onboardingAnswers: omittedNotes, ...trainingWithoutNotes } = withoutNotes;
  assert.ok(savedNotes);
  assert.equal(omittedNotes, undefined);
  assert.deepEqual(trainingWithNotes, trainingWithoutNotes);
  assert.equal(
    sanitizeOnboardingAnswers({ overall: 99, pace: 99, passing: 99 }),
    undefined,
  );
});

test("private onboarding answers cannot enter training cloud backup, restore or AI context", () => {
  const completed = finishOnboardingDraft(
    initialData(),
    { ...draft(), answers: privateAnswers() },
    drills,
  )!;
  const payload = buildTrainingPayload(completed);
  assert.equal("onboardingAnswers" in payload, false);
  assert.equal("ageBand" in (payload.profile as object), false);
  const restored = parseTrainingPayload(
    {
      ...payload,
      onboardingAnswers: privateAnswers(),
      profile: {
        ...(payload.profile as object),
        name: "Private Nickname",
        heightCm: 173.5,
        diet: answerOptions.diet[0],
      },
    },
    drills,
  );
  assert.equal("onboardingAnswers" in restored, false);
  for (const key of ["name", "heightCm", "diet"])
    assert.equal(key in restored.profile, false, key);
  for (const publicData of [payload, trainingContext(completed, drills)]) {
    const serialized = JSON.stringify(publicData);
    for (const secret of [
      "Private Nickname",
      "Private Club",
      "heightCm",
      "weightKg",
      "onboardingAnswers",
      "snapshotStyle",
      "allergies",
    ])
      assert.equal(serialized.includes(secret), false, secret);
  }
});
