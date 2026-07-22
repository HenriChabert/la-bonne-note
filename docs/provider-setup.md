# Provider Setup

La Bonne Note uses external rating providers to display scores on supported platforms. Some providers require API keys, others work out of the box.

## Google Maps (restaurants, hotels)

**Requires:** API key

Google Maps ratings are shown on food delivery platforms (Deliveroo, Uber Eats, TheFork) and hotel booking sites (Booking.com).

### Getting your API key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > Library**
4. Search for **Places API (New)** and enable it
5. Go to **APIs & Services > Credentials**
6. Click **Create Credentials > API key**
7. Copy the key

### Recommended restrictions

To avoid unexpected charges, restrict your key:

- **Application restriction:** HTTP referrers — add your Chrome extension ID (`chrome-extension://YOUR_EXTENSION_ID/*`)
- **API restriction:** restrict to **Places API (New)** only

### Pricing

The extension uses a cost-optimized 2-step approach:

1. **Text Search (IDs Only)** — finds the place by name → **free** (unlimited)
2. **Place Details (Enterprise)** — fetches rating, review count, display name, Google Maps link → **$25 per 1,000 requests**

| Monthly volume | Cost per 1,000 lookups |
|---|---|
| First 1,000 | Free |
| 1,001 – 100,000 | $25.00 |
| 100,001 – 500,000 | $20.00 |

The `rating` and `userRatingCount` fields are Enterprise tier. The 2-step approach saves 29% vs a single Text Search Enterprise call ($25/1K vs $35/1K).

Google provides a [$200/month free credit](https://mapsplatform.google.com/pricing/), so combined with the 1,000 free Place Details calls, you get roughly **9,000 lookups/month at no cost**. Results are cached for 30 days to further minimize API usage.

See [Place Details field mask tiers](https://developers.google.com/maps/documentation/places/web-service/place-details#fieldmask) for details.

### Entering the key

1. Click the La Bonne Note extension icon in Chrome
2. Click **API Key Settings** (gear icon)
3. Paste your key in the **Google Maps API Key** field
4. Click **Save**

---

## TMDB (movies, TV shows)

**Requires:** API Read Access Token

TMDB (The Movie Database) ratings are shown on streaming platforms (Netflix, Disney+, Canal+, Prime Video).

### Getting your API token

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup)
2. Go to [Settings > API](https://www.themoviedb.org/settings/api)
3. Request an API key (select "Developer" usage)
4. Once approved, copy the **API Read Access Token** (the long JWT starting with `eyJhbG...`)

> **Important:** Use the **API Read Access Token** (long JWT), not the shorter "API Key". The extension uses Bearer token authentication.

### Pricing

TMDB's API is **free** for non-commercial use. See [TMDB's terms of use](https://www.themoviedb.org/documentation/api/terms-of-use) for details.

### Entering the token

1. Click the La Bonne Note extension icon in Chrome
2. Click **API Key Settings**
3. Paste your token in the **TMDB API Key** field
4. Click **Save**

---

## Allocine (movies, TV shows)

**No API key required.**

Allocine ratings are fetched automatically using Allocine's public autocomplete endpoint and page data. No setup needed — ratings appear as soon as you browse a supported streaming platform.

### How it works

1. The extension searches via Allocine's autocomplete API (`allocine.fr/_/autocomplete/`)
2. It fetches the movie/series page and extracts the rating from structured data (JSON-LD)
3. Ratings are on a **/5** scale (Allocine's standard)

### Limitations

- This uses an undocumented internal endpoint — it may break if Allocine changes their website
- Each lookup makes 2 HTTP requests (search + page), so it's slower than API-based providers
- Results are cached for 30 days to minimize requests
