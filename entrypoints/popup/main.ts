import { getProvidersMeta, getSiteForHostname } from "@/lib/registry";
import { filterStorageKey } from "@/lib/filter";
import {
  providerStateStorageKeys,
  resolveAllProviderStates,
  providerEnabledKey,
} from "@/lib/provider-state";

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
const siteWarningEl = document.getElementById("siteWarning")!;

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
  filterWrapper: HTMLDivElement;
  maxRating: number;
}

const providerInputs = new Map<string, ProviderInputs>();
let currentSite: ReturnType<typeof getSiteForHostname> = undefined;

function renderProviderIcon(icon: string, container: HTMLElement): void {
  if (icon.trimStart().startsWith("<")) {
    const parsed = new DOMParser().parseFromString(icon, "image/svg+xml");
    const svg = parsed.documentElement;
    if (svg instanceof SVGElement) {
      container.appendChild(document.importNode(svg, true));
    }
  } else {
    const img = document.createElement("img");
    img.src = icon;
    img.width = 14;
    img.height = 14;
    container.appendChild(img);
  }
}

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

  // Load provider states
  const stateKeys = providerStateStorageKeys(relevantProviders);
  const stateData = await chrome.storage.sync.get(stateKeys);
  const providerStates = resolveAllProviderStates(relevantProviders, stateData);

  // Always build the UI, then toggle visibility
  for (const provider of relevantProviders) {
    const state = providerStates.get(provider.id)!;
    const section = document.createElement("div");
    section.className = "provider-section";

    // ── Header with icon, name, and toggle ──
    const header = document.createElement("div");
    header.className = "provider-header";

    if (provider.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.className = "provider-icon";
      renderProviderIcon(provider.icon, iconSpan);
      header.appendChild(iconSpan);
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "provider-name";
    nameSpan.textContent = provider.name;
    header.appendChild(nameSpan);

    // Per-provider toggle (saves immediately)
    const toggleLabel = document.createElement("label");
    toggleLabel.className = "switch switch--small";

    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = state.active;
    toggleInput.disabled = state.misconfigured;

    const toggleSlider = document.createElement("span");
    toggleSlider.className = "slider";

    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(toggleSlider);
    header.appendChild(toggleLabel);

    section.appendChild(header);

    // ── Misconfigured warning ──
    if (state.misconfigured) {
      const warning = document.createElement("div");
      warning.className = "provider-warning";
      warning.textContent = "API key not configured — ";

      const settingsLink = document.createElement("a");
      settingsLink.href = "#";
      settingsLink.textContent = "Configure";
      settingsLink.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
      });
      warning.appendChild(settingsLink);
      section.appendChild(warning);
    }

    // ── Toggle handler (saves immediately) ──
    toggleInput.addEventListener("change", () => {
      chrome.storage.sync.set({
        [providerEnabledKey(provider.id)]: toggleInput.checked,
      });
      filterWrapper.style.display = toggleInput.checked ? "" : "none";
    });

    // ── Filter controls ──
    const filterWrapper = document.createElement("div");
    filterWrapper.style.display = state.active ? "" : "none";

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
    filterWrapper.appendChild(ratingField);

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
    filterWrapper.appendChild(reviewsField);

    section.appendChild(filterWrapper);
    filtersContainer.appendChild(section);

    providerInputs.set(provider.id, {
      ratingSlider: slider,
      ratingLabel: valSpan,
      reviewsInput,
      filterWrapper,
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

  // ── Check for site breakage ──
  if (currentSite && isEnabled) {
    try {
      const statusKey = `siteStatus:${currentSite.id}`;
      const s2 = await chrome.storage.session.get(statusKey);
      const status = s2[statusKey] as { cardsFound: number; url: string; ts: number } | undefined;

      if (status && status.cardsFound === 0) {
        const issueTitle = encodeURIComponent(`[Broken site] ${currentSite.id}`);
        const issueBody = encodeURIComponent(
          `**Site:** ${currentSite.id}\n` +
          `**URL:** ${status.url}\n` +
          `**Cards found:** 0\n` +
          `**Date:** ${new Date(status.ts).toISOString()}\n` +
          `**Browser:** ${navigator.userAgent}\n\n` +
          `Please describe what you see on the page.`,
        );
        const issueUrl = `https://github.com/HenriChabert/la-bonne-note/issues/new?title=${issueTitle}&body=${issueBody}&labels=bug,site-breakage`;

        siteWarningEl.innerHTML =
          `No cards detected on <strong>${currentSite.id}</strong>. ` +
          `The site may have changed its layout. ` +
          `<a href="${issueUrl}" target="_blank">Report issue</a>`;
        siteWarningEl.style.display = "block";
      }
    } catch {
      // session storage may not be available — ignore
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
