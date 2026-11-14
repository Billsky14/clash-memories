import type { Account } from './types.ts';

/**
 * Bump this when the stored API metadata shape needs to be refreshed once for
 * every village. Accounts without the current version are synced on next load.
 */
export const METADATA_VERSION = 1;

export function needsMetadataSync(account: Account): boolean {
  return !account.api || account.api.version !== METADATA_VERSION;
}
