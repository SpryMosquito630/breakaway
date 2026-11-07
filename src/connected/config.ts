export type ConnectionConfig = { url: string; key: string };
export function readConnectionConfig(url?: string, key?: string): ConnectionConfig | null {
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || !key.startsWith('sb_publishable_')) return null;
    return { url: parsed.origin, key };
  } catch { return null; }
}
