import type { RatingResult } from "./types";

// Cache parsed SVG icons to avoid re-parsing the same string
const iconCache = new Map<string, Node>();

function getIconNode(iconValue: string): Node {
  let node = iconCache.get(iconValue);
  if (!node) {
    if (iconValue.trimStart().startsWith("<")) {
      const parsed = new DOMParser().parseFromString(iconValue, "image/svg+xml");
      const svg = parsed.documentElement;
      node = svg instanceof SVGElement ? svg : document.createTextNode("");
    } else {
      const img = document.createElement("img");
      img.src = iconValue;
      img.width = 14;
      img.height = 14;
      node = img;
    }
    iconCache.set(iconValue, node);
  }
  return node.cloneNode(true);
}

export function createBadge(data: RatingResult): HTMLElement {
  const badge = document.createElement("div");
  badge.className = "lbn-badge";

  if (data.error === "NO_API_KEY") {
    badge.classList.add("lbn-badge--error");
    badge.textContent = "Set API key in extension";
    return badge;
  }

  if (data.error) {
    badge.classList.add("lbn-badge--error");
    badge.textContent = `${data.providerName}: error`;
    return badge;
  }

  if (data.rating === null) {
    badge.classList.add("lbn-badge--na");
    badge.textContent = `${data.providerName}: N/A`;
    return badge;
  }

  if (data.providerIcon) {
    const iconEl = document.createElement("span");
    iconEl.className = "lbn-provider-icon";
    iconEl.appendChild(getIconNode(data.providerIcon));
    badge.appendChild(iconEl);
  }

  const ratingText = document.createElement("span");
  ratingText.className = "lbn-rating";
  ratingText.textContent = data.rating.toFixed(1);

  const countText = document.createElement("span");
  countText.className = "lbn-count";
  countText.textContent = `(${data.userRatingCount})`;

  badge.appendChild(ratingText);
  badge.appendChild(countText);

  if (data.url) {
    badge.dataset.url = data.url;
    badge.classList.add("lbn-badge--link");
    badge.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        window.open(data.url!, "_blank");
      },
      true,
    );
    badge.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    });
  }

  return badge;
}
