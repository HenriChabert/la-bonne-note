import type { SiteAdapter } from "../types";

export const deliveroo: SiteAdapter = {
  id: "deliveroo",
  hostPattern: "deliveroo",
  resourceType: "restaurant",
  match: () => location.hostname.includes("deliveroo"),
  cardSelector: 'a[data-testid="partner-card"]',

  getName: (card) =>
    card.querySelector('[data-testid="partner-name"]')?.textContent?.trim() ??
    null,

  getCity: () => {
    const m = location.pathname.match(/\/(?:restaurants|menu)\/([^/]+)/i);
    return m ? decodeURIComponent(m[1]).replace(/-/g, " ") : "Paris";
  },

  getInjectionAnchor: (card) =>
    card.querySelector('[data-testid="sponsored-rating-distance"]') ??
    card.querySelector('[data-testid="content"]'),

  insertBadge: (anchor, badge) =>
    anchor.parentNode!.insertBefore(badge, anchor.nextSibling),
};
