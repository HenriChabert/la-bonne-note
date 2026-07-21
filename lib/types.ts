export type ResourceType = "restaurant" | "movie";

export interface SiteAdapter {
  id: string;
  hostPattern: string; // substring matched against hostname
  match(): boolean;
  resourceType: ResourceType;
  cardSelector: string;
  getName(card: Element): string | null;
  getCity(): string;
  getAddress?(card: Element): string | null;
  getInjectionAnchor(card: Element): Element | null;
  insertBadge(anchor: Element, badge: HTMLElement): void;
}

export interface RatingResult {
  providerId: string;
  rating: number | null;
  userRatingCount: number | null;
  url: string | null;
  displayName: string | null;
  providerName: string;
  providerIcon: string;
  error?: string;
}

export interface LookupRequest {
  name: string;
  city: string;
  address?: string | null;
  resourceType: ResourceType;
}

export interface ProviderMeta {
  id: string;
  name: string;
  icon: string;
  maxRating: number; // e.g. 5 for Google Maps, 10 for TMDB/Allocine
  apiKeySettingName?: string;
  apiKeyPlaceholder?: string;
  supportedTypes: ResourceType[];
}

export interface RatingProvider extends ProviderMeta {
  lookup(query: LookupRequest, apiKey: string): Promise<RatingResult>;
}

export interface ProviderFilter {
  minRating: number;
  minReviews: number;
}

export interface FilterSettings {
  providers: Record<string, ProviderFilter>; // keyed by provider id
  mode: "dim" | "hide";
}
