import { getProvidersMeta } from "@/lib/registry";
import { clearProviderCache } from "@/lib/cache";

const providersMeta = getProvidersMeta();
const apiKeysContainer = document.getElementById("apiKeys")!;
const logLevelSelect = document.getElementById("logLevel") as HTMLSelectElement;
const saveBtn = document.getElementById("save") as HTMLButtonElement;
const statusEl = document.getElementById("status")!;

const apiKeyInputs: Map<string, HTMLInputElement> = new Map();

const helpLinks: Record<string, string> = {
  placesApiKey: "https://console.cloud.google.com/apis/credentials",
};

for (const provider of providersMeta) {
  const field = document.createElement("div");
  field.className = "field";

  if (provider.apiKeySettingName) {
    const label = document.createElement("label");
    label.htmlFor = `apiKey-${provider.id}`;
    label.textContent = `${provider.name} API Key`;

    const input = document.createElement("input");
    input.type = "password";
    input.id = `apiKey-${provider.id}`;
    input.placeholder = provider.apiKeyPlaceholder ?? "";

    field.appendChild(label);
    field.appendChild(input);

    const helpUrl = helpLinks[provider.apiKeySettingName];
    if (helpUrl) {
      const hint = document.createElement("div");
      hint.className = "hint";
      hint.innerHTML = `Get your key from <a href="${helpUrl}" target="_blank">Google Cloud Console</a>`;
      field.appendChild(hint);
    }

    apiKeyInputs.set(provider.apiKeySettingName, input);
  } else {
    const label = document.createElement("label");
    label.textContent = `${provider.name}`;
    field.appendChild(label);

    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "No API key required";
    field.appendChild(hint);
  }

  // Clear cache button
  const clearBtn = document.createElement("button");
  clearBtn.className = "clear-cache";
  clearBtn.textContent = `Clear ${provider.name} cache`;
  clearBtn.addEventListener("click", async () => {
    const count = await clearProviderCache(provider.id);
    clearBtn.textContent = `Cleared ${count} entries`;
    setTimeout(() => {
      clearBtn.textContent = `Clear ${provider.name} cache`;
    }, 2000);
  });
  field.appendChild(clearBtn);

  apiKeysContainer.appendChild(field);
}

// Load saved keys
const keySettingNames = providersMeta
  .map((p) => p.apiKeySettingName)
  .filter((k): k is string => !!k);

chrome.storage.sync.get([...keySettingNames, "logLevel"], (s) => {
  for (const provider of providersMeta) {
    if (!provider.apiKeySettingName) continue;
    const saved = s[provider.apiKeySettingName];
    const input = apiKeyInputs.get(provider.apiKeySettingName);
    if (saved && input) input.value = saved;
  }
  if (s.logLevel) logLevelSelect.value = s.logLevel;
});

// Save
saveBtn.addEventListener("click", () => {
  const settings: Record<string, string> = {};

  for (const [settingName, input] of apiKeyInputs) {
    const key = input.value.trim();
    if (key) settings[settingName] = key;
  }

  settings.logLevel = logLevelSelect.value;

  const hasKeylessProvider = providersMeta.some((p) => !p.apiKeySettingName);
  if (Object.keys(settings).length <= 1 && !hasKeylessProvider) {
    // Only logLevel is set, no API keys
    statusEl.textContent = "Please enter at least one API key";
    statusEl.className = "error";
    return;
  }

  chrome.storage.sync.set(settings, () => {
    statusEl.textContent = "Saved!";
    statusEl.className = "saved";
  });
});
