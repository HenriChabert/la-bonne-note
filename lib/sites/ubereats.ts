import type { SiteAdapter } from "../types";

export const ubereats: SiteAdapter = {
  id: "ubereats",
  hostPattern: "ubereats",
  resourceType: "restaurant",
  match: () => location.hostname.includes("ubereats"),
  cardSelector: 'li[data-testid="carousel-slide"]',

  getName: (card) => {
    const h3 = card.querySelector("h3");
    if (h3) return h3.textContent!.trim();
    const titleDiv = card
      .querySelector('[data-testid="rich-text"]')
      ?.parentElement?.querySelector("div");
    return titleDiv?.textContent?.trim() ?? null;
  },

  getCity: () => {
    const m = location.pathname.match(/\/(?:city|feed)\?.*pl=(.+?)&/);
    if (m) return decodeURIComponent(m[1]);
    const addrEl = document.querySelector('[data-testid="address-label"]');
    if (addrEl) {
      const parts = addrEl.textContent!.split(",");
      return parts[parts.length - 1]?.trim() || "Paris";
    }
    return "Paris";
  },

  getInjectionAnchor: (card) => card,

  insertBadge: (_anchor, badge) => _anchor.appendChild(badge),
};
