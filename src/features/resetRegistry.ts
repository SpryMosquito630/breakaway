const resets = new Map<string, () => Promise<void>>();

export function registerFeatureReset(key: string, reset: () => Promise<void>) {
  resets.set(key, reset);
  return () => { if (resets.get(key) === reset) resets.delete(key); };
}

export async function resetFeatureStores() {
  const results = await Promise.allSettled([...resets.values()].map((reset) => reset()));
  if (results.some((result) => result.status === "rejected"))
    throw new Error("Some local data could not be cleared. Keep the app open and try again.");
}
