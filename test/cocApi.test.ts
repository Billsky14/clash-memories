import { describe, expect, it, vi } from 'vitest';
import { createCocApi } from '../server/cocApi.ts';

const NOW = 1_800_000_000_000;

const playerPayload = {
  tag: '#ABC123',
  name: 'Desa Uji',
  townHallLevel: 15,
  expLevel: 200,
  trophies: 5000,
  bestTrophies: 5200,
  warStars: 900,
  clan: {
    tag: '#CLAN99',
    name: 'Clan Uji',
    clanLevel: 10,
  },
  leagueTier: {
    name: 'Titan League',
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('coc API proxy', () => {
  it('normalizes a player and encodes the tag for Supercell', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse(playerPayload),
    );
    const api = createCocApi({
      token: 'secret-token',
      fetchImpl: fetchMock,
      now: () => NOW,
    });

    const result = await api.handle('/players/pr88uuyql');

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      tag: '#ABC123',
      name: 'Desa Uji',
      townHallLevel: 15,
      expLevel: 200,
      trophies: 5000,
      bestTrophies: 5200,
      warStars: 900,
      clan: {
        tag: '#CLAN99',
        name: 'Clan Uji',
        clanLevel: 10,
      },
      leagueName: 'Titan League',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.clashofclans.com/v1/players/%23PR88UUYQL',
    );
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      Authorization: 'Bearer secret-token',
    });
  });

  it('reports whether the token is configured', async () => {
    const configured = createCocApi({ token: 'secret-token' });
    const missing = createCocApi({ token: '' });

    expect((await configured.handle('/status')).body).toEqual({ configured: true });
    expect((await missing.handle('/status')).body).toEqual({ configured: false });
  });

  it('rejects invalid tags without calling Supercell', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(playerPayload));
    const api = createCocApi({ token: 'secret-token', fetchImpl: fetchMock });

    const result = await api.handle('/players/bad tag');

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      error: {
        code: 'invalid_tag',
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps an IP allowlist failure to a helpful message with the rejected IP', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          reason: 'accessDenied.invalidIp',
          message:
            'Invalid authorization: API key does not allow access from IP 203.0.113.10',
        },
        403,
      ),
    );
    const api = createCocApi({ token: 'secret-token', fetchImpl: fetchMock });

    const result = await api.handle('/players/%23ABC123');

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({
      error: {
        code: 'invalid_ip',
      },
    });
    expect(JSON.stringify(result.body)).toContain('203.0.113.10');
    expect(JSON.stringify(result.body)).toContain('developer.clashofclans.com');
  });

  it('maps not found and rate limit responses', async () => {
    const notFound = createCocApi({
      token: 'secret-token',
      fetchImpl: vi.fn(async () => jsonResponse({ reason: 'notFound' }, 404)),
    });
    const rateLimited = createCocApi({
      token: 'secret-token',
      fetchImpl: vi.fn(async () => jsonResponse({ reason: 'rateLimitExceeded' }, 429)),
    });

    expect((await notFound.handle('/players/%23ABC123')).body).toMatchObject({
      error: {
        code: 'not_found',
      },
    });
    expect((await rateLimited.handle('/players/%23ABC123')).body).toMatchObject({
      error: {
        code: 'rate_limited',
      },
    });
  });

  it('requires a token before calling Supercell', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(playerPayload));
    const api = createCocApi({ token: '   ', fetchImpl: fetchMock });

    const result = await api.handle('/players/%23ABC123');

    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({
      error: {
        code: 'token_missing',
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('caches player responses and supports a manual refresh', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(playerPayload));
    const api = createCocApi({
      token: 'secret-token',
      fetchImpl: fetchMock,
      now: () => NOW,
      cacheTtlMs: 60_000,
    });

    const first = await api.handle('/players/%23ABC123');
    const cached = await api.handle('/players/%23ABC123');
    const refreshed = await api.handle('/players/%23ABC123?refresh=1');

    expect(first.cache).toBe('miss');
    expect(cached.cache).toBe('hit');
    expect(refreshed.cache).toBe('miss');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns 404 for unknown proxy paths', async () => {
    const api = createCocApi({ token: 'secret-token' });

    const result = await api.handle('/clans/%23ABC123');

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({
      error: {
        code: 'not_found',
      },
    });
  });
});
