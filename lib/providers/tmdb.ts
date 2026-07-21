import type { RatingProvider, LookupRequest, RatingResult } from "../types";

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="14" height="14"><rect rx="3" width="14" height="14" fill="#01b4e4"/><text x="7" y="10.5" text-anchor="middle" font-size="7" font-weight="bold" font-family="Arial,sans-serif" fill="#fff">TM</text></svg>`;

const API_BASE = "https://api.themoviedb.org/3";
const SITE_BASE = "https://www.themoviedb.org";

function makeErrorResult(error: string): RatingResult {
  return { providerId: "tmdb", rating: null, userRatingCount: null, url: null, displayName: null, providerName: "TMDB", providerIcon: ICON, error };
}

export const tmdb: RatingProvider = {
  id: "tmdb",
  name: "TMDB",
  icon: ICON,
  maxRating: 10,
  supportedTypes: ["movie"],
  apiKeySettingName: "tmdbApiKey",
  apiKeyPlaceholder: "eyJhbG...",

  async lookup(query: LookupRequest, apiKey: string): Promise<RatingResult> {
    const params = new URLSearchParams({
      query: query.name,
      language: "fr-FR",
      include_adult: "false",
    });

    const res = await fetch(`${API_BASE}/search/multi?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      return makeErrorResult("API_ERROR");
    }

    const data = await res.json();
    const results: any[] = data.results ?? [];

    const match = results.find(
      (r) => r.media_type === "movie" || r.media_type === "tv",
    );
    if (!match) {
      return {
        rating: null,
        userRatingCount: null,
        url: null,
        displayName: null,
        providerId: "tmdb",
        providerName: "TMDB",
        providerIcon: ICON,
      };
    }

    const displayName = match.title ?? match.name ?? null;
    const urlPath = match.media_type === "movie" ? "movie" : "tv";
    const url = `${SITE_BASE}/${urlPath}/${match.id}`;

    const rating = match.vote_average != null ? Math.round(match.vote_average * 10) / 10 : null;

    return {
      providerId: "tmdb",
      rating,
      userRatingCount: match.vote_count ?? null,
      url,
      displayName,
      providerName: "TMDB",
      providerIcon: ICON,
    };
  },
};
