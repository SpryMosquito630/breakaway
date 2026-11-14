/** Minimal media port keeps pending-load cancellation testable without native modules. */
export function createDirectDemoPlayback<T>(
  player: {
    play: () => void;
    pause: () => void;
    replaceAsync: (source: T) => Promise<void>;
  },
  source: T,
  needsLoad: boolean,
) {
  let active = false;
  let disposed = false;
  let revision = 0;
  let loaded = !needsLoad;
  let loading: Promise<void> | undefined;
  return {
    setActive(next: boolean) {
      active = next;
      if (!next) {
        revision += 1;
        player.pause();
      }
    },
    pause() {
      revision += 1;
      player.pause();
    },
    async start(reload = false): Promise<boolean> {
      if (disposed || !active) return false;
      const ticket = ++revision;
      if (reload || !loaded) {
        if (!loading)
          loading = player
            .replaceAsync(source)
            .then(() => {
              loaded = true;
            })
            .finally(() => {
              loading = undefined;
            });
        await loading;
      }
      if (disposed || !active || ticket !== revision) return false;
      player.play();
      return true;
    },
    dispose() {
      disposed = true;
      revision += 1;
      player.pause();
    },
  };
}
