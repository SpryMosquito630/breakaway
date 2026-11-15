// Age-independent. Processing intent comes from an explicitly disclosed capture action.
export const bodyTrackingDefaults = { enabled: true, consent: false } as const;

export function canStartBodyTracking({
  usable,
  busy,
}: {
  usable: boolean;
  busy: boolean;
}) {
  return usable && !busy;
}

/** One automatic attempt per selected clip; failures/cancellations need explicit retry. */
export function createShotTrackingStart(analyzeOnLoad: boolean) {
  let attempted = false;
  return {
    automatic({
      usable,
      busy,
      focused,
      picking,
    }: {
      usable: boolean;
      busy: boolean;
      focused: boolean;
      picking: boolean;
    }) {
      if (
        !analyzeOnLoad ||
        attempted ||
        !focused ||
        picking ||
        !canStartBodyTracking({ usable, busy })
      )
        return false;
      attempted = true;
      return true;
    },
    manual() {
      attempted = true;
    },
  };
}

/** @deprecated Legacy explicit-consent flow; new capture actions carry processing intent. */
export function canAnalyzeBody({
  consent,
  usable,
  busy,
}: {
  consent: boolean;
  usable: boolean;
  busy: boolean;
}) {
  return consent && canStartBodyTracking({ usable, busy });
}
