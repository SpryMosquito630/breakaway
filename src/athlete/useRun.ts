import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import { appendPoint, elapsed, id, Point, routeDistance, today } from "./domain";
import { athleteStore } from "./store";
import { registerFeatureReset } from "../features/localStore";
export function useRun() {
  const store = athleteStore.useStore();
  const [points, setPoints] = useState<Point[]>([]),
    [seconds, setSeconds] = useState(0),
    [status, setStatus] = useState<"idle" | "starting" | "running" | "paused">("idle"),
    [message, setMessage] = useState("");
  const ref = useRef({
    token: 0,
    started: 0,
    base: 0,
    segment: 0,
    points: [] as Point[],
    watch: null as Location.LocationSubscription | null,
    running: false,
  });
  function pause(reason = "Paused. Resume when you are ready.") {
    const r = ref.current;
    r.token++;
    r.watch?.remove();
    r.watch = null;
    if (r.running) {
      r.base += elapsed(r.started, Date.now());
      setSeconds(r.base);
    }
    r.running = false;
    setStatus(r.base || r.points.length ? "paused" : "idle");
    setMessage(reason);
  }
  useEffect(() => {
    const unregister = registerFeatureReset("athlete-live-run", async () => {
      discard();
    });
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") pause("Paused while the app was in the background.");
    });
    const t = setInterval(() => {
      const r = ref.current;
      if (r.running) setSeconds(r.base + elapsed(r.started, Date.now()));
    }, 300);
    return () => {
      clearInterval(t);
      sub.remove();
      unregister();
      ref.current.token++;
      ref.current.watch?.remove();
    };
  }, []);
  async function start() {
    if (!store.ready || status === "starting" || status === "running") return;
    const r = ref.current,
      token = ++r.token;
    setStatus("starting");
    setMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (token !== r.token) return;
      if (permission.status !== "granted")
        throw new Error(
          "Location permission was declined. You can enable it in device settings.",
        );
      if (!(await Location.hasServicesEnabledAsync()))
        throw new Error("Turn on location services and try again.");
      if (token !== r.token) return;
      r.segment++;
      const segment = r.segment;
      const watch = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 3,
        },
        (position) => {
          if (token !== r.token || !r.running) return;
          const p = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: position.timestamp,
            accuracy: position.coords.accuracy ?? 999,
            segment,
          };
          const next = appendPoint(r.points, p);
          if (next !== r.points) {
            r.points = next;
            setPoints(next);
          }
          if (next.length >= 5000)
            pause("Route sample limit reached. Save this run and start another.");
        },
      );
      if (token !== r.token) {
        watch.remove();
        return;
      }
      r.watch = watch;
      r.started = Date.now();
      r.running = true;
      setStatus("running");
      setMessage("GPS estimates may vary. Keep your phone secure and use a safe route.");
    } catch (e) {
      if (token === r.token) {
        setStatus(r.base || r.points.length ? "paused" : "idle");
        setMessage(
          e instanceof Error ? e.message : "GPS could not start. Try again outdoors.",
        );
      }
    }
  }
  async function save() {
    pause("");
    const r = ref.current;
    if (r.base < 1) {
      setMessage("Record at least one second before saving.");
      return;
    }
    const run = {
      id: id(),
      date: today(),
      seconds: r.base,
      meters: routeDistance(r.points),
      points: r.points,
    };
    if (await store.update((d) => ({ ...d, runs: [...d.runs, run].slice(-1000) }))) {
      r.base = 0;
      r.points = [];
      setPoints([]);
      setSeconds(0);
      setStatus("idle");
      setMessage("Run saved on this device.");
    }
  }
  function discard() {
    pause("");
    ref.current.base = 0;
    ref.current.points = [];
    setPoints([]);
    setSeconds(0);
    setStatus("idle");
  }
  return {
    points,
    seconds,
    status,
    message,
    start,
    pause,
    save,
    discard,
    meters: routeDistance(points),
    store,
  };
}
