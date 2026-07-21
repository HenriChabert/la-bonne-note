import type { SiteAdapter } from "../types";

export const booking: SiteAdapter = {
  id: "booking",
  hostPattern: "booking",
  resourceType: "hotel",
  match: () => location.hostname.includes("booking.com"),
  cardSelector: '[data-testid="property-card"]',

  getName: (card) => {
    const titleEl = card.querySelector('[data-testid="title"]');
    if (!titleEl) return null;
    return titleEl.textContent?.replace(/Opens in new window/gi, "").trim() ?? null;
  },

  getCity: () => {
    // Extract from search input or page heading
    const input = document.querySelector<HTMLInputElement>('[name="ss"]');
    if (input?.value) return input.value.trim();
    return "";
  },

  getAddress: (card) => {
    const addressEl = card.querySelector('[data-testid="address-link"]');
    return addressEl?.textContent?.trim() ?? null;
  },

  getInjectionAnchor: (card) =>
    card.querySelector('[data-testid="review-score-link"]')
    ?? card.querySelector('[data-testid="review-score"]')?.parentElement
    ?? card.querySelector('[data-testid="title"]'),

  insertBadge: (anchor, badge) => {
    if (!anchor.parentElement) return;
    // Use CSS order to always render after Booking's elements,
    // regardless of DOM insertion order (Booking re-renders reorder siblings).
    badge.style.order = "999";
    anchor.parentElement.insertBefore(badge, anchor.nextSibling);
  },
};
