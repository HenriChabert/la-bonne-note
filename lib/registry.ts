import { deliveroo } from "./sites/deliveroo";
import { ubereats } from "./sites/ubereats";
import { thefork } from "./sites/thefork";
import { netflix } from "./sites/netflix";
import { disneyplus } from "./sites/disneyplus";
import { canalplus } from "./sites/canalplus";
import { primevideo } from "./sites/primevideo";
import { booking } from "./sites/booking";
import { googleMaps } from "./providers/google-maps";
import { allocine } from "./providers/allocine";
import { tmdb } from "./providers/tmdb";
import type { SiteAdapter, RatingProvider, ProviderMeta, ResourceType } from "./types";

export const sites: SiteAdapter[] = [deliveroo, ubereats, thefork, netflix, disneyplus, canalplus, primevideo, booking];

export const providers: RatingProvider[] = [googleMaps, allocine, tmdb];

export function getActiveSite(): SiteAdapter | undefined {
  return sites.find((s) => s.match());
}

export function getProvidersForType(type: ResourceType): RatingProvider[] {
  return providers.filter((p) => p.supportedTypes.includes(type));
}

export function getProvidersMeta(): ProviderMeta[] {
  return providers.map(({ id, name, icon, maxRating, apiKeySettingName, apiKeyPlaceholder, supportedTypes }) => ({
    id, name, icon, maxRating, apiKeySettingName, apiKeyPlaceholder, supportedTypes,
  }));
}

/** Match a URL hostname to a site adapter (works outside content scripts) */
export function getSiteForHostname(hostname: string): SiteAdapter | undefined {
  return sites.find((s) => hostname.includes(s.hostPattern));
}
