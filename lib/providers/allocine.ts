import type { RatingProvider, LookupRequest, RatingResult } from "../types";

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="14" height="14"><circle cx="7" cy="7" r="6.5" fill="#FED100"/><text x="7" y="10.5" text-anchor="middle" font-size="10" font-weight="bold" font-family="Arial,sans-serif" fill="#000">A</text></svg>`;

const BASE_URL = "https://www.allocine.fr";
const AUTOCOMPLETE_URL = `${BASE_URL}/_/autocomplete/`;

function makeErrorResult(error: string): RatingResult {
  return { providerId: "allocine", rating: null, userRatingCount: null, url: null, displayName: null, providerName: "Allociné", providerIcon: ICON, error };
}

function parseRatingValue(value: string): number | null {
  const parsed = parseFloat(value.replace(",", "."));
  return isNaN(parsed) ? null : parsed;
}

function extractJsonLdRating(html: string): { rating: number | null; count: number | null } {
  const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (!blocks) return { rating: null, count: null };

  for (const block of blocks) {
    const json = block
      .replace(/<script type="application\/ld\+json">/, "")
      .replace(/<\/script>/, "");
    try {
      const data = JSON.parse(json);
      if (data?.aggregateRating) {
        const rating = parseRatingValue(String(data.aggregateRating.ratingValue));
        const count = parseInt(String(data.aggregateRating.ratingCount), 10) || null;
        return { rating, count };
      }
    } catch {
      // skip malformed blocks
    }
  }
  return { rating: null, count: null };
}

export const allocine: RatingProvider = {
  id: "allocine",
  name: "Allociné",
  icon: ICON,
  maxRating: 5,
  supportedTypes: ["movie"],

  async lookup(query: LookupRequest): Promise<RatingResult> {
    // Step 1: Search via autocomplete
    const searchRes = await fetch(
      `${AUTOCOMPLETE_URL}${encodeURIComponent(query.name)}`,
      { headers: { Accept: "*/*", Referer: `${BASE_URL}/` } },
    );

    if (!searchRes.ok) {
      return makeErrorResult("API_ERROR");
    }

    const searchData = await searchRes.json();
    const results: any[] = searchData.results ?? [];

    // Find first movie or series result (skip sponsored)
    const match = results.find(
      (r) =>
        !r.sponsored &&
        (r.entity_type === "movie" || r.entity_type === "series"),
    );
    if (!match) {
      return {
        rating: null,
        userRatingCount: null,
        url: null,
        displayName: null,
        providerId: "allocine",
      providerName: "Allociné",
        providerIcon: ICON,
      };
    }

    // Step 2: Build page URL
    const pageUrl =
      match.entity_type === "movie"
        ? `${BASE_URL}/film/fichefilm_gen_cfilm=${match.entity_id}.html`
        : `${BASE_URL}/series/ficheserie_gen_cserie=${match.entity_id}.html`;

    // Step 3: Fetch page and extract rating from JSON-LD
    const pageRes = await fetch(pageUrl, {
      headers: { Accept: "text/html" },
    });

    if (!pageRes.ok) {
      return makeErrorResult("API_ERROR");
    }

    const html = await pageRes.text();
    const { rating, count } = extractJsonLdRating(html);

    return {
      rating,
      userRatingCount: count,
      url: pageUrl,
      displayName: match.label,
      providerId: "allocine",
      providerName: "Allociné",
      providerIcon: ICON,
    };
  },
};
