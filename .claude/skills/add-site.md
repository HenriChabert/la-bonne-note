# Skill: Add a new site

Add support for a new website platform to La Bonne Note.

## Steps

### 1. Create the site adapter

Create `lib/sites/<sitename>.ts` implementing the `SiteAdapter` interface from `lib/types.ts`:

```ts
import type { SiteAdapter } from "../types";

export const sitename: SiteAdapter = {
  id: "sitename",
  hostPattern: "sitename.com",          // substring matched against hostname
  resourceType: "restaurant",            // "restaurant" | "movie" | "hotel"
  match: () => location.hostname.includes("sitename.com"),
  cardSelector: "[data-testid='item']",  // CSS selector for each item card

  getName: (card) => {
    // Extract the item name from the card DOM
    return card.querySelector("[data-testid='title']")?.textContent?.trim() ?? null;
  },

  getCity: () => {
    // Extract the current city from the page (URL, search bar, heading, etc.)
    return "";
  },

  // Optional — only needed for restaurants/hotels where address helps disambiguation
  getAddress: (card) => {
    return card.querySelector("[data-testid='address']")?.textContent?.trim() ?? null;
  },

  getInjectionAnchor: (card) => {
    // Return the element AFTER which badges will be inserted
    return card.querySelector("[data-testid='rating']") ?? null;
  },

  insertBadge: (anchor, badge) => {
    // Insert the badge element relative to the anchor
    anchor.parentNode!.insertBefore(badge, anchor.nextSibling);
  },
};
```

**For streaming/movie sites** that need overlay badges on dark backgrounds:

```ts
insertBadge: (anchor, badge) => {
  badge.classList.add("lbn-badge--overlay");
  let container = anchor.querySelector(".lbn-overlay-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "lbn-overlay-container";
    anchor.appendChild(container);
  }
  container.appendChild(badge);
},
```

### 2. Register the site

In `lib/registry.ts`:
- Add import: `import { sitename } from "./sites/sitename";`
- Add to the `sites` array: `export const sites: SiteAdapter[] = [..., sitename];`

### 3. Add URL match pattern

In `entrypoints/content.ts`, add the URL pattern to the `matches` array:

```ts
matches: [
  // ... existing patterns
  "*://*.sitename.com/*",
],
```

### 4. Add host permission (if the site's API requires it)

In `wxt.config.ts`, if the site adapter fetches from external domains, add to `host_permissions`.
Usually not needed — sites are accessed as content scripts, not via fetch.

### 5. Update documentation

- `README.md`: add the new site to the "Supported platforms" list and architecture tree
- `store/description.txt`: add the site to the Chrome Web Store description (supported platforms list and first line)
- `store/privacy-policy.md`: update if a new data type or third-party service is involved
- `wxt.config.ts`: update manifest `description` if a new category was added

### Tips

- Use the browser DevTools to inspect card structure and find stable selectors (`data-testid` attributes are best)
- Test with `getCity()` returning an empty string first — it's just a search hint
- The `getAddress()` method is optional but improves Google Maps accuracy for restaurants/hotels
- Cards are marked with `data-lbn-done` to prevent duplicate processing
- Badges self-repair if the SPA re-renders — no extra work needed
- Check existing site adapters in `lib/sites/` for reference patterns
