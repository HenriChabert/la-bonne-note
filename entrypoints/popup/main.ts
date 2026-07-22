import { getProvidersMeta, getSiteForHostname } from "@/lib/registry";
import { filterStorageKey } from "@/lib/filter";

const allProviders = getProvidersMeta();
const filtersContainer = document.getElementById("providerFilters")!;
const filterControls = document.getElementById("filterControls")!;
const placeholderEl = document.getElementById("placeholder")!;
const modeDimBtn = document.getElementById("modeDim") as HTMLButtonElement;
const modeHideBtn = document.getElementById("modeHide") as HTMLButtonElement;
const saveBtn = document.getElementById("save") as HTMLButtonElement;
const resetBtn = document.getElementById("reset") as HTMLButtonElement;
const statusEl = document.getElementById("status")!;
const openSettingsLink = document.getElementById("openSettings")!;
const enableToggle = document.getElementById("enableToggle") as HTMLInputElement;

// ── Enable/disable toggle (saves immediately) ──

function updatePlaceholder(isEnabled: boolean, onSupportedSite: boolean): void {
  if (!isEnabled) {
    filterControls.style.display = "none";
    placeholderEl.textContent = "Extension is disabled.";
    placeholderEl.style.display = "block";
  } else if (!onSupportedSite) {
    filterControls.style.display = "none";
    placeholderEl.textContent = "Navigate to a supported site to configure filters.";
    placeholderEl.style.display = "block";
  } else {
    filterControls.style.display = "";
    placeholderEl.style.display = "none";
  }
}

enableToggle.addEventListener("change", () => {
  chrome.storage.sync.set({ lbnEnabled: enableToggle.checked });
  updatePlaceholder(enableToggle.checked, providerInputs.size > 0);
});

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
let currentSite: ReturnType<typeof getSiteForHostname> = undefined;

async function init(): Promise<void> {
  // Get active tab URL to determine which site the user is on
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = tab?.url ? new URL(tab.url).hostname : "";
  currentSite = getSiteForHostname(hostname);

  // Load enabled state regardless of site
  const enabledState = await chrome.storage.sync.get("lbnEnabled");
  const isEnabled = enabledState.lbnEnabled !== false;
  enableToggle.checked = isEnabled;

  // Filter providers to those relevant to the current site
  const relevantProviders = currentSite
    ? allProviders.filter((p) => p.supportedTypes.includes(currentSite!.resourceType))
    : [];

  // Always build the UI, then toggle visibility
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

  // Set initial visibility
  updatePlaceholder(isEnabled, !!currentSite && relevantProviders.length > 0);
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

// ── Reset filters ──

resetBtn.addEventListener("click", () => {
  setMode("dim");

  for (const inputs of providerInputs.values()) {
    inputs.ratingSlider.value = "0";
    inputs.ratingLabel.textContent = "Off";
    inputs.reviewsInput.value = "0";
  }

  // Trigger save immediately
  saveBtn.click();
});

init();
