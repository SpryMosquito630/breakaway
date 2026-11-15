/** Keyboard seeking shares the loaded/valid-clip gate with touch controls. */
export function keyboardClipSeek(
  key: string,
  time: number,
  duration: number,
  usable: boolean,
): number | null {
  if (!usable || !Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0)
    return null;
  const target =
    key === "ArrowLeft"
      ? time - 1
      : key === "ArrowRight"
        ? time + 1
        : key === "Home"
          ? 0
          : key === "End"
            ? duration
            : null;
  return target === null ? null : Math.max(0, Math.min(duration, target));
}
