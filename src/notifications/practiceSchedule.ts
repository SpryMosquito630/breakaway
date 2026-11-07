import { practiceDeadline } from "../domain/practiceClock";
import type { Active } from "../domain/model";

export const PRACTICE_NOTIFICATION_ID = "breakaway-practice-block-v1";
export interface PracticeNotifier {
  cancel(): Promise<void>;
  schedule(deadline: number): Promise<void>;
}
/** Serialize native work and invalidate pending schedules immediately on every new intent. */
export function createPracticeNotifier(api: PracticeNotifier, now = Date.now, onError?: (error: unknown) => void) {
  let generation = 0;
  let tail: Promise<void> = Promise.resolve();
  let desiredKey = "";
  return {
    sync(active: Active | null) {
      const deadline = practiceDeadline(active);
      const key = deadline === null ? "off" : `${active!.id}:${active!.index}:${deadline}`;
      if (key === desiredKey) return tail;
      desiredKey = key;
      const revision = ++generation;
      const work = async () => {
        await api.cancel();
        if (revision !== generation || deadline === null || deadline <= now()) return;
        await api.schedule(deadline);
        // A pause/reset may arrive while the native scheduler is still resolving.
        if (revision !== generation) await api.cancel();
      };
      tail = tail.then(work, work).catch(error => {
        if (revision === generation) desiredKey = "";
        onError?.(error);
      });
      return tail;
    },
    settled: () => tail,
  };
}
