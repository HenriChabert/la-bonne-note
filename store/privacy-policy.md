# Privacy Policy — La Bonne Note

**Last updated:** July 2026

## Overview

La Bonne Note is a browser extension that displays external ratings on food delivery, streaming, and hotel booking platforms. This policy explains what data the extension accesses and how it is used.

## Data Collection

**La Bonne Note does not collect, store, or transmit any personal data.**

## Data Usage

The extension processes the following data, all of which stays on your device or is sent only to third-party rating providers:

| Data | Purpose | Destination |
|------|---------|-------------|
| Restaurant/movie/hotel names | Sent to rating providers to fetch ratings | Google, Allocine, TMDB servers |
| API keys (Google Places, TMDB) | Used to authenticate API requests | Google, TMDB servers |
| Cached ratings | Stored locally to reduce API calls | Your browser (chrome.storage.local) |
| Filter settings | Stored locally for your preferences | Your browser (chrome.storage.sync) |

## Third-Party Services

The extension communicates with the following services to fetch ratings:

| Service | URL | API Key Required |
|---------|-----|-----------------|
| Google Places API | `places.googleapis.com` | Yes |
| Allocine | `www.allocine.fr` | No |
| TMDB API | `api.themoviedb.org` | Yes |

Their respective privacy policies apply:
- Google: https://policies.google.com/privacy
- TMDB: https://www.themoviedb.org/privacy-policy

## Permissions

| Permission | Reason |
|-----------|--------|
| `storage` | Save API keys, filter settings, and cached ratings locally |
| `activeTab` | Detect which site you're on to show relevant filter controls |
| `host_permissions` for rating APIs | Fetch ratings from Google Places, Allocine, and TMDB |
| Content script on supported sites | Read item names from the page and inject rating badges |

## Data Retention

- Cached ratings are stored locally for 30 days, then automatically refreshed.
- API keys and filter settings persist until you remove them or uninstall the extension.
- Uninstalling the extension deletes all locally stored data.

## Contact

For questions about this privacy policy, open an issue at https://github.com/HenriChabert/la-bonne-note.
