import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  finishAssessment,
  readyAssessment,
  startAssessment,
  tickAssessment,
  type AssessmentRun,
} from "../domain/assessments";
import { useKeepTimerAwake, useTimerFeedback } from "./useTimerFeedback";
export function useAssessmentClock(duration: number | null, maxElapsed?: number) {
  const [timedOut, setTimedOut] = useState(false);
  const [run, setRun] = useState(readyAssessment);
  const ref = useRef(run);
  const feedback = useTimerFeedback();
  const apply = useCallback((next: AssessmentRun) => {
    ref.current = next;
    setRun(next);
  }, []);
  const cancel = useCallback(
    () => apply({ ...readyAssessment(), phase: "cancelled" }),
    [apply],
  );
  const start = useCallback(() => {
    setTimedOut(false);
    apply(startAssessment(Date.now()));
    feedback("countdown");
  }, [apply, feedback]);
  const finish = useCallback(() => {
    const next = finishAssessment(ref.current, Date.now());
    if (next !== ref.current) {
      apply(next);
      feedback("finish");
    }
  }, [apply, feedback]);
  useKeepTimerAwake(
    run.phase === "countdown" || run.phase === "running",
    "breakaway-assessment",
  );
  useEffect(() => {
    const timer = setInterval(() => {
      if (AppState.currentState !== "active") return;
      const previous = ref.current;
      const result = tickAssessment(previous, duration, Date.now());
      if (result.run === previous) return;
      if (maxElapsed !== undefined && result.run.elapsed > maxElapsed) {
        setTimedOut(true);
        cancel();
        return;
      }
      apply(result.run);
      if (
        previous.phase === "countdown" &&
        result.run.phase === "countdown" &&
        previous.remaining !== result.run.remaining
      )
        feedback("countdown");
      result.signals.forEach(feedback);
    }, 50);
    const sub = AppState.addEventListener("change", (status) => {
      if (status !== "active" && ["running", "countdown"].includes(ref.current.phase))
        cancel();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [apply, cancel, duration, feedback, maxElapsed]);
  return { run, start, cancel, finish, timedOut };
}
