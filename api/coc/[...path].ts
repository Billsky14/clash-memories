const DEFAULT_API_BASE = 'https://cocproxy.royaleapi.dev/v1';
const UPSTREAM_TIMEOUT_MS = 15_000;
const PLAYER_TAG_PATTERN = /^#[0-9A-Z]{3,15}$/;

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

function errorResponse(status: number, code: string, message: string): Response {
  return json(status, {
    error: {
      code,
      message,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: Record<string, unknown>, key: string): string {
  const entry = value[key];
  return typeof entry === 'string' ? entry : '';
}

function getUpstreamIp(payload: unknown): string | null {
  if (!isRecord(payload)) return null;

  const message = readString(payload, 'message');
  const match = /from IP\s+([0-9a-fA-F:.]+)/i.exec(message);
  return match ? match[1] : null;
}

function mapUpstreamError(status: number, payload: unknown): Response {
  if (!isRecord(payload)) {
    return errorResponse(
      status >= 400 && status <= 599 ? status : 502,
      'upstream_error',
      'API Supercell mengembalikan kesalahan. Coba lagi beberapa saat lagi.',
    );
  }

  const detail = `${readString(payload, 'reason')} ${readString(payload, 'message')}`.toLowerCase();

  if (status === 401 || status === 403) {
    if (detail.includes('invalidip') || detail.includes('invalid ip')) {
      const ip = getUpstreamIp(payload);
      const subject = ip ? `IP pemanggil (${ip})` : 'IP pemanggil';

      return errorResponse(
        403,
        'invalid_ip',
        `${subject} belum terdaftar di token API Supercell. Tambahkan IP tersebut di developer.clashofclans.com lalu coba lagi.`,
      );
    }

    return errorResponse(
      403,
      'access_denied',
      'Token API Supercell ditolak. Pastikan token masih aktif dan IP pemanggil sudah di-allowlist.',
    );
  }

  if (status === 404) {
    return errorResponse(404, 'not_found', 'Desa tidak ditemukan. Pastikan tag desa sudah benar.');
  }

  if (status === 429) {
    return errorResponse(
      429,
      'rate_limited',
      'Batas permintaan API Supercell tercapai. Coba lagi beberapa saat lagi.',
    );
  }

  if (status >= 500) {
    return errorResponse(
      503,
      'upstream_unavailable',
      'API Supercell sedang tidak tersedia. Coba lagi nanti.',
    );
  }

  return errorResponse(
    status >= 400 && status <= 599 ? status : 502,
    'upstream_error',
    'API Supercell mengembalikan kesalahan. Coba lagi beberapa saat lagi.',
  );
}

export async function GET(request: Request): Promise<Response> {
  const token = process.env.COC_API_TOKEN?.trim();
  const configuredBase = process.env.COC_API_BASE?.trim();
  const baseUrl = (configuredBase || DEFAULT_API_BASE).replace(/\/+$/, '');

  const incoming = new URL(request.url);
  const path = incoming.pathname.replace(/^\/api\/coc/, '');

  if (path === '/status' || path === '/status/') {
    return json(200, { configured: Boolean(token) });
  }

  if (!token) {
    return errorResponse(
      503,
      'token_missing',
      'Token API belum diset di environment server. Tambahkan COC_API_TOKEN lalu deploy ulang.',
    );
  }

  const playerMatch = /^\/players\/([^/]+)$/.exec(path);

  if (!playerMatch) {
    return errorResponse(404, 'not_found', 'Endpoint API tidak dikenal.');
  }

  let rawTag: string;

  try {
    rawTag = decodeURIComponent(playerMatch[1]).trim().toUpperCase();
  } catch {
    return errorResponse(400, 'invalid_tag', 'Tag desa tidak valid.');
  }

  const tag = rawTag.startsWith('#') ? rawTag : `#${rawTag}`;

  if (!PLAYER_TAG_PATTERN.test(tag)) {
    return errorResponse(
      400,
      'invalid_tag',
      'Tag desa tidak valid. Gunakan format seperti #ABC123.',
    );
  }

  const target = `${baseUrl}/players/${encodeURIComponent(tag)}${incoming.search}`;

  let upstream: Response;

  try {
    upstream = await fetch(target, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return errorResponse(
      503,
      'proxy_unavailable',
      'Layanan desa sedang tidak dapat dihubungi. Coba lagi beberapa saat lagi.',
    );
  }

  const text = await upstream.text();
  let payload: unknown = null;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }

  if (!upstream.ok) {
    return mapUpstreamError(upstream.status, payload);
  }

  if (payload === null) {
    return errorResponse(
      502,
      'invalid_response',
      'Respons API Supercell tidak dikenali. Coba lagi beberapa saat lagi.',
    );
  }

  return json(200, payload);
}
