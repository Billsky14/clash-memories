import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../api/coc/[...path].ts';

const BASE_URL = 'https://backend.example.ts.net';
const SECRET = 'test-secret';

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
  it('forwards the request to the backend with the secret header', async () => {
    vi.stubEnv('LOCAL_COC_API_URL', `${BASE_URL}/`);
    vi.stubEnv('COC_PROXY_SECRET', SECRET);
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse({ tag: '#ABC123', name: 'Desa Uji' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(
      new Request('https://app.example/api/coc/players/%23ABC123?refresh=1'),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${BASE_URL}/api/coc/players/%23ABC123?refresh=1`,
    );
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      'x-coc-proxy-secret': SECRET,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tag: '#ABC123', name: 'Desa Uji' });
  });

  it('returns proxy_unavailable when the backend URL is missing', async () => {
    vi.stubEnv('LOCAL_COC_API_URL', '');
    vi.stubEnv('COC_PROXY_SECRET', SECRET);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('https://app.example/api/coc/status'));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: 'proxy_unavailable' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns proxy_unavailable when the backend cannot be reached', async () => {
    vi.stubEnv('LOCAL_COC_API_URL', BASE_URL);
    vi.stubEnv('COC_PROXY_SECRET', SECRET);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );

    const response = await GET(new Request('https://app.example/api/coc/status'));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: 'proxy_unavailable' },
    });
  });
});
