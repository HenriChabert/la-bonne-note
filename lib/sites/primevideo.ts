import type { SiteAdapter } from "../types";

const SEASON_KEYWORDS = ["season", "saison", "series"];

/** Strip season info, format tags, and HTML entities from a Prime Video title */
function cleanTitle(raw: string): string {
  let title = raw
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replaceAll("\u00a0", " ");

  // Find the earliest season keyword and take everything before it
  const lower = title.toLowerCase();
  let cutIndex = title.length;

  for (const keyword of SEASON_KEYWORDS) {
    const idx = lower.indexOf(keyword);
    if (idx > 0 && idx < cutIndex) {
      cutIndex = idx;
    }
  }

  if (cutIndex < title.length) {
    title = title.slice(0, cutIndex);
  }

  // Remove "The Complete First" etc. (generic season placeholders)
  if (title.toLowerCase().startsWith("the complete")) return "";

  // Strip trailing separators and brackets
  return title
    .replace(/[\s\-–:,]+$/, "")
    .replace(/\s*[\[(][^\])]*[\])]/g, "")
    .trim();
}

export const primevideo: SiteAdapter = {
  id: "primevideo",
  hostPattern: "primevideo",
  resourceType: "movie",
  match: () =>
    location.hostname.includes("primevideo") ||
    (location.hostname.includes("amazon") && location.pathname.includes("/video")),
  cardSelector: '[data-testid="card"]',

  getName: (card) => {
    // "More details for Title" aria-label is the cleanest source
    const detailLink = card.querySelector('a[aria-label^="More details for"]');
    if (detailLink) {
      const label = detailLink.getAttribute("aria-label") ?? "";
      const name = label.replace("More details for ", "");
      return cleanTitle(name) || null;
    }
    // Fallback to data-card-title
    const raw = card.getAttribute("data-card-title") ?? "";
    return cleanTitle(raw) || null;
  },

  getCity: () => "",

  getInjectionAnchor: (card) =>
    card.querySelector('[data-testid="card-overlay"]') ??
    card.querySelector('[data-testid="packshot"]'),

  insertBadge: (anchor, badge) => {
    const el = anchor as HTMLElement;
    if (getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }

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
