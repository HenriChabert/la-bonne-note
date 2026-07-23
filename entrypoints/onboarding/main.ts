import { getProvidersMeta } from "@/lib/registry";

const providersMeta = getProvidersMeta();
const container = document.getElementById("providers")!;
const doneBtn = document.getElementById("doneBtn")!;

// ── Provider setup instructions (provider-specific content) ──

interface SetupStep {
  text: string;
  detail?: string;
  linkUrl?: string;
  linkText?: string;
}

interface ProviderSetup {
  description: string;
  steps: SetupStep[];
  note?: string;
  freeNotice?: string;
}

const setupInstructions: Record<string, ProviderSetup> = {
  "google-maps": {
    description: "Restaurants & hotels on Deliveroo, Uber Eats, TheFork, Booking.com",
    steps: [
      {
        text: "Create a Google Cloud project",
        detail: 'Click the link below, give your project a name (e.g. "La Bonne Note"), then click "Create". If you already have a project, you can skip this step.',
        linkUrl: "https://console.cloud.google.com/projectcreate",
        linkText: "Open Google Cloud Console",
      },
      {
        text: "Enable the Places API",
        detail: 'Click the link below. You\'ll see the "Places API (New)" page. Click the blue "Enable" button. If it says "Manage" instead, the API is already enabled.',
        linkUrl: "https://console.cloud.google.com/apis/library/places-backend.googleapis.com",
        linkText: "Enable Places API",
      },
      {
        text: "Create an API key",
        detail: 'Click the link below to open the Credentials page. Click "+ Create Credentials" at the top, then select "API key". A dialog will appear with your new key — click the copy icon next to it.',
        linkUrl: "https://console.cloud.google.com/apis/credentials",
        linkText: "Go to Credentials",
      },
      {
        text: "Paste your API key below",
        detail: "Paste the key you just copied into the field below and click Save. You're all set!",
      },
    ],
    note: "Free for ~9,000 lookups/month with Google's $200 monthly credit. Results are cached for 30 days to minimize API usage.",
  },
  tmdb: {
    description: "Movies & TV shows on Netflix, Disney+, Canal+, Prime Video",
    steps: [
      {
        text: "Create a free TMDB account",
        detail: "Click the link below and fill in the registration form. You'll need to verify your email address.",
        linkUrl: "https://www.themoviedb.org/signup",
        linkText: "Sign up at TMDB",
      },
      {
        text: "Request an API key",
        detail: 'Click the link below, then click "Create" or "click here" under the Request an API Key section. Select "Developer" as the usage type and fill in the form (application name, URL, and description can be anything).',
        linkUrl: "https://www.themoviedb.org/settings/api",
        linkText: "Open API Settings",
      },
      {
        text: "Copy the API Read Access Token",
        detail: 'On the same API settings page, scroll down to find the "API Read Access Token (v4 auth)" section. Copy the long token that starts with "eyJ..." — this is the one you need, not the shorter API Key above it.',
      },
      {
        text: "Paste your token below",
        detail: "Paste the long token into the field below and click Save.",
      },
    ],
    note: "Completely free for non-commercial use. No credit card required.",
  },
  allocine: {
    description: "Movies & TV shows on Netflix, Disney+, Canal+, Prime Video",
    freeNotice: "Ready to use — no configuration needed. Allocine ratings appear automatically on streaming platforms.",
  },
};

// ── Build UI ──

