import type { RatingProvider, LookupRequest, RatingResult } from "../types";
import ICON from "@/assets/icons/google_maps.ico";

function makeError(error: string): RatingResult {
  return { providerId: "google-maps", rating: null, userRatingCount: null, url: null, displayName: null, providerName: "Google Maps", providerIcon: ICON, error };
}

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

    // Step 1: Text Search (IDs Only) — FREE tier
    const searchRes = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id",
        },
        body: JSON.stringify({ textQuery, languageCode: "fr" }),
      },
    );

    if (!searchRes.ok) {
      console.error("Places Text Search error:", searchRes.status);
      return makeError("API_ERROR");
    }

    const searchJson = await searchRes.json();
    const placeId: string | undefined = searchJson.places?.[0]?.id;

    if (!placeId) {
      return { providerId: "google-maps", rating: null, userRatingCount: null, url: null, displayName: null, providerName: "Google Maps", providerIcon: ICON };
    }

    // Step 2: Place Details — Enterprise tier ($25/1K instead of $35/1K)
    const detailRes = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "displayName,rating,userRatingCount,googleMapsUri",
        },
      },
    );

    if (!detailRes.ok) {
      console.error("Places Detail error:", detailRes.status);
      return makeError("API_ERROR");
    }

    const place = await detailRes.json();

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
