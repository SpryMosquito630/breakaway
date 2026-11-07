import test from 'node:test';
import assert from 'node:assert/strict';
import { readConnectionConfig } from '../src/connected/config';
import { assertRevision, assertUnchangedTraining, buildTrainingPayload, parseTrainingPayload } from '../src/connected/sync';
import { initialData, makeSession, type Drill } from '../src/domain/model';
import { drills } from '../src/data/drills';
test('online configuration requires HTTPS and a publishable client key', () => {
  assert.equal(readConnectionConfig(), null);
  for (const url of ['http://example.com', 'https://user:password@example.com', 'https://example.com/secret']) assert.equal(readConnectionConfig(url, 'sb_publishable_test'), null);
  for (const key of ['service_role', 'sb_secret_abc', 'eyJhbGciOiJIUzI1NiJ9']) assert.equal(readConnectionConfig('https://example.supabase.co', key), null);
  assert.deepEqual(readConnectionConfig('https://example.supabase.co', 'sb_publishable_test'), { url: 'https://example.supabase.co', key: 'sb_publishable_test' });
});
test('cloud training excludes active sessions and unrelated stores in both directions', () => {
  const input = { ...initialData(), active: makeSession(['sole'], 15), gps: [{ lat: 1 }], replays: ['private.mov'], photos: ['food.jpg'] };
  const payload = buildTrainingPayload(input);
  assert.equal(payload.active, null);
  for (const key of ['gps', 'replays', 'photos']) assert.equal(key in payload, false);
  const restored = parseTrainingPayload({ ...payload, active: input.active, replays: ['secret.mov'] }, drills);
  assert.equal(restored.active, null); assert.equal('replays' in restored, false);
});
test('cloud restore keeps incoming custom drills and sanitizes malformed backup', () => {
  const custom: Drill = { id: 'custom-test', name: 'My touches', skill: 'Ball control', gear: [], space: 'Small space', level: 'New to training', cue: 'Soft', steps: ['Tap'], tip: 'Breathe' };
  const restored = parseTrainingPayload(buildTrainingPayload({ ...initialData(), plan: [custom.id], customDrills: [custom], planCustomized: true }), drills);
  assert.deepEqual(restored.plan, [custom.id]); assert.equal(restored.customDrills?.[0].name, 'My touches');
  for (const bad of [null, [], {}, { version: 2 }]) assert.throws(() => parseTrainingPayload(bad, drills));
});
test('cloud conflicts and concurrent local edits prevent silent replacement', () => {
  assertRevision(3, 3); assertRevision(null, null);
  assert.throws(() => assertRevision(3, 4), /another device/);
  const data = initialData(); const captured = JSON.stringify(buildTrainingPayload(data));
  assertUnchangedTraining(data, captured);
  assert.throws(() => assertUnchangedTraining({ ...data, onboarded: true }, captured), /Local training changed/);
  assert.throws(() => assertUnchangedTraining({ ...data, active: makeSession(['sole'], 15) }, captured), /active practice/);
});

test('unknown nested fields cannot piggyback on training sync', () => {
  const data = initialData();
  const privateData = { ...data, profile: { ...data.profile, gps: 'private' }, history: [{ id: 'one', date: new Date().toISOString(), seconds: 30, done: 1, skipped: 0, total: 1, completed: true, replay: 'file:///private.mov' }] };
  const payload = buildTrainingPayload(privateData);
  assert.equal('gps' in (payload.profile as object), false);
  assert.equal('replay' in (payload.history as object[])[0], false);
  const restored = parseTrainingPayload(privateData, drills);
  assert.equal('gps' in restored.profile, false);
  assert.equal('replay' in restored.history[0], false);
});


test("connected features fail closed for shipping builds, unknown ages and under-13 players", async () => {
  const { canUseConnectedFeatures } = await import("../src/connected/access");
  for (const age of [undefined, "under13", "13to17", "adult"] as const) assert.equal(canUseConnectedFeatures(age, false), false);
  assert.equal(canUseConnectedFeatures(undefined, true), false);
  assert.equal(canUseConnectedFeatures("under13", true), false);
  assert.equal(canUseConnectedFeatures("13to17", true), true);
  assert.equal(canUseConnectedFeatures("adult", true), true);
  const local = initialData(); local.profile.ageBand = "under13";
  assert.equal("ageBand" in (buildTrainingPayload(local).profile as object), false);
});
