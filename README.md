# La Bonne Note

Chrome extension that overlays external ratings on food delivery, streaming, and hotel booking platforms.

## Features

- **Multi-provider ratings** — Google Maps for restaurants and hotels, Allocine and TMDB for movies/TV shows
- **Per-provider filtering** — set minimum rating and review count per provider, hide or dim low-rated items
- **Live updates** — change filters without reloading the page
- **Smart caching** — results cached for 30 days to minimize API usage
- **Multiple badges** — see ratings from all relevant providers side by side
- **Supported platforms:**
  - **Food delivery:** [Deliveroo](https://deliveroo.fr), [Uber Eats](https://ubereats.com), [TheFork](https://thefork.fr)
  - **Streaming:** [Netflix](https://netflix.com), [Disney+](https://disneyplus.com), [Canal+](https://canalplus.com), [Amazon Prime Video](https://primevideo.com)
  - **Hotels:** [Booking.com](https://booking.com)

## Installation

### From the Chrome Web Store

> Coming soon

### From source (Developer mode)

1. Clone this repository
2. Install dependencies: `bun install`
3. Build the extension: `bun run build`
4. Open `chrome://extensions` in Chrome
5. Enable **Developer mode** (top right toggle)
6. Click **Load unpacked** and select the `.output/chrome-mv3` folder

## Development

```bash
bun install       # Install dependencies
bun run dev       # Start dev mode (does not open Chrome automatically)
bun run build     # Production build
bun run zip       # Create distributable zip in .output/
```

Or via the Makefile: `make dev`, `make build`, `make package`, `make clean`.

## Setup

1. **Configure API keys** (via extension icon > "API Key Settings"):
   - **Google Places API key** — for restaurant and hotel ratings ([get one here](https://console.cloud.google.com/apis/credentials))
   - **TMDB API key** — for movie/TV ratings ([get one here](https://www.themoviedb.org/settings/api))
   - **Allocine** — works without an API key

2. **Set filters** (via extension icon):
   - Set minimum rating per provider (sliders adapt to each provider's scale)
   - Set minimum review count
   - Choose to dim or hide items below threshold

3. **Browse** any supported platform — ratings appear automatically

## Architecture

```
entrypoints/
├── background.ts          # Service worker: receives LOOKUP messages, dispatches
│                          # to providers in parallel, manages 30-day cache
├── content.ts             # Content script: detects site, observes DOM for new
│                          # cards, lazy-loads ratings via IntersectionObserver
├── popup/                 # Filter controls (per-provider min rating/reviews)
└── options/               # Settings page (API keys with show/hide toggle,
                           # per-provider cache clearing, log level)

lib/
├── types.ts               # SiteAdapter, RatingProvider, RatingResult interfaces
├── registry.ts            # Central registration of all sites + providers
├── badge.ts               # Badge DOM builder (supports SVG and image icons)
├── filter.ts              # Per-provider filter logic (dim or hide cards)
├── cache.ts               # chrome.storage.local cache with 30-day TTL
├── logger.ts              # Configurable console logging with [La Bonne Note] prefix
├── sites/                 # One file per supported platform
│   ├── deliveroo.ts       # resourceType: restaurant
│   ├── ubereats.ts        # resourceType: restaurant
│   ├── thefork.ts         # resourceType: restaurant
│   ├── netflix.ts         # resourceType: movie (overlay badges)
│   ├── disneyplus.ts      # resourceType: movie (overlay badges)
│   ├── canalplus.ts       # resourceType: movie (overlay badges)
│   ├── primevideo.ts      # resourceType: movie (overlay badges)
│   └── booking.ts         # resourceType: hotel
└── providers/             # One file per rating source
    ├── google-maps.ts     # Google Places API (restaurants, hotels)
    ├── allocine.ts        # Allocine scraping (movies, no API key)
    └── tmdb.ts            # TMDB API (movies)

assets/
├── content.css            # Badge, overlay, and filter styles
└── icons/                 # Provider icons (SVG, ICO, PNG)
```

### How it works

1. **Content script** detects the current site via `SiteAdapter.match()`
2. A `MutationObserver` watches for new item cards in the DOM
3. An `IntersectionObserver` lazy-loads ratings only for visible cards
4. Cards are batched (4 per 100ms) and sent as `LOOKUP` messages to the background
5. **Background service worker** finds providers matching the `resourceType`, checks cache, fetches ratings in parallel, caches results, and responds
6. Content script injects badge elements via `SiteAdapter.insertBadge()` and applies filters
7. A self-repair mechanism re-injects badges if the SPA re-renders and removes them

## Privacy

- **No data is collected** by this extension
- Item names are sent to rating providers (Google, Allocine, TMDB) to fetch ratings — no other data leaves your browser
- API keys are stored locally in Chrome's sync storage
- See [Privacy Policy](store/privacy-policy.md) for details

## Tech Stack

- [WXT](https://wxt.dev/) — web extension framework
- [TypeScript](https://www.typescriptlang.org/) — type safety
- [Bun](https://bun.sh/) — package manager and runtime
- [Vite](https://vite.dev/) — bundler (via WXT)

## License

MIT
