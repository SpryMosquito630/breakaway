/** Own only explicitly acquired browser object URLs; never revoke file or remote media. */
export function createClipUrlOwner(revoke: (uri: string) => void) {
  const owned = new Set<string>();
  return {
    acquire(uri: string) {
      if (uri.startsWith("blob:")) owned.add(uri);
    },
    release(uri: string) {
      if (owned.delete(uri)) revoke(uri);
    },
    clear() {
      const urls = [...owned];
      owned.clear();
      urls.forEach(revoke);
    },
  };
}

/** A synchronous lease guards asynchronous work before React can update a button. */
export function createClipSaveLease() {
  let active: AbortController | null = null;
  return {
    begin() {
      if (active) return null;
      active = new AbortController();
      return active;
    },
    finish(controller: AbortController) {
      if (active === controller) active = null;
    },
    cancel() {
      active?.abort();
    },
  };
}
