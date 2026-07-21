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
  ],
  cssInjectionMode: "manifest",
  runAt: "document_idle",

  async main() {
    await loadLogLevel();
    watchLogLevel();

    const site = getActiveSite();
    if (!site) {
      log.debug("No matching site adapter for", location.hostname);
      return;
    }

    log.info(`Site detected: ${site.id}`);

    const { cardSelector, getCity, getName, getAddress, getInjectionAnchor, insertBadge, resourceType } = site;

    await loadFilterSettings();
    watchFilterChanges(applyFiltersToAll);

    // ── In-memory results cache ────────────────────────────────────
    // Prevents blinking on SPA re-renders: if we already fetched ratings
    // for a title, inject badges synchronously without placeholder.

    const resultsCache = new Map<string, RatingResult[]>();

    function cleanBadges(card: Element): void {
      card.querySelectorAll(".lbn-badge, .lbn-overlay-container").forEach((el) => el.remove());
      card.parentElement
        ?.querySelectorAll(":scope > .lbn-badge, :scope > .lbn-overlay-container")
        .forEach((el) => el.remove());
    }

    function injectBadges(card: Element, anchor: Element, results: RatingResult[]): void {
      cleanBadges(card);

      for (const result of results) {
        insertBadge(anchor, createBadge(result));
      }

      // Store results for per-provider filtering
      (card as HTMLElement).dataset.lbnResults = JSON.stringify(results);

      applyFilter(card);
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
      const city = getCity();
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
      const name = getName(card);
      if (!name) return;

      const anchor = getInjectionAnchor(card);
      if (!anchor) return;

      // If we already have results for this title, inject instantly
      const cached = resultsCache.get(name);
      if (cached) {
        log.debug(`Memory cache hit "${name}"`);
        injectBadges(card, anchor, cached);
        return;
      }

      const address = getAddress?.(card) ?? null;

      cleanBadges(card);
      const placeholder = document.createElement("div");
      placeholder.className = "lbn-badge lbn-badge--loading";
      placeholder.textContent = "Loading...";
      insertBadge(anchor, placeholder);

      const request: LookupRequest = { name, city, address, resourceType };

      chrome.runtime.sendMessage({ type: "LOOKUP", request }).then(
        (results: RatingResult[]) => {
          if (!results || !Array.isArray(results)) {
            log.error(`No response for "${name}"`);
            placeholder.textContent = "Error";
            placeholder.classList.add("lbn-badge--error");
            return;
          }

          // Store in memory cache
          resultsCache.set(name, results);

          for (const r of results) {
            if (r.error) {
              log.warn(`${r.providerName} error for "${name}":`, r.error);
            }
          }

          // Remove placeholder and inject all badges via shared function
          placeholder.remove();
          injectBadges(card, anchor, results);
        },
      );
    }

    // ── DOM scanning ──────────────────────────────────────────────

    let scanScheduled = false;

    function scanForNewCards(): void {
      const cards = document.querySelectorAll(
        `${cardSelector}:not([data-lbn-done])`,
      );
      if (cards.length === 0) return;

      log.debug(`Found ${cards.length} new cards`);

      for (const card of cards) {
        card.setAttribute("data-lbn-done", "true");

        // If this title was already fetched, inject immediately (no visibility wait)
        const name = getName(card);
        const anchor = name ? getInjectionAnchor(card) : null;
        const cached = name ? resultsCache.get(name) : undefined;

        if (cached && anchor) {
          log.debug(`Instant inject "${name}" (re-rendered card)`);
          injectBadges(card, anchor, cached);
        } else {
          visibilityObserver.observe(card);
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

    // Initial scan
    scanForNewCards();

    // Watch for new cards (infinite scroll, SPA navigation)
    const mutationObserver = new MutationObserver(scheduleScan);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  },
});
