---
description: Step-by-step guide for adding a new rating provider to La Bonne Note.
---

# Skill: Add a new rating provider

Add a new rating source to La Bonne Note.

## Steps

### 1. Create the provider

Create `lib/providers/<provider>.ts` implementing the `RatingProvider` interface from `lib/types.ts`:

```ts
import type { RatingProvider, LookupRequest, RatingResult } from "../types";

// Icon: inline SVG string, or import a file (ico/png/svg)
// Inline SVG:
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="14" height="14">...</svg>`;
// Or file import (resolves to URL, rendered as <img>):
// import ICON from "@/assets/icons/provider.ico";

function makeErrorResult(error: string): RatingResult {
  return {
    providerId: "provider-id",
    rating: null,
    userRatingCount: null,
    url: null,
    displayName: null,
    providerName: "Provider Name",
    providerIcon: ICON,
    error,
  };
}

export const provider: RatingProvider = {
  id: "provider-id",
  name: "Provider Name",
  icon: ICON,
  maxRating: 10,                        // maximum rating value (e.g. 5, 10, 100)
  supportedTypes: ["movie"],             // which ResourceTypes this provider handles
  // If API key is required:
  apiKeySettingName: "providerApiKey",   // chrome.storage.sync key for the API key
  apiKeyPlaceholder: "sk-...",           // placeholder hint shown in settings

  async lookup(query: LookupRequest, apiKey: string): Promise<RatingResult> {
    // 1. Search for the item
    const res = await fetch("https://api.example.com/search", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) return makeErrorResult("API_ERROR");

    const data = await res.json();
    const match = data.results?.[0];

    if (!match) {
      return {
        providerId: "provider-id",
        rating: null,
        userRatingCount: null,
        url: null,
        displayName: null,
        providerName: "Provider Name",
        providerIcon: ICON,
      };
    }

    // 2. Return the rating
    return {
      providerId: "provider-id",
      rating: match.rating,
      userRatingCount: match.voteCount,
      url: match.url,
      displayName: match.title,
      providerName: "Provider Name",
      providerIcon: ICON,
    };
  },
};
```

### 2. Add provider icon

Two options:
- **Inline SVG**: define as a `const` string directly in the provider file (keep it small, 14x14)
- **File import**: place the icon in `assets/icons/` and import it. SVG files use `?raw` suffix (parsed as SVG node). Other formats (ICO, PNG) use default import (rendered as `<img>`):
  ```ts
  import ICON from "@/assets/icons/provider.svg?raw";  // SVG
  import ICON from "@/assets/icons/provider.ico";       // ICO/PNG
  ```

### 3. Register the provider

In `lib/registry.ts`:
- Add import: `import { provider } from "./providers/provider";`
- Add to the `providers` array: `export const providers: RatingProvider[] = [..., provider];`

### 4. Add host permission

In `wxt.config.ts`, add the API domain to `host_permissions`:

```ts
host_permissions: [
  // ... existing
  "https://api.example.com/*",
],
```

### 5. Add setup instructions in settings page

In `entrypoints/options/main.ts`, add an entry to the `setupInstructions` object:

```ts
const setupInstructions: Record<string, ProviderSetup> = {
  // ... existing
  "provider-id": {
    description: "Brief description of what this provider covers",
    steps: [
      {
        text: "Step title",
        detail: "Detailed instructions for this step",
        linkUrl: "https://example.com/signup",
        linkText: "Open Example",
      },
      // ... more steps
      { text: "Paste your key below", detail: "Paste and click Save." },
    ],
    note: "Pricing info here",
  },
};
```

For providers without an API key, use `freeNotice` instead of `steps`:
```ts
"provider-id": {
  description: "Brief description",
  freeNotice: "Ready to use — no configuration needed.",
},
```

### 6. Update documentation

- `docs/provider-setup.md`: add a section for the new provider with setup instructions (API key steps, pricing, limitations)
- `README.md`: add the provider to "Features" description, add API key setup under "Setup > Configure API keys", update architecture tree
- Do NOT add provider/site names to `store/description.txt` — Chrome Web Store rejects this as keyword spam
- `store/privacy-policy.md`: add the new service to the "Third-Party Services" and "Data Usage" tables
- `wxt.config.ts`: update manifest `description` to mention the new provider

### What happens automatically

Once registered, the provider is automatically:
- Dispatched by the background service worker for matching `resourceType` lookups
- Shown in the popup filter controls with appropriate rating scale slider
- Shown in the options page with API key input (if `apiKeySettingName` is set)
- Cached with 30-day TTL
- Displayed as a badge with the provider icon

### Tips

- All RatingResult fields must be present (use `null` for missing values)
- The `error` field is optional — set to `"API_ERROR"` on fetch failure, `"NO_API_KEY"` is handled automatically by the background script
- Providers without `apiKeySettingName` don't need an API key (like Allocine)
- The `lookup()` function receives the API key as second argument — it's empty string if not configured
- Check existing providers in `lib/providers/` for reference patterns
