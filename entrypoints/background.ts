import { defineBackground } from "wxt/utils/define-background";
import { providers, getProvidersForType, getProvidersMeta, getSiteForHostname } from "@/lib/registry";
import { CACHE_TTL_MS, cacheKey } from "@/lib/cache";
import { log, loadLogLevel, watchLogLevel } from "@/lib/logger";
import { providerStateStorageKeys, resolveProviderState, resolveAllProviderStates } from "@/lib/provider-state";
import type { LookupRequest, RatingResult, ResourceType } from "@/lib/types";

const providersMeta = getProvidersMeta();

const ICONS_ENABLED = {
  16: "icons/icon16.png",
  48: "icons/icon48.png",
  128: "icons/icon128.png",
};

const ICONS_DISABLED = {
  16: "icons/icon-disabled16.png",
  48: "icons/icon-disabled48.png",
  128: "icons/icon-disabled128.png",
};

function updateIcon(isEnabled: boolean): void {
  chrome.action.setIcon({ path: isEnabled ? ICONS_ENABLED : ICONS_DISABLED });
}

export default defineBackground(async () => {
  await loadLogLevel().catch(() => {});
  watchLogLevel();

  log.info("Background started", { providers: providers.map((p) => p.id) });

  // Open settings page on first install
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      chrome.runtime.openOptionsPage();
    }
  });

  // Set initial icon state
  const { lbnEnabled } = await chrome.storage.sync.get("lbnEnabled");
  updateIcon(lbnEnabled !== false);

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "LOOKUP") {
      handleLookupAll(msg.request as LookupRequest)
        .then(sendResponse)
        .catch(() => sendResponse([]));
      return true;
    }
    if (msg.type === "SITE_STATUS") {
      chrome.storage.session.set({
        [`siteStatus:${msg.siteId}`]: {
          cardsFound: msg.cardsFound,
          url: msg.url,
          ts: Date.now(),
        },
      }).catch(() => {});
    }
  });

  // ── Badge count on tab changes ──

  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url) {
        const site = getSiteForHostname(new URL(tab.url).hostname);
        if (site) {
          await updateBadgeCount(tabId, site.resourceType);
        } else {
          chrome.action.setBadgeText({ text: "", tabId });
        }
      }
    } catch { /* tab may be invalid */ }
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
      const site = getSiteForHostname(new URL(tab.url).hostname);
      if (site) {
        await updateBadgeCount(tabId, site.resourceType);
      } else {
        chrome.action.setBadgeText({ text: "", tabId });
      }
    }
  });

  // ── Refresh badge when provider states or API keys change ──

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;

    if (changes.lbnEnabled != null) {
      updateIcon(changes.lbnEnabled.newValue !== false);
    }

    const relevant = Object.keys(changes).some(
      (k) =>
        k.startsWith("provider:") ||
        k === "lbnEnabled" ||
        providersMeta.some((p) => p.apiKeySettingName === k),
    );

    if (relevant) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.id && tab.url) {
          try {
            const site = getSiteForHostname(new URL(tab.url).hostname);
            if (site) {
              updateBadgeCount(tab.id, site.resourceType);
            } else {
              chrome.action.setBadgeText({ text: "", tabId: tab.id });
            }
          } catch { /* invalid URL */ }
        }
      }).catch(() => {});
    }
  });
});

// ── Badge count ──

async function updateBadgeCount(
  tabId: number,
  resourceType: ResourceType,
): Promise<void> {
  const storageData = await chrome.storage.sync.get(
    [...providerStateStorageKeys(providersMeta), "lbnEnabled"],
  );

  if (storageData.lbnEnabled === false) {
    chrome.action.setBadgeText({ text: "", tabId });
    return;
  }

  const matching = providersMeta.filter((p) => p.supportedTypes.includes(resourceType));
  const states = resolveAllProviderStates(matching, storageData);

  let activeCount = 0;
  for (const state of states.values()) {
    if (state.active) activeCount++;
  }

  chrome.action.setBadgeText({ text: activeCount > 0 ? String(activeCount) : "", tabId });
  chrome.action.setBadgeBackgroundColor({ color: "#00CCBC", tabId });
}

// ── Lookup ──

function errorResult(providerId: string, providerName: string, providerIcon: string, error: string): RatingResult {
  return { providerId, rating: null, userRatingCount: null, url: null, displayName: null, providerName, providerIcon, error };
}

async function handleLookupAll(request: LookupRequest): Promise<RatingResult[]> {
  const matching = getProvidersForType(request.resourceType);
  if (matching.length === 0) {
    log.warn("No providers found for resource type", request.resourceType);
    return [];
  }

  // Load provider states and filter to active only
  const stateKeys = providerStateStorageKeys(matching);
  const storageData = await chrome.storage.sync.get(stateKeys);
  const activeProviders = matching.filter((p) => resolveProviderState(p, storageData).active);

  log.debug(`Lookup "${request.name}"`, {
    allProviders: matching.map((p) => p.id),
    activeProviders: activeProviders.map((p) => p.id),
    city: request.city,
  });

  if (activeProviders.length === 0) {
    return [];
  }

  const results = await Promise.all(
    activeProviders.map((provider) => lookupSingle(provider, request)),
  );

  return results;
}

async function lookupSingle(
  provider: typeof providers[number],
  request: LookupRequest,
): Promise<RatingResult> {
  try {
    return await doLookup(provider, request);
  } catch (err) {
    log.error(`${provider.name} lookup failed for "${request.name}"`, err);
    return errorResult(provider.id, provider.name, provider.icon, "NETWORK_ERROR");
  }
}

async function doLookup(
  provider: typeof providers[number],
  request: LookupRequest,
): Promise<RatingResult> {
  const key = cacheKey(provider.id, request.name, request.city);

  // Check cache
  try {
    const cached = await chrome.storage.local.get(key);
    if (cached[key]) {
      const entry = cached[key] as { data: RatingResult; ts: number };
      if (Date.now() - entry.ts < CACHE_TTL_MS) {
        entry.data.providerId ??= provider.id;
        log.debug(`Cache hit "${request.name}" [${provider.id}]`, { rating: entry.data.rating });
        return entry.data;
      }
      log.debug(`Cache expired "${request.name}" [${provider.id}]`);
    }
  } catch {
    // Cache read failed — proceed without cache
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

  const result = await provider.lookup(request, apiKey);

  log.info(`${provider.name} lookup "${request.name}"`, {
    rating: result.rating,
    reviews: result.userRatingCount,
    error: result.error,
  });

  // Cache result (best-effort)
  try {
    await chrome.storage.local.set({
      [key]: { data: result, ts: Date.now() },
    });
  } catch {
    // Cache write failed — non-fatal
  }

  return result;
}
