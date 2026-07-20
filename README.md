# La Bonne Note

Chrome extension that displays Google Maps ratings directly on food delivery and restaurant booking platforms.

## Features

- **Google Maps ratings** shown on every restaurant card (rating, review count, link to Google Maps)
- **Filter restaurants** by minimum rating or review count — hide or dim low-rated places
- **Live updates** — change filters without reloading the page
- **Smart caching** — results cached for 7 days to minimize API usage
- **Multi-platform support:**
  - [Deliveroo.fr](https://deliveroo.fr)
  - [Uber Eats](https://ubereats.com)
  - [TheFork / LaFourchette](https://thefork.fr)

## Installation

### From the Chrome Web Store

> Coming soon

### From source (Developer mode)

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the project folder

## Setup

1. **Get a Google Places API key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project (or use an existing one)
   - Enable the **Places API (New)**
   - Go to **Credentials** and create an API key
   - (Recommended) Restrict the key to the Places API only

2. **Configure the extension:**
   - Click the La Bonne Note icon in your Chrome toolbar
   - Paste your API key and click **Save**
   - Optionally set a minimum rating and review count filter

3. **Browse** Deliveroo, Uber Eats, or TheFork — ratings appear automatically

## API Usage & Costs

The extension uses the [Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service/overview) Text Search endpoint.

- Google provides **$200/month of free credit**, which covers ~5,000 lookups
- Results are **cached locally for 7 days**, so revisiting the same restaurants costs nothing
- Requests are staggered to avoid rate limits

## Privacy

- **No data is collected** by this extension
- Restaurant names are sent to the Google Places API to fetch ratings — no other data leaves your browser
- Your API key is stored locally in Chrome's sync storage
- See [Privacy Policy](store/privacy-policy.md) for details

## Project Structure

```
├── manifest.json      # Extension manifest (Manifest V3)
├── background.js      # Service worker: API calls + caching
├── content.js         # Content script: DOM injection + filtering
├── styles.css         # Badge + filter styles
├── popup.html/js      # Settings popup (API key, filters)
├── icons/             # Extension icons (16, 48, 128px)
├── store/             # Chrome Web Store assets
└── package.sh         # Build script for store submission
```

## License

MIT
