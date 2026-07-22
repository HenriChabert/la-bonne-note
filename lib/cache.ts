export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function cacheKey(providerId: string, name: string, city: string): string {
  return `lbn:${providerId}:${name}:${city}`.toLowerCase();
}

export async function clearProviderCache(providerId: string): Promise<number> {
  const prefix = `lbn:${providerId}:`;
  const all = await chrome.storage.local.get(undefined);
  const keys = Object.keys(all).filter((k) => k.startsWith(prefix));
  if (keys.length > 0) {
    await chrome.storage.local.remove(keys);
  }
  return keys.length;
}
