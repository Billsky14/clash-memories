import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../api/coc/[...path].ts';

const TOKEN = 'test-token';
const DEFAULT_BASE = 'https://cocproxy.royaleapi.dev/v1';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Vercel CoC proxy', () => {
  it('forwards player requests to RoyaleAPI with the bearer token', async () => {
    vi.stubEnv('COC_API_TOKEN', TOKEN);
    vi.stubEnv('COC_API_BASE', '');
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse({ tag: '#ABC123', name: 'Desa Uji' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(
      new Request('https://app.example/api/coc/players/%23ABC123?refresh=1'),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${DEFAULT_BASE}/players/%23ABC123?refresh=1`,
    );
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tag: '#ABC123', name: 'Desa Uji' });
  });

  it('uses a custom API base and trims trailing slashes', async () => {
    vi.stubEnv('COC_API_TOKEN', TOKEN);
    vi.stubEnv('COC_API_BASE', 'https://backend.example.ts.net/v1/');
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse({ tag: '#ABC123', name: 'Desa Uji' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await GET(new Request('https://app.example/api/coc/players/%23ABC123'));

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://backend.example.ts.net/v1/players/%23ABC123',
    );
  });

  it('returns status without calling the upstream API', async () => {
    vi.stubEnv('COC_API_TOKEN', TOKEN);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('https://app.example/api/coc/status'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ configured: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports configured false when the token is missing', async () => {
    vi.stubEnv('COC_API_TOKEN', '');

    const response = await GET(new Request('https://app.example/api/coc/status'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ configured: false });
  });

  it('rejects player requests when the token is missing', async () => {
    vi.stubEnv('COC_API_TOKEN', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(
      new Request('https://app.example/api/coc/players/%23ABC123'),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: 'token_missing' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps an invalid IP error and keeps the rejected IP in the message', async () => {
    vi.stubEnv('COC_API_TOKEN', TOKEN);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            reason: 'accessDenied.invalidIp',
            message:
              'Invalid authorization: API key does not allow access from IP 45.79.218.79',
          },
          403,
        ),
      ),
    );

    const response = await GET(
      new Request('https://app.example/api/coc/players/%23ABC123'),
    );
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('invalid_ip');
    expect(body.error.message).toContain('45.79.218.79');
    expect(body.error.message).toContain('developer.clashofclans.com');
  });

  it('maps not found and rate limit responses', async () => {
    vi.stubEnv('COC_API_TOKEN', TOKEN);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ reason: 'notFound' }, 404)),
    );
    const notFound = await GET(
      new Request('https://app.example/api/coc/players/%23ABC123'),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ reason: 'rateLimitExceeded' }, 429)),
    );
    const rateLimited = await GET(
      new Request('https://app.example/api/coc/players/%23ABC123'),
    );

    expect(notFound.status).toBe(404);
    expect(await notFound.json()).toMatchObject({
      error: { code: 'not_found' },
    });
    expect(rateLimited.status).toBe(429);
    expect(await rateLimited.json()).toMatchObject({
      error: { code: 'rate_limited' },
    });
  });

  it('returns proxy_unavailable when the upstream cannot be reached', async () => {
    vi.stubEnv('COC_API_TOKEN', TOKEN);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );

    const response = await GET(
      new Request('https://app.example/api/coc/players/%23ABC123'),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: 'proxy_unavailable' },
    });
  });

  it('rejects unknown endpoints and invalid tags without calling upstream', async () => {
    vi.stubEnv('COC_API_TOKEN', TOKEN);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const unknown = await GET(
      new Request('https://app.example/api/coc/clans/%23ABC123'),
    );
    const invalidTag = await GET(
      new Request('https://app.example/api/coc/players/not-a-tag'),
    );

    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toMatchObject({
      error: { code: 'not_found' },
    });
    expect(invalidTag.status).toBe(400);
    expect(await invalidTag.json()).toMatchObject({
      error: { code: 'invalid_tag' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
