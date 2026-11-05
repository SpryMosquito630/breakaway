import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { Active, pause, tick, tickWithSignals } from "../domain/model";
import { useApp } from "../state/AppState";
import { useKeepTimerAwake, useTimerFeedback } from "./useTimerFeedback";
export function usePracticeClock() {
  const { data, update, checkpointActive } = useApp();
  const [active, setActive] = useState(data.active);
  const ref = useRef(active);
  const checkpointAt = useRef(Date.now());
  const feedback = useTimerFeedback();
  useKeepTimerAwake(active?.running === true, "breakaway-practice");
  const commit = useCallback(
    (next: Active | null) => {
      ref.current = next;
      setActive(next);
      checkpointAt.current = Date.now();
      update((st) => ({ ...st, active: next }));
    },
    [update],
  );
  const current = useCallback(
    () => (ref.current ? tick(ref.current) : null),
    [],
  );
  const pauseCurrent = useCallback(() => {
    const a = ref.current;
    if (!a) return null;
    const stopped = pause(a);
    commit(stopped);
    return stopped;
  }, [commit]);
  useEffect(() => {
    const incoming = data.active;
    const local = ref.current;
    if (incoming === local) return;
    if (
      incoming &&
      local &&
      incoming.id === local.id &&
      incoming.index === local.index &&
      incoming.ids[incoming.index] === local.ids[local.index] &&
      incoming.running &&
      local.running &&
      incoming.last < local.last
    )
      return;
    ref.current = incoming;
    setActive(incoming);
  }, [data.active]);
  useEffect(() => {
    const id = setInterval(() => {
      const a = ref.current;
      if (!a?.running || AppState.currentState !== "active") return;
      const now = Date.now();
      const result = tickWithSignals(a, now);
      ref.current = result.active;
      setActive((previous) =>
        !previous ||
        Math.ceil(previous.remaining) !== Math.ceil(result.active.remaining) ||
        previous.running !== result.active.running ||
        previous.warningSent !== result.active.warningSent ||
        previous.finishSent !== result.active.finishSent
          ? result.active
          : previous,
      );
      if (result.signals.length) {
        commit(result.active);
        for (const signal of result.signals) feedback(signal);
      } else if (now - checkpointAt.current >= 5000) {
        checkpointAt.current = now;
        checkpointActive(result.active);
      }
    }, 200);
    const sub = AppState.addEventListener("change", (status) => {
      if (status !== "active" && ref.current?.running) pauseCurrent();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [commit, checkpointActive, feedback, pauseCurrent]);
  return { active, current, commit, pauseCurrent };
}
