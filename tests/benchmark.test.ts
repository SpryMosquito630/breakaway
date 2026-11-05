import test from "node:test";
import assert from "node:assert/strict";
import {
  startBenchmark,
  tickBenchmark,
  cancelBenchmark,
  canSaveBenchmark,
} from "../src/domain/benchmark";
test("touch test gives three preparation seconds before thirty practice seconds", () => {
  const start = startBenchmark(1000);
  assert.equal(start.remaining, 3);
  assert.equal(tickBenchmark(start, 2000).run.remaining, 2);
  assert.equal(tickBenchmark(start, 3999).run.phase, "countdown");
  const running = tickBenchmark(start, 4000).run;
  assert.equal(running.phase, "running");
  assert.equal(running.remaining, 30);
  assert.equal(tickBenchmark(running, 33999).run.phase, "running");
  assert.equal(tickBenchmark(running, 34000).run.phase, "entry");
});
test("delayed frames finish from deadline and completion does not repeat", () => {
  const finish = tickBenchmark(startBenchmark(1000), 50000);
  assert.equal(finish.run.remaining, 0);
  assert.deepEqual(finish.signals, ["finish"]);
  assert.deepEqual(tickBenchmark(finish.run, 60000).signals, []);
});
test("cancelled, unfinished and invalid tests cannot save a result", () => {
  const start = startBenchmark(1000);
  const cancelled = cancelBenchmark(start);
  assert.equal(tickBenchmark(cancelled, 50000).run.phase, "cancelled");
  assert.equal(canSaveBenchmark(cancelled, "40"), false);
  assert.equal(canSaveBenchmark(start, "40"), false);
  const finished = tickBenchmark(start, 34000).run;
  for (const invalid of ["", "-1", "1.5", "1000", "abc"])
    assert.equal(canSaveBenchmark(finished, invalid), false);
  assert.equal(canSaveBenchmark(finished, "0"), true);
  assert.equal(canSaveBenchmark(finished, "999"), true);
});
