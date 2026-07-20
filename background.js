const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "LOOKUP_RESTAURANT") {
    lookupRestaurant(msg.name, msg.city, msg.address).then(sendResponse);
    return true; // keep channel open for async response
  }
});

async function lookupRestaurant(name, city, address) {
  const cacheKey = `gmaps:${name}:${city}`.toLowerCase();

  // Check cache
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey]) {
    const entry = cached[cacheKey];
    if (Date.now() - entry.ts < CACHE_TTL_MS) {
      return entry.data;
    }
  }

  // Get API key
  const { placesApiKey } = await chrome.storage.sync.get("placesApiKey");
  if (!placesApiKey) {
    return { error: "NO_API_KEY" };
  }

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": placesApiKey,
          "X-Goog-FieldMask":
            "places.displayName,places.rating,places.userRatingCount,places.googleMapsUri",
        },
        body: JSON.stringify({
          textQuery: address
            ? `${name} ${address}`
            : `${name} restaurant ${city}`,
          languageCode: "fr",
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Places API error:", res.status, text);
      return { error: "API_ERROR", status: res.status };
    }

    const json = await res.json();
    const place = json.places?.[0];

    if (!place) {
      const data = { rating: null, userRatingCount: null, googleMapsUri: null };
      await chrome.storage.local.set({ [cacheKey]: { data, ts: Date.now() } });
      return data;
    }

    const data = {
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? null,
      googleMapsUri: place.googleMapsUri ?? null,
      displayName: place.displayName?.text ?? null,
    };

    await chrome.storage.local.set({ [cacheKey]: { data, ts: Date.now() } });
    return data;
  } catch (err) {
    console.error("Places API fetch failed:", err);
    return { error: "NETWORK_ERROR" };
  }
}
