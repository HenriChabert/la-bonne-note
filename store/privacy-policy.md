# Privacy Policy — La Bonne Note

**Last updated:** July 2026

## Overview

La Bonne Note is a browser extension that displays Google Maps ratings on food delivery platforms. This policy explains what data the extension accesses and how it is used.

## Data Collection

**La Bonne Note does not collect, store, or transmit any personal data.**

## Data Usage

The extension processes the following data, all of which stays on your device or is sent only to Google:

| Data | Purpose | Destination |
|------|---------|-------------|
| Restaurant names | Sent to Google Places API to fetch ratings | Google servers |
| Google Places API key | Used to authenticate API requests | Google servers |
| Cached ratings | Stored locally to reduce API calls | Your browser (chrome.storage.local) |
| Filter settings | Stored locally for your preferences | Your browser (chrome.storage.sync) |

## Third-Party Services

The extension communicates exclusively with the **Google Places API** (`places.googleapis.com`). No other third-party services are contacted.

Google's privacy policy applies to data processed by their API: https://policies.google.com/privacy

## Permissions

| Permission | Reason |
|-----------|--------|
| `storage` | Save your API key, filter settings, and cached ratings locally |
| `host_permissions` for `places.googleapis.com` | Make API requests to fetch Google Maps ratings |
| Content script on supported sites | Read restaurant names from the page and inject rating badges |

## Data Retention

- Cached ratings are stored locally for 7 days, then automatically refreshed.
- Your API key and filter settings persist until you remove them or uninstall the extension.
- Uninstalling the extension deletes all locally stored data.

## Contact

For questions about this privacy policy, open an issue on the project's GitHub repository.
