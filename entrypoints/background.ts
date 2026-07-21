import { defineBackground } from "wxt/utils/define-background";
import { providers, getProvidersForType } from "@/lib/registry";
import { CACHE_TTL_MS, cacheKey } from "@/lib/cache";
import { log, loadLogLevel, watchLogLevel } from "@/lib/logger";
import type { LookupRequest, RatingResult } from "@/lib/types";

export default defineBackground(async () => {
  await loadLogLevel();
  watchLogLevel();

  log.info("Background started", { providers: providers.map((p) => p.id) });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "LOOKUP") {
      handleLookupAll(msg.request as LookupRequest).then(sendResponse);
      return true;
    }
  });
});

function errorResult(providerId: string, providerName: string, providerIcon: string, error: string): RatingResult {
  return { providerId, rating: null, userRatingCount: null, url: null, displayName: null, providerName, providerIcon, error };
}

async function handleLookupAll(request: LookupRequest): Promise<RatingResult[]> {
  const matching = getProvidersForType(request.resourceType);
  if (matching.length === 0) {
    log.warn("No providers found for resource type", request.resourceType);
    return [errorResult("unknown", "unknown", "", "NO_PROVIDER")];
  }

  log.debug(`Lookup "${request.name}"`, {
    providers: matching.map((p) => p.id),
    city: request.city,
  });

  const results = await Promise.all(
    matching.map((provider) => lookupSingle(provider, request)),
  );

  return results;
}

async function lookupSingle(
  provider: typeof providers[number],
  request: LookupRequest,
): Promise<RatingResult> {
  const key = cacheKey(provider.id, request.name, request.city);

  // Check cache
  const cached = await chrome.storage.local.get(key);
  if (cached[key]) {
    const entry = cached[key] as { data: RatingResult; ts: number };
    if (Date.now() - entry.ts < CACHE_TTL_MS) {
      // Backfill providerId for entries cached before this field existed
      entry.data.providerId ??= provider.id;
      log.debug(`Cache hit "${request.name}" [${provider.id}]`, { rating: entry.data.rating });
      return entry.data;
    }
    log.debug(`Cache expired "${request.name}" [${provider.id}]`);
  }

  // Get API key (skip for providers that don't need one)
  let apiKey = "";
  if (provider.apiKeySettingName) {
    const keys = await chrome.storage.sync.get(provider.apiKeySettingName);
    apiKey = keys[provider.apiKeySettingName] as string ?? "";
    if (!apiKey) {
      log.warn(`No API key configured for ${provider.name}`);
      return errorResult(provider.id, provider.name, provider.icon, "NO_API_KEY");
    }
  }

  try {
    const result = await provider.lookup(request, apiKey);
    log.info(`${provider.name} lookup "${request.name}"`, {
      rating: result.rating,
      reviews: result.userRatingCount,
      error: result.error,
    });
    await chrome.storage.local.set({
      [key]: { data: result, ts: Date.now() },
    });
    return result;
  } catch (err) {
    log.error(`${provider.name} lookup failed for "${request.name}"`, err);
    return errorResult(provider.id, provider.name, provider.icon, "NETWORK_ERROR");
  }
}
