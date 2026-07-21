import type { RatingProvider, LookupRequest, RatingResult } from "../types";

// Google Maps pin icon (simplified)
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" fill="#EA4335"/></svg>`;

export const googleMaps: RatingProvider = {
  id: "google-maps",
  name: "Google Maps",
  icon: ICON,
  maxRating: 5,
  supportedTypes: ["restaurant"],
  apiKeySettingName: "placesApiKey",
  apiKeyPlaceholder: "AIza...",

  async lookup(query: LookupRequest, apiKey: string): Promise<RatingResult> {
    const textQuery = query.address
      ? `${query.name} ${query.address}`
      : `${query.name} restaurant ${query.city}`;

    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.displayName,places.rating,places.userRatingCount,places.googleMapsUri",
        },
        body: JSON.stringify({ textQuery, languageCode: "fr" }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Places API error:", res.status, text);
      return {
        rating: null,
        userRatingCount: null,
        url: null,
        displayName: null,
        providerId: "google-maps",
        providerName: "Google Maps",
        providerIcon: ICON,
        error: "API_ERROR",
      };
    }

    const json = await res.json();
    const place = json.places?.[0];

    return {
      providerId: "google-maps",
      rating: place?.rating ?? null,
      userRatingCount: place?.userRatingCount ?? null,
      url: place?.googleMapsUri ?? null,
      displayName: place?.displayName?.text ?? null,
      providerName: "Google Maps",
      providerIcon: ICON,
    };
  },
};
