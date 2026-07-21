import type { SiteAdapter } from "../types";

export const netflix: SiteAdapter = {
  id: "netflix",
  hostPattern: "netflix",
  resourceType: "movie",
  match: () => location.hostname.includes("netflix"),
  cardSelector: [
    'a[data-uia="standard-card"]',
    'a[data-uia="ranked-card"]',
    'a[data-uia="progress-card"]',
    'div[data-uia="title-card-container"]',
  ].join(", "),

  getName: (card) => {
    // Welcome page: the card itself is an <a> with aria-label
    const label = card.getAttribute("aria-label")?.trim();
    if (label) return label;
    // Movies/genre page: <a> with aria-label is nested inside the card div
    return card.querySelector("a[aria-label]")?.getAttribute("aria-label")?.trim() ?? null;
  },

  getCity: () => "",

  getInjectionAnchor: (card) => {
    // For title-card-container divs, anchor on the inner <a>
    if (card.tagName === "DIV") {
      return card.querySelector("a[aria-label]") ?? card;
    }
    return card;
  },

  insertBadge: (anchor, badge) => {
    const el = anchor as HTMLElement;
    if (getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }

    // Reuse or create a single overlay container per card
    let container = el.querySelector(".lbn-overlay-container") as HTMLElement | null;
    if (!container) {
      container = document.createElement("div");
      container.className = "lbn-overlay-container";
      el.appendChild(container);
    }

    badge.classList.add("lbn-badge--overlay");
    container.appendChild(badge);
  },
};
