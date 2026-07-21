import type { SiteAdapter } from "../types";

export const canalplus: SiteAdapter = {
  id: "canalplus",
  hostPattern: "canalplus",
  resourceType: "movie",
  match: () => location.hostname.includes("canalplus"),
  cardSelector: 'a[class*="ContentRowTemplateItem__item-link"][href*="/h/"]',

  getName: (card) => {
    let title = card.getAttribute("title")?.trim();
    if (!title) return null;

    // Strip "Top N " ranking prefix
    title = title.replace(/^Top \d+\s+/, "");
    // Strip metadata suffixes: ", Film Genre, Sur ...", ", Série ...", ", Saison(s) ..."
    title = title.replace(/,\s+(?:Film|Série|Saison|Doc\.|Mag\.|Divertissement).*$/, "");
    // Strip ", Sur ..." (channel info)
    title = title.replace(/,\s+Sur\s.*$/, "");

    return title.trim() || null;
  },

  getCity: () => "",

  getInjectionAnchor: (card) => card,

  insertBadge: (anchor, badge) => {
    const el = anchor as HTMLElement;
    if (getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }

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
