// Availability is age-independent; enabling the overlay never grants upload consent.
export const bodyTrackingDefaults = { enabled: true, consent: false } as const;

export function canAnalyzeBody({
  consent,
  usable,
  busy,
}: {
  consent: boolean;
  usable: boolean;
  busy: boolean;
}) {
  return consent && usable && !busy;
}
