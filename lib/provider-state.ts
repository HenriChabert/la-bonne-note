import type { ProviderMeta } from "./types";

/** Storage key for a provider's enabled state */
export function providerEnabledKey(providerId: string): string {
  return `provider:${providerId}:enabled`;
}

export interface ProviderState {
  enabled: boolean;
  misconfigured: boolean;
  active: boolean; // enabled && !misconfigured
}

/**
 * Resolve the effective state for a single provider.
 * `storageData` must contain all relevant keys (provider enabled flags + API key values).
 */
export function resolveProviderState(
  provider: ProviderMeta,
  storageData: Record<string, unknown>,
): ProviderState {
  const needsKey = !!provider.apiKeySettingName;
  const hasKey = needsKey ? !!storageData[provider.apiKeySettingName!] : true;
  const misconfigured = needsKey && !hasKey;

  const key = providerEnabledKey(provider.id);
  let enabled: boolean;
  if (key in storageData && storageData[key] != null) {
    enabled = storageData[key] as boolean;
  } else {
    enabled = !misconfigured;
  }

  return { enabled, misconfigured, active: enabled && !misconfigured };
}

/** Resolve states for multiple providers at once. */
export function resolveAllProviderStates(
  providers: ProviderMeta[],
  storageData: Record<string, unknown>,
): Map<string, ProviderState> {
  const map = new Map<string, ProviderState>();
  for (const p of providers) {
    map.set(p.id, resolveProviderState(p, storageData));
  }
  return map;
}

/** Return the list of storage keys needed to resolve all provider states. */
export function providerStateStorageKeys(providers: ProviderMeta[]): string[] {
  const keys: string[] = [];
  for (const p of providers) {
    keys.push(providerEnabledKey(p.id));
    if (p.apiKeySettingName) {
      keys.push(p.apiKeySettingName);
    }
  }
  return keys;
}
