/** A retry of the same clip/mode reuses its server result and quota reservation. */
export function createHostedOperationIds(uuid: () => string) {
  let clipId: string | null = null;
  const ids = new Map<string, string>();
  return (clip: string, mode: "shot-review" | "pose") => {
    if (clip !== clipId) {
      ids.clear();
      clipId = clip;
    }
    const id = ids.get(mode) ?? uuid();
    ids.set(mode, id);
    return id;
  };
}
