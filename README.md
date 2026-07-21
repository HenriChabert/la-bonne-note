# La Bonne Note

Chrome extension that overlays external ratings on food delivery and streaming platforms.

## Features

- **Multi-provider ratings** — Google Maps for restaurants, Allocine and TMDB for movies/TV shows
- **Per-provider filtering** — set minimum rating and review count per provider, hide or dim low-rated items
- **Live updates** — change filters without reloading the page
- **Smart caching** — results cached for 7 days to minimize API usage
- **Multiple badges** — see ratings from all relevant providers side by side
- **Supported platforms:**
  - **Food delivery:** [Deliveroo.fr](https://deliveroo.fr), [Uber Eats](https://ubereats.com), [TheFork](https://thefork.fr)
  - **Streaming:** [Netflix](https://netflix.com), [Disney+](https://disneyplus.com), [Canal+](https://canalplus.com), [Amazon Prime Video](https://primevideo.com)

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
bun run dev       # Start dev mode with HMR
bun run build     # Production build
bun run zip       # Create distributable zip in .output/
```

Or via the Makefile: `make dev`, `make build`, `make package`, `make clean`.

## Setup

1. **Configure API keys** (via extension icon > "API Key Settings"):
   - **Google Places API key** — for restaurant ratings ([get one here](https://console.cloud.google.com/apis/credentials))
   - **TMDB API key** — for movie/TV ratings ([get one here](https://www.themoviedb.org/settings/api))
   - **Allocine** — works without an API key

2. **Set filters** (via extension icon):
   - Set minimum rating per provider (sliders adapt to each provider's scale)
   - Set minimum review count
   - Choose to dim or hide items below threshold

3. **Browse** any supported platform — ratings appear automatically

## Privacy

- **No data is collected** by this extension
- Item names are sent to rating providers (Google, Allocine, TMDB) to fetch ratings — no other data leaves your browser
- API keys are stored locally in Chrome's sync storage
- See [Privacy Policy](store/privacy-policy.md) for details

## Project Structure

```
├── wxt.config.ts              # WXT configuration (manifest, permissions)
├── package.json               # Scripts: dev, build, zip
├── entrypoints/
│   ├── background.ts          # Service worker: provider dispatch + caching
│   ├── content.ts             # Content script: detect site, inject badges
│   ├── popup/                 # Filter controls (per-provider sliders)
│   └── options/               # Settings page (API keys, cache, log level)
├── lib/
│   ├── types.ts               # SiteAdapter & RatingProvider interfaces
│   ├── registry.ts            # Register all sites + providers
│   ├── badge.ts               # Badge DOM builder
│   ├── filter.ts              # Per-provider filter logic
│   ├── cache.ts               # Cache utilities
│   ├── logger.ts              # Configurable logging
│   ├── sites/                 # One file per supported platform
│   │   ├── deliveroo.ts
│   │   ├── ubereats.ts
│   │   ├── thefork.ts
│   │   ├── netflix.ts
│   │   ├── disneyplus.ts
│   │   ├── canalplus.ts
│   │   └── primevideo.ts
│   └── providers/             # One file per rating source
│       ├── google-maps.ts
│       ├── allocine.ts
│       └── tmdb.ts
├── assets/                    # CSS styles
├── public/icons/              # Extension icons
└── store/                     # Chrome Web Store assets
```

## Adding a new site

Create a new file in `lib/sites/` implementing the `SiteAdapter` interface, register it in `lib/registry.ts`, and add the URL pattern to `entrypoints/content.ts` matches.

## Adding a new rating provider

Create a new file in `lib/providers/` implementing the `RatingProvider` interface and register it in `lib/registry.ts`. The settings page and popup filters will pick it up automatically.

## Tech Stack

- [WXT](https://wxt.dev/) — web extension framework
- [TypeScript](https://www.typescriptlang.org/) — type safety
- [Bun](https://bun.sh/) — package manager and runtime
- [Vite](https://vite.dev/) — bundler (via WXT)

## License

MIT
