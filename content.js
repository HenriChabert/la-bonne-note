(() => {
  const DEBOUNCE_MS = 150;
  const BATCH_DELAY_MS = 50;
  let debounceTimer = null;

  // ── Filter settings (loaded from storage) ──────────────────────

  let filterMinRating = 0;
  let filterMinReviews = 0;
  let filterMode = "dim"; // "dim" or "hide"

  function loadFilterSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        ["filterMinRating", "filterMinReviews", "filterMode"],
        (s) => {
          filterMinRating = s.filterMinRating || 0;
          filterMinReviews = s.filterMinReviews || 0;
          filterMode = s.filterMode || "dim";
          resolve();
        }
      );
    });
  }

  // Re-apply filters live when settings change (no page reload needed)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.filterMinRating) filterMinRating = changes.filterMinRating.newValue || 0;
    if (changes.filterMinReviews) filterMinReviews = changes.filterMinReviews.newValue || 0;
    if (changes.filterMode) filterMode = changes.filterMode.newValue || "dim";
    applyFiltersToAll();
  });

  // ── Site adapters ──────────────────────────────────────────────

  const SITES = {
    deliveroo: {
      match: () => location.hostname.includes("deliveroo"),
      cardSelector: 'a[data-testid="partner-card"]',
      getName: (card) =>
        card.querySelector('[data-testid="partner-name"]')?.textContent?.trim(),
      getCity: () => {
        const m = location.pathname.match(
          /\/(?:restaurants|menu)\/([^/]+)/i
        );
        return m ? decodeURIComponent(m[1]).replace(/-/g, " ") : "Paris";
      },
      getInjectionAnchor: (card) =>
        card.querySelector('[data-testid="sponsored-rating-distance"]') ||
        card.querySelector('[data-testid="content"]'),
      insertBadge: (anchor, badge) =>
        anchor.parentNode.insertBefore(badge, anchor.nextSibling),
    },

    ubereats: {
      match: () => location.hostname.includes("ubereats"),
      cardSelector: 'li[data-testid="carousel-slide"]',
      getName: (card) => {
        const h3 = card.querySelector("h3");
        if (h3) return h3.textContent.trim();
        const titleDiv = card.querySelector(
          '[data-testid="rich-text"]'
        )?.parentElement?.querySelector("div");
        return titleDiv?.textContent?.trim() || null;
      },
      getCity: () => {
        const m = location.pathname.match(
          /\/(?:city|feed)\?.*pl=(.+?)&/
        );
        if (m) return decodeURIComponent(m[1]);
        const addrEl = document.querySelector(
          '[data-testid="address-label"]'
        );
        if (addrEl) {
          const parts = addrEl.textContent.split(",");
          return parts[parts.length - 1]?.trim() || "Paris";
        }
        return "Paris";
      },
      getInjectionAnchor: (card) => card, // the li[carousel-slide] itself
      insertBadge: (card, badge) => card.appendChild(badge),
    },

    thefork: {
      match: () => location.hostname.includes("thefork"),
      cardSelector: 'a[id^="restaurant-"]',
      getName: (card) => card.getAttribute("aria-label")?.trim() || null,
      getCity: () => {
        // TheFork cards have full addresses, city extraction is a fallback
        const m = location.pathname.match(/\/restaurants\/([^/?]+)/i);
        return m ? decodeURIComponent(m[1]).replace(/[+-]/g, " ") : "Paris";
      },
      // TheFork cards include the address — pass it for better API matching
      getAddress: (card) =>
        card.querySelector('[data-testid="address"]')?.textContent?.trim() ||
        null,
      getInjectionAnchor: (card) =>
        card.querySelector('[data-testid="reviews"]') ||
        card.querySelector('[data-testid="rating"]'),
      insertBadge: (anchor, badge) =>
        anchor.parentNode.insertBefore(badge, anchor.nextSibling),
    },
  };

  // ── Detect active site ─────────────────────────────────────────

  const site = Object.values(SITES).find((s) => s.match());
  if (!site) return;

  // ── Filtering ──────────────────────────────────────────────────

  function applyFilter(card) {
    const rating = parseFloat(card.dataset.lbnRating);
    const reviews = parseInt(card.dataset.lbnReviews, 10);

    // Remove previous filter classes
    card.classList.remove("lbn-hidden", "lbn-dimmed");

    // Don't filter cards we have no data for
    if (isNaN(rating)) return;

    const belowRating = filterMinRating > 0 && rating < filterMinRating;
    const belowReviews = filterMinReviews > 0 && reviews < filterMinReviews;

    if (belowRating || belowReviews) {
      card.classList.add(filterMode === "hide" ? "lbn-hidden" : "lbn-dimmed");
    }
  }

  function applyFiltersToAll() {
    document.querySelectorAll("[data-lbn-done]").forEach(applyFilter);
  }

  // ── Badge creation (shared) ────────────────────────────────────

  function createBadge(data) {
    const badge = document.createElement("div");
    badge.className = "lbn-badge";

    if (data.error === "NO_API_KEY") {
      badge.classList.add("lbn-badge--error");
      badge.textContent = "Set API key in extension";
      return badge;
    }

    if (data.error) {
      badge.classList.add("lbn-badge--error");
      badge.textContent = "Google Maps: error";
      return badge;
    }

    if (data.rating === null) {
      badge.classList.add("lbn-badge--na");
      badge.textContent = "Google Maps: N/A";
      return badge;
    }

    const star = document.createElement("span");
    star.className = "lbn-star";
    star.textContent = "\u2605";

    const ratingText = document.createElement("span");
    ratingText.className = "lbn-rating";
    ratingText.textContent = data.rating.toFixed(1);

    const countText = document.createElement("span");
    countText.className = "lbn-count";
    countText.textContent = `(${data.userRatingCount})`;

    badge.appendChild(star);
    badge.appendChild(ratingText);
    badge.appendChild(countText);

    if (data.googleMapsUri) {
      badge.dataset.url = data.googleMapsUri;
      badge.classList.add("lbn-badge--link");
      // Use capture phase to intercept before the card's own click handlers
      badge.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          window.open(data.googleMapsUri, "_blank");
        },
        true
      );
      // Also block on the bubble phase for links wrapping the badge
      badge.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
      });
    }

    return badge;
  }

  // ── Card processing ────────────────────────────────────────────

  function processCards() {
    const selector = `${site.cardSelector}:not([data-lbn-done])`;
    const cards = document.querySelectorAll(selector);
    if (cards.length === 0) return;

    const city = site.getCity();

    cards.forEach((card, i) => {
      card.setAttribute("data-lbn-done", "true");

      const name = site.getName(card);
      if (!name) return;

      const address = site.getAddress?.(card) || null;

      const anchor = site.getInjectionAnchor(card);
      if (!anchor) return;

      const placeholder = document.createElement("div");
      placeholder.className = "lbn-badge lbn-badge--loading";
      placeholder.textContent = "Google Maps: ...";
      site.insertBadge(anchor, placeholder);

      setTimeout(() => {
        chrome.runtime.sendMessage(
          { type: "LOOKUP_RESTAURANT", name, city, address },
          (response) => {
            if (chrome.runtime.lastError) {
              placeholder.textContent = "Google Maps: error";
              placeholder.classList.add("lbn-badge--error");
              return;
            }

            // Store rating data on card for filtering
            if (response.rating != null) {
              card.dataset.lbnRating = response.rating;
              card.dataset.lbnReviews = response.userRatingCount || 0;
            }

            const badge = createBadge(response);
            placeholder.replaceWith(badge);

            // Apply filter to this card
            applyFilter(card);
          }
        );
      }, i * BATCH_DELAY_MS);
    });
  }

  // ── Run ────────────────────────────────────────────────────────

  loadFilterSettings().then(() => {
    processCards();

    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(processCards, DEBOUNCE_MS);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