async function init(): Promise<void> {
  // Load existing API keys to show current status
  const keyNames = providersMeta
    .map((p) => p.apiKeySettingName)
    .filter((k): k is string => !!k);

  const stored = await chrome.storage.sync.get(keyNames);

  for (const provider of providersMeta) {
    const setup = setupInstructions[provider.id];
    if (!setup) continue;

    const hasKey = provider.apiKeySettingName
      ? !!stored[provider.apiKeySettingName]
      : true;
    const isFree = !provider.apiKeySettingName;

    const card = document.createElement("div");
    card.className = `provider-card${hasKey ? " configured" : ""}`;
    card.id = provider.id;

    // ── Header ──
    const header = document.createElement("div");
    header.className = "card-header";
    header.setAttribute("aria-expanded", isFree ? "false" : String(!hasKey));

    const iconDiv = document.createElement("div");
    iconDiv.className = "card-icon";
    if (provider.icon.trimStart().startsWith("<")) {
      const parsed = new DOMParser().parseFromString(provider.icon, "image/svg+xml");
      const svg = parsed.documentElement;
      if (svg instanceof SVGElement) {
        iconDiv.appendChild(document.importNode(svg, true));
      }
    } else {
      const img = document.createElement("img");
      img.src = provider.icon;
      iconDiv.appendChild(img);
    }

    const titleDiv = document.createElement("div");
    titleDiv.className = "card-title";
    const h2 = document.createElement("h2");
    h2.textContent = provider.name;
    const desc = document.createElement("div");
    desc.className = "card-desc";
    desc.textContent = setup.description;
    titleDiv.appendChild(h2);
    titleDiv.appendChild(desc);

    const status = document.createElement("span");
    status.className = "card-status";
    if (isFree) {
      status.classList.add("free");
      status.textContent = "Free";
    } else if (hasKey) {
      status.classList.add("configured");
      status.textContent = "Configured";
    } else {
      status.classList.add("not-configured");
      status.textContent = "Not configured";
    }

    const chevron = document.createElement("span");
    chevron.className = "card-chevron";
    chevron.textContent = "\u25B6";

    header.appendChild(iconDiv);
    header.appendChild(titleDiv);
    header.appendChild(status);
    header.appendChild(chevron);

    // ── Body ──
    const body = document.createElement("div");
    body.className = "card-body";

    // Auto-expand unconfigured providers
    if (!hasKey && !isFree) {
      body.classList.add("open");
    }

    if (setup.freeNotice) {
      // Free provider — just show a green notice
      const notice = document.createElement("div");
      notice.className = "free-notice";

      const checkmark = document.createElement("span");
      checkmark.className = "checkmark";
      checkmark.textContent = "\u2713";

      const text = document.createElement("span");
      text.textContent = setup.freeNotice;

      notice.appendChild(checkmark);
      notice.appendChild(text);
      body.appendChild(notice);
    } else {
      // Steps
      const ol = document.createElement("ol");
      ol.className = "steps";

      for (const step of setup.steps) {
        const li = document.createElement("li");

        const title = document.createElement("strong");
        title.textContent = step.text;
        li.appendChild(title);

        if (step.detail) {
          const detail = document.createElement("div");
          detail.className = "step-detail";
          detail.textContent = step.detail;
          li.appendChild(detail);
        }

        if (step.linkUrl && step.linkText) {
          const link = document.createElement("a");
          link.href = step.linkUrl;
          link.target = "_blank";
          link.innerHTML = `${step.linkText} &rarr;`;
          li.appendChild(link);
        }

        ol.appendChild(li);
      }

      body.appendChild(ol);

      // API key input
      if (provider.apiKeySettingName) {
        const inputRow = document.createElement("div");
        inputRow.className = "key-input-row";

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = provider.apiKeyPlaceholder ?? "Paste your key here";
        if (stored[provider.apiKeySettingName]) {
          input.value = stored[provider.apiKeySettingName] as string;
        }

        const saveBtn = document.createElement("button");
        saveBtn.textContent = hasKey ? "Saved" : "Save";
        if (hasKey) saveBtn.classList.add("saved");

        const feedback = document.createElement("div");
        feedback.className = "key-feedback";

        saveBtn.addEventListener("click", async () => {
          const key = input.value.trim();
          if (!key) {
            feedback.textContent = "Please enter a key";
            feedback.className = "key-feedback error";
            return;
          }

          await chrome.storage.sync.set({ [provider.apiKeySettingName!]: key });

          // Update UI
          saveBtn.textContent = "Saved";
          saveBtn.classList.add("saved");
          input.classList.add("saved");
          status.textContent = "Configured";
          status.className = "card-status configured";
          card.classList.add("configured");
          feedback.textContent = "Key saved successfully";
          feedback.className = "key-feedback success";

          setTimeout(() => {
            input.classList.remove("saved");
          }, 2000);
        });

        // Reset save button when input changes
        input.addEventListener("input", () => {
          saveBtn.textContent = "Save";
          saveBtn.classList.remove("saved");
          feedback.textContent = "";
        });

        inputRow.appendChild(input);
        inputRow.appendChild(saveBtn);
        body.appendChild(inputRow);
        body.appendChild(feedback);
      }

      // Note
      if (setup.note) {
        const note = document.createElement("div");
        note.className = "note";
        note.innerHTML = `<strong>Pricing:</strong> ${setup.note}`;
        body.appendChild(note);
      }
    }

    // ── Toggle body on header click ──
    header.addEventListener("click", () => {
      const isOpen = body.classList.contains("open");
      body.classList.toggle("open");
      header.setAttribute("aria-expanded", String(!isOpen));
    });

    card.appendChild(header);
    card.appendChild(body);
    container.appendChild(card);
  }
}

// ── Done button ──

doneBtn.addEventListener("click", async () => {
  await chrome.storage.sync.set({ onboardingCompleted: true });
  // Try to close this tab; if it's the only tab, just show a message
  const tabs = await chrome.tabs.query({ currentWindow: true });
  if (tabs.length > 1) {
    const currentTab = await chrome.tabs.getCurrent();
    if (currentTab?.id) {
      chrome.tabs.remove(currentTab.id);
    }
  } else {
    doneBtn.textContent = "You're all set!";
    doneBtn.disabled = true;
  }
});

// ── Handle anchor links (e.g. onboarding.html#google-maps) ──

function scrollToProvider(): void {
  const hash = location.hash.slice(1);
  if (hash) {
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Auto-expand if collapsed
      const body = el.querySelector(".card-body");
      const header = el.querySelector(".card-header");
      if (body && !body.classList.contains("open")) {
        body.classList.add("open");
        header?.setAttribute("aria-expanded", "true");
      }
    }
  }
}

init().then(scrollToProvider);
