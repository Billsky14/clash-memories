import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPlayer, toAccountMetadata } from '../src/lib/cocApi.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

const BASE_PLAYER = {
  tag: '#ABC123',
  name: 'Desa Uji',
  townHallLevel: 17,
  expLevel: 140,
  trophies: 2500,
  bestTrophies: 2600,
  warStars: 492,
  clan: {
    tag: '#2Y0',
    name: 'Uji Clan',
    clanLevel: 10,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CoC player mapping', () => {
  it('reads the league name from leagueTier', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({
        ...BASE_PLAYER,
        leagueTier: { name: 'P.E.K.K.A League 23' },
        league: null,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const player = await getPlayer('#ABC123', true);

    expect(fetchMock.mock.calls[0][0]).toBe('/api/coc/players/%23ABC123?refresh=1');
    expect(player.leagueName).toBe('P.E.K.K.A League 23');
    expect(player.clan).toEqual(BASE_PLAYER.clan);
  });

  it('falls back to the legacy league object', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          ...BASE_PLAYER,
          league: { name: 'Titan League' },
        }),
      ),
    );

    const player = await getPlayer('#ABC123');

    expect(player.leagueName).toBe('Titan League');
  });

  it('returns null when no league is present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          ...BASE_PLAYER,
          clan: undefined,
        }),
      ),
    );

    const player = await getPlayer('#ABC123');

    expect(player.leagueName).toBeNull();
    expect(player.clan).toBeNull();
  });

  it('maps player data into account metadata', () => {
    const metadata = toAccountMetadata(
      {
        ...BASE_PLAYER,
        leagueName: 'P.E.K.K.A League 23',
      },
      1_700_000_000_000,
    );

    expect(metadata).toEqual({
      name: 'Desa Uji',
      townHallLevel: 17,
      expLevel: 140,
      trophies: 2500,
      bestTrophies: 2600,
      warStars: 492,
      clanTag: '#2Y0',
      clanName: 'Uji Clan',
      clanLevel: 10,
      leagueName: 'P.E.K.K.A League 23',
      updatedAt: 1_700_000_000_000,
      version: 1,
    });
  });
});
