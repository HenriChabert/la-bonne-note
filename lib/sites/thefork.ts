import type { SiteAdapter } from "../types";

export const thefork: SiteAdapter = {
  id: "thefork",
  hostPattern: "thefork",
  resourceType: "restaurant",
  match: () => location.hostname.includes("thefork"),
  cardSelector: 'a[id^="restaurant-"]',

  getName: (card) => card.getAttribute("aria-label")?.trim() ?? null,

  getCity: () => {
    const m = location.pathname.match(/\/restaurants\/([^/?]+)/i);
    return m ? decodeURIComponent(m[1]).replace(/[+-]/g, " ") : "Paris";
  },

  getAddress: (card) =>
    card.querySelector('[data-testid="address"]')?.textContent?.trim() ?? null,

  getInjectionAnchor: (card) =>
    card.querySelector('[data-testid="reviews"]') ??
    card.querySelector('[data-testid="rating"]'),

  insertBadge: (anchor, badge) =>
    anchor.parentNode!.insertBefore(badge, anchor.nextSibling),
};
