import { validCoachPair, type CoachPair } from "./pairing";

export type ShotReviewPreparation<Service> =
  | { status: "ready"; service: Service }
  | { status: "connection_required" | "service_unavailable" | "restore_failed" };

function stopped() {
  const error = new Error("Review stopped.");
  error.name = "AbortError";
  return error;
}

/** Settle on cancellation even when protected storage or account restoration hangs. */
export function waitForShotTask<T>(
  signal: AbortSignal,
  task: () => Promise<T>,
): Promise<T> {
  if (signal.aborted) return Promise.reject(stopped());
  return new Promise((resolve, reject) => {
    const abort = () => reject(stopped());
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve()
      .then(() => {
        if (signal.aborted) throw stopped();
        return task();
      })
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

/** Capability and authorization are different outcomes; neither grants access. */
export async function prepareShotReviewConnection<
  Service extends {
    base: string;
    shotReviewAvailable?: boolean;
  },
>(
  service: Service,
  dependencies: {
    readPair: () => Promise<unknown>;
    restorePair: (service: Service, pair: CoachPair) => Service;
    signedIn: () => Promise<boolean>;
    pairingEnabled: boolean;
    now?: () => number;
  },
  signal: AbortSignal,
): Promise<ShotReviewPreparation<Service>> {
  if (signal.aborted) throw stopped();
  if (!service.shotReviewAvailable) return { status: "service_unavailable" };
  try {
    return await waitForShotTask(signal, async () => {
      if (dependencies.pairingEnabled) {
        const pair = await dependencies.readPair();
        if (signal.aborted) throw stopped();
        if (validCoachPair(pair, service.base, dependencies.now?.()))
          return {
            status: "ready",
            service: dependencies.restorePair(service, pair),
          } as const;
      }
      if (signal.aborted) throw stopped();
      const signedIn = await dependencies.signedIn();
      if (signal.aborted) throw stopped();
      return signedIn
        ? ({ status: "ready", service } as const)
        : ({ status: "connection_required" } as const);
    });
  } catch (error) {
    if (signal.aborted) throw error;
    return { status: "restore_failed" };
  }
}

/** An AI failure must finish its own busy state before ordinary tracking starts. */
export async function reviewThenTrack<P>(options: {
  signal: AbortSignal;
  review: (() => Promise<P | null>) | null;
  track: () => Promise<P>;
  onReviewError: (error: unknown) => void;
  onReviewSettled: () => void;
}): Promise<P> {
  let pose: P | null = null;
  if (options.review) {
    try {
      pose = await waitForShotTask(options.signal, options.review);
    } catch (error) {
      if (options.signal.aborted) throw error;
      options.onReviewError(error);
    } finally {
      options.onReviewSettled();
    }
  }
  return pose ?? waitForShotTask(options.signal, options.track);
}
