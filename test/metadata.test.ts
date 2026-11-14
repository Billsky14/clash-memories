import { describe, expect, it } from 'vitest';
import { METADATA_VERSION, needsMetadataSync } from '../src/lib/metadata.ts';
import type { Account, AccountApiMetadata } from '../src/lib/types.ts';

function createAccount(api?: AccountApiMetadata): Account {
  return {
    tag: '#ABC123',
    townHall: 17,
    lastImportAt: 0,
    createdAt: 0,
    api,
    upgrades: [],
    boosts: [],
  };
}

const metadata: AccountApiMetadata = {
  name: 'Desa Uji',
  townHallLevel: 17,
  expLevel: 140,
  trophies: 0,
  bestTrophies: 2600,
  warStars: 492,
  clanTag: null,
  clanName: null,
  clanLevel: null,
  leagueName: null,
  updatedAt: 1,
  version: METADATA_VERSION,
};

describe('metadata sync targeting', () => {
  it('syncs accounts without metadata', () => {
    expect(needsMetadataSync(createAccount())).toBe(true);
  });

  it('syncs accounts with outdated or unversioned metadata once', () => {
    expect(needsMetadataSync(createAccount({ ...metadata, version: undefined }))).toBe(true);
    expect(needsMetadataSync(createAccount({ ...metadata, version: METADATA_VERSION - 1 }))).toBe(
      true,
    );
  });

  it('skips accounts whose metadata is current', () => {
    expect(needsMetadataSync(createAccount(metadata))).toBe(false);
  });
});
