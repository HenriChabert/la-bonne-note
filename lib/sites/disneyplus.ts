import type { SiteAdapter } from "../types";

export const disneyplus: SiteAdapter = {
  id: "disneyplus",
  hostPattern: "disneyplus",
  resourceType: "movie",
  match: () => location.hostname.includes("disneyplus"),
  cardSelector: 'a[data-testid="set-item"]',

  getName: (card) => {
    let label = card.getAttribute("aria-label")?.trim();
    if (!label) return null;

    // Strip "Badge [type]" prefix (movies page: "Badge Nouveau film Title ...")
    label = label.replace(
      /^Badge\s+(?:Nouveau film|Nouvelle série|Nouvel épisode)\s+/,
      "",
    );

    // Strip suffixes: "Sélectionnez cette option..." / "Badge ..." / "Classé ..."
    label = label
      .replace(/\s*Sélectionnez cette option.*$/, "")
      .replace(/\s+Badge\s.*$/, "")
      .replace(/\s+Classé[\s\u00a0&].*$/, "");

    // Strip promo text continuation after newlines
    label = label.replace(/\n.*$/, "");

    // Decode HTML entities and trim
    label = label.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();

    return label || null;
  },

  getCity: () => "",

  getInjectionAnchor: (card) =>
    card.querySelector('[data-testid="set-item-tile"]') ?? card,

  insertBadge: (anchor, badge) => {
    const el = anchor as HTMLElement;
    if (getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }
    el.style.overflow = "visible";

    let container = el.querySelector(
      ".lbn-overlay-container",
    ) as HTMLElement | null;
    if (!container) {
      container = document.createElement("div");
      container.className = "lbn-overlay-container";
      el.appendChild(container);
    }

    badge.classList.add("lbn-badge--overlay");
    container.appendChild(badge);
  },
};
