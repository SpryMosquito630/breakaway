import { advance, type Active } from "./model";

/** A rendered control may act only on the block it described to the player. */
export function samePracticeBlock(live: Active | null, expected: Active): live is Active {
  return Boolean(
    live &&
    live.id === expected.id &&
    live.index === expected.index &&
    typeof live.ids[live.index] === "string" &&
    live.ids[live.index] === expected.ids[expected.index],
  );
}

export function advancePractice(
  live: Active | null,
  visible: Active,
  skip = false,
  now = Date.now(),
): { kind: "advance" | "finish"; active: Active } | null {
  if (!live || !samePracticeBlock(live, visible)) return null;
  const active = advance(live, skip, Math.max(live.last, now));
  return { kind: active.index >= active.ids.length ? "finish" : "advance", active };
}
