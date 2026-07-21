import { getProvidersMeta, getSiteForHostname } from "@/lib/registry";
import { filterStorageKey } from "@/lib/filter";

const allProviders = getProvidersMeta();
const filtersContainer = document.getElementById("providerFilters")!;
const modeDimBtn = document.getElementById("modeDim") as HTMLButtonElement;
const modeHideBtn = document.getElementById("modeHide") as HTMLButtonElement;
const saveBtn = document.getElementById("save") as HTMLButtonElement;
const statusEl = document.getElementById("status")!;
const openSettingsLink = document.getElementById("openSettings")!;

let filterMode: "dim" | "hide" = "dim";

function setMode(mode: "dim" | "hide"): void {
  filterMode = mode;
  modeDimBtn.classList.toggle("active", mode === "dim");
  modeHideBtn.classList.toggle("active", mode === "hide");
}

modeDimBtn.addEventListener("click", () => setMode("dim"));
modeHideBtn.addEventListener("click", () => setMode("hide"));

openSettingsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// ── Detect active tab's site and show only relevant providers ──

interface ProviderInputs {
  ratingSlider: HTMLInputElement;
  ratingLabel: HTMLSpanElement;
  reviewsInput: HTMLInputElement;
  maxRating: number;
}

const providerInputs = new Map<string, ProviderInputs>();

async function init(): Promise<void> {
  // Get active tab URL to determine which site the user is on
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = tab?.url ? new URL(tab.url).hostname : "";
  const activeSite = getSiteForHostname(hostname);

  // Filter providers to those relevant to the current site
  const relevantProviders = activeSite
    ? allProviders.filter((p) => p.supportedTypes.includes(activeSite.resourceType))
    : allProviders; // show all if not on a supported site

  if (relevantProviders.length === 0) {
    filtersContainer.textContent = "No providers for this site";
    return;
  }

  for (const provider of relevantProviders) {
    const section = document.createElement("div");
    section.className = "provider-section";

    const header = document.createElement("div");
    header.className = "provider-header";

    if (provider.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.className = "provider-icon";
      const parsed = new DOMParser().parseFromString(provider.icon, "image/svg+xml");
      const svg = parsed.documentElement;
      if (svg instanceof SVGElement) {
        iconSpan.appendChild(document.importNode(svg, true));
      }
      header.appendChild(iconSpan);
    }

    header.appendChild(document.createTextNode(provider.name));
    section.appendChild(header);

    // Rating slider
    const ratingField = document.createElement("div");
    ratingField.className = "field";

    const ratingLbl = document.createElement("label");
    ratingLbl.textContent = "Min rating";

    const ratingRow = document.createElement("div");
    ratingRow.className = "range-row";

    const step = provider.maxRating <= 5 ? 0.5 : 1;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = String(provider.maxRating);
    slider.step = String(step);
    slider.value = "0";

    const valSpan = document.createElement("span");
    valSpan.className = "range-value";
    valSpan.textContent = "Off";

    slider.addEventListener("input", () => {
      const v = parseFloat(slider.value);
      valSpan.textContent = v === 0 ? "Off" : v.toFixed(step < 1 ? 1 : 0);
    });

    ratingRow.appendChild(slider);
    ratingRow.appendChild(valSpan);
    ratingField.appendChild(ratingLbl);
    ratingField.appendChild(ratingRow);
    section.appendChild(ratingField);

    // Reviews input
    const reviewsField = document.createElement("div");
    reviewsField.className = "field";

    const reviewsLbl = document.createElement("label");
    reviewsLbl.textContent = "Min reviews";

    const reviewsInput = document.createElement("input");
    reviewsInput.type = "number";
    reviewsInput.min = "0";
    reviewsInput.step = "10";
    reviewsInput.value = "0";
    reviewsInput.placeholder = "0 = off";

    reviewsField.appendChild(reviewsLbl);
    reviewsField.appendChild(reviewsInput);
    section.appendChild(reviewsField);

    filtersContainer.appendChild(section);

    providerInputs.set(provider.id, {
      ratingSlider: slider,
      ratingLabel: valSpan,
      reviewsInput,
      maxRating: provider.maxRating,
    });
  }

  // Load saved settings
  const storageKeys = ["filterMode"];
  for (const provider of relevantProviders) {
    storageKeys.push(filterStorageKey(provider.id, "minRating"));
    storageKeys.push(filterStorageKey(provider.id, "minReviews"));
  }

  const s = await chrome.storage.sync.get(storageKeys);
  if (s.filterMode) setMode(s.filterMode);

  for (const provider of relevantProviders) {
    const inputs = providerInputs.get(provider.id);
    if (!inputs) continue;

    const savedRating = s[filterStorageKey(provider.id, "minRating")];
    const savedReviews = s[filterStorageKey(provider.id, "minReviews")];

    if (savedRating != null) {
      inputs.ratingSlider.value = String(savedRating);
      const decimals = inputs.maxRating <= 5 ? 1 : 0;
      inputs.ratingLabel.textContent =
        Number(savedRating) === 0 ? "Off" : Number(savedRating).toFixed(decimals);
    }
    if (savedReviews != null) {
      inputs.reviewsInput.value = String(savedReviews);
    }
  }
}

// ── Save (saves all provider filters, not just visible ones) ──

saveBtn.addEventListener("click", () => {
  const settings: Record<string, string | number> = {
    filterMode,
  };

  for (const [providerId, inputs] of providerInputs) {
    settings[filterStorageKey(providerId, "minRating")] =
      parseFloat(inputs.ratingSlider.value) || 0;
    settings[filterStorageKey(providerId, "minReviews")] =
      parseInt(inputs.reviewsInput.value, 10) || 0;
  }

  chrome.storage.sync.set(settings, () => {
    statusEl.textContent = "Saved!";
    statusEl.className = "saved";
  });
});

init();
