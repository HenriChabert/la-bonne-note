import { defineContentScript } from "wxt/utils/define-content-script";
import "@/assets/content.css";
import { getActiveSite } from "@/lib/registry";
import { createBadge } from "@/lib/badge";
import {
  loadFilterSettings,
  watchFilterChanges,
  applyFilter,
  applyFiltersToAll,
} from "@/lib/filter";
import { log, loadLogLevel, watchLogLevel } from "@/lib/logger";
import type { LookupRequest, RatingResult } from "@/lib/types";

export default defineContentScript({
  matches: [
    "*://*.deliveroo.fr/*",
    "*://*.ubereats.com/*",
    "*://*.thefork.fr/*",
    "*://*.thefork.com/*",
    "*://*.netflix.com/*",
    "*://*.disneyplus.com/*",
    "*://*.canalplus.com/*",
    "*://*.primevideo.com/*",
    "*://*.amazon.fr/*/video/*",
    "*://*.amazon.com/*/video/*",
    "*://*.booking.com/*",
  ],
  cssInjectionMode: "manifest",
  runAt: "document_idle",

  async main() {
    try {
      await init();
    } catch {
      // Extension must never break the host page
    }
  },
});

async function init(): Promise<void> {
  await loadLogLevel().catch(() => {});
  watchLogLevel();

  const site = getActiveSite();
  if (!site) {
    log.debug("No matching site adapter for", location.hostname);
    return;
  }

  log.info(`Site detected: ${site.id}`);

  const { cardSelector, getCity, getName, getAddress, getInjectionAnchor, insertBadge, resourceType } = site;

  await loadFilterSettings().catch(() => {});
  watchFilterChanges(applyFiltersToAll);

  // ── In-memory results cache ────────────────────────────────────

  const resultsCache = new Map<string, RatingResult[]>();

  function cleanBadges(card: Element): void {
    card.querySelectorAll(".lbn-badge, .lbn-overlay-container").forEach((el) => el.remove());
    card.parentElement
      ?.querySelectorAll(":scope > .lbn-badge, :scope > .lbn-overlay-container")
      .forEach((el) => el.remove());
  }

  function injectBadges(card: Element, anchor: Element, results: RatingResult[]): void {
    try {
      cleanBadges(card);
      for (const result of results) {
        insertBadge(anchor, createBadge(result));
      }
      (card as HTMLElement).dataset.lbnResults = JSON.stringify(results);
      applyFilter(card);
    } catch (err) {
      log.debug("Badge injection failed", err);
    }
  }

  // ── Visibility-based lazy loading ──────────────────────────────

  const pendingCards = new Set<Element>();

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          pendingCards.add(entry.target);
          visibilityObserver.unobserve(entry.target);
        }
      }
      if (pendingCards.size > 0) {
        scheduleFetch();
      }
    },
    { rootMargin: "200px" },
  );

  // ── Throttled fetch queue ──────────────────────────────────────

  const BATCH_SIZE = 4;
  const BATCH_INTERVAL_MS = 100;
  let fetchTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleFetch(): void {
    if (fetchTimer) return;
    fetchTimer = setTimeout(processBatch, BATCH_INTERVAL_MS);
  }

  function processBatch(): void {
    fetchTimer = null;

    let city = "";
    try {
      city = getCity();
    } catch {
      // Non-fatal: city is just a search hint
    }

    const batch = Array.from(pendingCards).slice(0, BATCH_SIZE);

    for (const card of batch) {
      pendingCards.delete(card);
      fetchRatings(card, city);
    }

    if (pendingCards.size > 0) {
      scheduleFetch();
    }
  }

  function fetchRatings(card: Element, city: string): void {
    let name: string | null = null;
    let anchor: Element | null = null;

    try {
      name = getName(card);
      if (!name) return;
      anchor = getInjectionAnchor(card);
    } catch (err) {
      log.debug("Card extraction failed", err);
      return;
    }

    // If anchor isn't ready yet (e.g. async-loaded review section),
    // retry after a short delay to let the site finish rendering.
    if (!anchor) {
      const cached = resultsCache.get(name);
      if (cached) {
        const cardRef = card;
        const nameRef = name;
        setTimeout(() => {
          try {
            const retryAnchor = getInjectionAnchor(cardRef);
            if (retryAnchor) {
              injectBadges(cardRef, retryAnchor, cached);
            }
          } catch { /* skip */ }
        }, 500);
      }
      return;
    }

    // If we already have results for this title, inject instantly
    const cached = resultsCache.get(name);
    if (cached) {
      log.debug(`Memory cache hit "${name}"`);
      injectBadges(card, anchor, cached);
      return;
    }

    let address: string | null = null;
    try {
      address = getAddress?.(card) ?? null;
    } catch {
      // Non-fatal
    }

    cleanBadges(card);
    const placeholder = document.createElement("div");
    placeholder.className = "lbn-badge lbn-badge--loading";
    placeholder.textContent = "Loading...";

    try {
      insertBadge(anchor, placeholder);
    } catch {
      return;
    }

    const request: LookupRequest = { name, city, address, resourceType };

    chrome.runtime.sendMessage({ type: "LOOKUP", request }).then(
      (results: RatingResult[]) => {
        if (!results || !Array.isArray(results)) {
          // Silently remove placeholder — don't show error to user
          placeholder.remove();
          return;
        }

        resultsCache.set(name!, results);

        for (const r of results) {
          if (r.error) {
            log.warn(`${r.providerName} error for "${name}":`, r.error);
          }
        }

        placeholder.remove();
        injectBadges(card, anchor!, results);
      },
    ).catch(() => {
      // Extension context invalidated (update/reload) — just clean up
      placeholder.remove();
    });
  }

  // ── DOM scanning ──────────────────────────────────────────────

  let scanScheduled = false;

  function scanForNewCards(): void {
    // ── Process new cards ──
    const newCards = document.querySelectorAll(
      `${cardSelector}:not([data-lbn-done])`,
    );

    if (newCards.length > 0) {
      log.debug(`Found ${newCards.length} new cards`);
    }

    for (const card of newCards) {
      card.setAttribute("data-lbn-done", "true");

      try {
        const name = getName(card);
        const anchor = name ? getInjectionAnchor(card) : null;
        const cached = name ? resultsCache.get(name) : undefined;

        if (cached && anchor) {
          log.debug(`Instant inject "${name}" (re-rendered card)`);
          injectBadges(card, anchor, cached);
        } else {
          visibilityObserver.observe(card);
        }
      } catch {
        // Skip this card, observe it for later
        visibilityObserver.observe(card);
      }
    }

    // ── Repair badges removed by SPA internal re-renders ──
    // Cards that have data-lbn-done + cached results but no badges in the DOM.
    if (resultsCache.size > 0) {
      const processed = document.querySelectorAll(
        `${cardSelector}[data-lbn-done]`,
      );
      for (const card of processed) {
        if (card.querySelector(".lbn-badge, .lbn-overlay-container")) continue;
        try {
          const name = getName(card);
          if (!name) continue;
          const cached = resultsCache.get(name);
          if (!cached) continue;
          const anchor = getInjectionAnchor(card);
          if (!anchor) continue;
          log.debug(`Repairing badge "${name}"`);
          injectBadges(card, anchor, cached);
        } catch { /* skip */ }
      }
    }
  }

  function scheduleScan(): void {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(() => {
      scanScheduled = false;
      scanForNewCards();
    });
  }

  scanForNewCards();

  const mutationObserver = new MutationObserver(scheduleScan);
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}
