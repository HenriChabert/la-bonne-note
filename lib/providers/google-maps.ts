import type { RatingProvider, LookupRequest, RatingResult } from "../types";
import ICON from "@/assets/icons/google_maps.ico";

export const googleMaps: RatingProvider = {
  id: "google-maps",
  name: "Google Maps",
  icon: ICON,
  maxRating: 5,
  supportedTypes: ["restaurant", "hotel"],
  apiKeySettingName: "placesApiKey",
  apiKeyPlaceholder: "AIza...",

  async lookup(query: LookupRequest, apiKey: string): Promise<RatingResult> {
    const textQuery = query.address
      ? `${query.name} ${query.address}`
      : `${query.name} ${query.resourceType} ${query.city}`;

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
