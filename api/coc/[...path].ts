const UPSTREAM_TIMEOUT_MS = 15_000;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function proxyUnavailable(message: string): Response {
  return json(503, {
    error: {
      code: 'proxy_unavailable',
      message,
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const baseUrl = process.env.LOCAL_COC_API_URL?.trim().replace(/\/+$/, '');
  const secret = process.env.COC_PROXY_SECRET?.trim();

  if (!baseUrl || !secret) {
    return proxyUnavailable('Layanan desa belum dikonfigurasi di server.');
  }

  const incoming = new URL(request.url);
  const path = incoming.pathname.replace(/^\/api\/coc/, '');
  const target = `${baseUrl}/api/coc${path}${incoming.search}`;

  let upstream: Response;

  try {
    upstream = await fetch(target, {
      headers: {
        Accept: 'application/json',
        'x-coc-proxy-secret': secret,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return proxyUnavailable(
      'Backend desa sedang tidak dapat dihubungi. Pastikan backend dan Funnel berjalan.',
    );
  }

  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
