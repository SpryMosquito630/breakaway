import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  readyBenchmark,
  startBenchmark,
  tickBenchmark,
  cancelBenchmark,
  BenchmarkRun,
} from "../domain/benchmark";
import { useKeepTimerAwake, useTimerFeedback } from "./useTimerFeedback";
export function useBenchmarkClock() {
  const [run, setRun] = useState(readyBenchmark);
  const ref = useRef(run);
  const mounted = useRef(true);
  const feedback = useTimerFeedback();
  const apply = useCallback((next: BenchmarkRun) => {
    ref.current = next;
    if (mounted.current) setRun(next);
  }, []);
  const cancel = useCallback(() => apply(cancelBenchmark(ref.current)), [apply]);
  const start = useCallback(() => {
    apply(startBenchmark());
    feedback("countdown");
  }, [apply, feedback]);
  useKeepTimerAwake(
    run.phase === "countdown" || run.phase === "running",
    "breakaway-benchmark",
  );
  useEffect(() => {
    mounted.current = true;
    const id = setInterval(() => {
      if (!mounted.current || AppState.currentState !== "active") return;
      const previous = ref.current;
      const result = tickBenchmark(previous);
      if (result.run === previous) return;
      ref.current = result.run;
      if (
        previous.phase !== result.run.phase ||
        Math.ceil(previous.remaining) !== Math.ceil(result.run.remaining)
      ) {
        setRun(result.run);
        if (previous.phase === "countdown" && result.run.phase === "running")
          feedback("start");
        else if (previous.phase === "countdown" && result.run.phase === "countdown")
          feedback("countdown");
      }
      for (const signal of result.signals) feedback(signal);
    }, 100);
    const sub = AppState.addEventListener("change", (status) => {
      if (status !== "active" && ["countdown", "running"].includes(ref.current.phase))
        cancel();
    });
    return () => {
      mounted.current = false;
      ref.current = cancelBenchmark(ref.current);
      clearInterval(id);
      sub.remove();
    };
  }, [apply, cancel, feedback]);
  return { run, start, cancel };
}
