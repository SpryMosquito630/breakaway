export type CoachPair = { base: string; token: string; expiresAt: number };

export function validCoachPair(
  value: unknown,
  base: string,
  now = Date.now(),
): value is CoachPair {
  const pair = value as Partial<CoachPair> | null;
  return Boolean(
    pair &&
    pair.base === base &&
    typeof pair.token === "string" &&
    /^[A-Za-z0-9_-]{40,128}$/.test(pair.token) &&
    typeof pair.expiresAt === "number" &&
    Number.isFinite(pair.expiresAt) &&
    pair.expiresAt > now &&
    pair.expiresAt <= now + 7200000,
  );
}

export function makeCoachPair(base: string, value: unknown, now = Date.now()): CoachPair {
  const reply = value as { pairToken?: unknown; expiresInSeconds?: unknown } | null;
  if (
    !reply ||
    typeof reply.expiresInSeconds !== "number" ||
    !Number.isInteger(reply.expiresInSeconds) ||
    reply.expiresInSeconds < 1 ||
    reply.expiresInSeconds > 7200
  )
    throw Error("Could not pair this device. Request a new pairing code.");
  const pair = {
    base,
    token: reply.pairToken,
    expiresAt: now + reply.expiresInSeconds * 1000,
  };
  if (!validCoachPair(pair, base, now))
    throw Error("Could not pair this device. Request a new pairing code.");
  return pair;
}
