import { type CoachPair, validCoachPair } from "./pairing";

/** A credential comes only from an explicit private launch link, never public health. */
export function parseCoachInviteURL(url: unknown, now = Date.now()): CoachPair | null {
  if (typeof url !== "string" || url.length > 2048) return null;
  try {
    const parsed = new URL(url);
    if (
      !["exp:", "exps:", "http:", "https:"].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    )
      return null;
    if (!["/", "/--/coach-connect", "/coach-connect"].includes(parsed.pathname))
      return null;
    const parameters = new URLSearchParams(parsed.hash.slice(1));
    if (parameters.getAll("coachInvite").length !== 1) return null;
    const value = parameters.get("coachInvite") ?? "";
    const match = /^([A-Za-z0-9_-]{16,64})\.([A-Za-z0-9_-]{40,128})\.(\d{13})$/.exec(
      value,
    );
    if (!match) return null;
    const protocol =
      parsed.protocol === "exp:"
        ? /(?:\.on\.expo\.app|\.exp\.direct|\.ngrok(?:-free)?\.app)$/i.test(
            parsed.hostname,
          )
          ? "https:"
          : "http:"
        : parsed.protocol === "exps:"
          ? "https:"
          : parsed.protocol;
    const pair: CoachPair = {
      base: `${protocol}//${parsed.host}/api/replay`,
      kind: "invite",
      inviteId: match[1],
      token: match[2],
      expiresAt: Number(match[3]),
    };
    return validCoachPair(pair, pair.base, now) ? pair : null;
  } catch {
    return null;
  }
}

/** Subscribe before resolving the cold URL so a late cold result cannot undo a warm link. */
export function createCoachInviteCapture(
  accept: (pair: CoachPair) => void,
  now = () => Date.now(),
) {
  let warmSeen = false;
  let disposed = false;
  const acceptURL = (url: unknown) => {
    if (disposed) return false;
    const pair = parseCoachInviteURL(url, now());
    if (!pair) return false;
    accept(pair);
    return true;
  };
  return {
    cold(url: unknown) {
      return warmSeen ? false : acceptURL(url);
    },
    warm(url: unknown) {
      const accepted = acceptURL(url);
      if (accepted) warmSeen = true;
      return accepted;
    },
    dispose() {
      disposed = true;
    },
  };
}
