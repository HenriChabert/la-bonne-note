import type { FilterSettings, ProviderFilter, RatingResult } from "./types";

const FILTER_STORAGE_PREFIX = "filter:";
const FILTER_MODE_KEY = "filterMode";

let settings: FilterSettings = { providers: {}, mode: "dim" };

export function getFilterSettings(): FilterSettings {
  return settings;
}

export async function loadFilterSettings(): Promise<void> {
  const all = await chrome.storage.sync.get(undefined);
  const providers: Record<string, ProviderFilter> = {};

  for (const [key, value] of Object.entries(all)) {
    // Keys: "filter:<providerId>:minRating", "filter:<providerId>:minReviews"
    if (!key.startsWith(FILTER_STORAGE_PREFIX)) continue;
    const rest = key.slice(FILTER_STORAGE_PREFIX.length);
    const sepIdx = rest.lastIndexOf(":");
    if (sepIdx < 0) continue;

    const providerId = rest.slice(0, sepIdx);
    const field = rest.slice(sepIdx + 1);

    if (!providers[providerId]) {
      providers[providerId] = { minRating: 0, minReviews: 0 };
    }

    if (field === "minRating") providers[providerId].minRating = Number(value) || 0;
    if (field === "minReviews") providers[providerId].minReviews = Number(value) || 0;
  }

  settings = {
    providers,
    mode: (all[FILTER_MODE_KEY] as "dim" | "hide") || "dim",
  };
}

export function watchFilterChanges(onUpdate: () => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    let changed = false;

    for (const key of Object.keys(changes)) {
      if (key === FILTER_MODE_KEY) {
        settings.mode = changes[key].newValue || "dim";
        changed = true;
      }
      if (key.startsWith(FILTER_STORAGE_PREFIX)) {
        // Re-parse on any filter change
        loadFilterSettings().then(onUpdate).catch(() => {});
        return;
      }
    }

    if (changed) onUpdate();
  });
}

/**
 * Apply per-provider filtering to a card.
 * The card stores results as JSON in data-lbn-results.
 * A card is filtered if ANY provider's rating falls below its threshold.
 */
export function applyFilter(card: Element): void {
  card.classList.remove("lbn-hidden", "lbn-dimmed");

  const resultsJson = (card as HTMLElement).dataset.lbnResults;
  if (!resultsJson) return;

  let results: RatingResult[];
  try {
    results = JSON.parse(resultsJson);
  } catch {
    return;
  }

  let shouldFilter = false;

  for (const result of results) {
    if (result.rating == null) continue;
    const filter = settings.providers[result.providerId];
    if (!filter) continue;

    const belowRating = filter.minRating > 0 && result.rating < filter.minRating;
    const belowReviews = filter.minReviews > 0 && (result.userRatingCount || 0) < filter.minReviews;

    if (belowRating || belowReviews) {
      shouldFilter = true;
      break;
    }
  }

  if (shouldFilter) {
    card.classList.add(settings.mode === "hide" ? "lbn-hidden" : "lbn-dimmed");
  }
}

export function applyFiltersToAll(): void {
  document.querySelectorAll("[data-lbn-done]").forEach(applyFilter);
}

/** Build the storage key for a provider filter field */
export function filterStorageKey(providerId: string, field: "minRating" | "minReviews"): string {
  return `${FILTER_STORAGE_PREFIX}${providerId}:${field}`;
}
