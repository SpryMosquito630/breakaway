import { validCoachPair } from "./pairing";

export class ServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
export type CoachRequestIdentity = { userId: string | null; pairRevision?: number };

/** Memory-only sharing scope: a paired grant and account are independent identities. */
export function coachConsentKey(service: {
  base: string;
  chatProvider?: string;
  chatMemoryAvailable?: boolean;
  coachIdentity?: string;
  chatPairToken?: string;
}) {
  return `chat-v2-${service.chatMemoryAvailable ? "memory" : "single"}|${service.base}|${service.chatProvider}|${service.coachIdentity ?? ""}|${service.chatPairToken ?? ""}`;
}

/** Never place provider HTML, objects or unbounded diagnostics into a UI message. */
export async function readServiceResponse<T>(response: {
  ok: boolean;
  json: () => Promise<unknown>;
}): Promise<T> {
  let value: unknown;
  try {
    value = await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ServiceError(
      "The analysis service returned an unreadable reply. Try again.",
      "invalid_response",
    );
  }
  if (!response.ok) {
    const error =
      value && typeof value === "object" && "error" in value ? value.error : null;
    const message =
      error && typeof error === "object" && "message" in error ? error.message : null;
    const code =
      error && typeof error === "object" && "code" in error ? error.code : null;
    throw new ServiceError(
      typeof message === "string" && message.trim() && message.length <= 500
        ? message.trim()
        : "The analysis service is unavailable. Try again.",
      typeof code === "string" && /^[a-z_]{1,80}$/.test(code) ? code : undefined,
    );
  }
  return value as T;
}

/** A rejection of an older pairing asks for fresh consent, not another stale code. */
export function coachRequestFailure(
  error: unknown,
  pairRevision: number | undefined,
  currentRevision: number,
): unknown {
  return error instanceof ServiceError &&
    error.code === "pair_required" &&
    pairRevision !== undefined &&
    pairRevision !== currentRevision
    ? new ServiceError(
        "Your private connection changed. Retry your question using the latest connection.",
        "pair_changed",
      )
    : error;
}

/** Synchronous final fence immediately before fetch; credential values never enter errors. */
export function assertCoachRequestIdentity(
  expected: CoachRequestIdentity,
  actual: {
    userId: string | null;
    pairRevision: number;
    pair: unknown;
    base: string;
    pairToken?: string;
    now?: number;
  },
) {
  if (expected.userId !== actual.userId)
    throw new ServiceError(
      "Your account changed. Retry your question to review sharing before using AI.",
      "account_changed",
    );
  if (
    expected.pairRevision !== undefined &&
    (expected.pairRevision !== actual.pairRevision ||
      !validCoachPair(actual.pair, actual.base, actual.now) ||
      actual.pair.token !== actual.pairToken)
  )
    throw new ServiceError(
      "Your private connection changed or expired. Retry your question to review sharing before using AI.",
      "pair_changed",
    );
}
