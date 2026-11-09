import { normalizeTag } from '../src/lib/accountImport.ts';

const COC_API_BASE = 'https://api.clashofclans.com/v1';
const DEFAULT_CACHE_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;

export type CocPlayerSummary = {
  tag: string;
  name: string;
  townHallLevel: number;
  expLevel: number;
  trophies: number;
  bestTrophies: number;
  warStars: number;
  clan: {
    tag: string;
    name: string;
    clanLevel: number;
  } | null;
  leagueName: string | null;
};

export type CocApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export type CocApiResult = {
  status: number;
  body: CocPlayerSummary | { configured: boolean } | CocApiErrorBody;
  cache?: 'hit' | 'miss';
};

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export type CocApiOptions = {
  token?: string;
  fetchImpl?: FetchLike;
  now?: () => number;
  cacheTtlMs?: number;
};

type CacheEntry = {
  expiresAt: number;
  player: CocPlayerSummary;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: Record<string, unknown>, key: string): string | null {
  const entry = value[key];
  return typeof entry === 'string' && entry.trim() !== '' ? entry : null;
}

function readNumber(value: Record<string, unknown>, key: string): number | null {
  const entry = value[key];
  return typeof entry === 'number' && Number.isFinite(entry) ? entry : null;
}

function normalizePlayer(value: unknown): CocPlayerSummary | null {
  if (!isRecord(value)) return null;

  const tag = normalizeTag(value.tag);
  const name = readString(value, 'name');
  const townHallLevel = readNumber(value, 'townHallLevel');

  if (!tag || !name || townHallLevel === null) return null;

  const clanValue = value.clan;
  const clan =
    isRecord(clanValue) && normalizeTag(clanValue.tag) && readString(clanValue, 'name')
      ? {
          tag: normalizeTag(clanValue.tag) as string,
          name: readString(clanValue, 'name') as string,
          clanLevel: readNumber(clanValue, 'clanLevel') ?? 0,
        }
      : null;

  const league = isRecord(value.leagueTier) ? readString(value.leagueTier, 'name') : null;

  return {
    tag,
    name,
    townHallLevel,
    expLevel: readNumber(value, 'expLevel') ?? 0,
    trophies: readNumber(value, 'trophies') ?? 0,
    bestTrophies: readNumber(value, 'bestTrophies') ?? 0,
    warStars: readNumber(value, 'warStars') ?? 0,
    clan,
    leagueName: league,
  };
}

function errorResult(status: number, code: string, message: string): CocApiResult {
  return {
    status,
    body: {
      error: {
        code,
        message,
      },
    },
  };
}

function getUpstreamDetail(payload: unknown): string {
  if (!isRecord(payload)) return '';

  const reason = typeof payload.reason === 'string' ? payload.reason : '';
  const message = typeof payload.message === 'string' ? payload.message : '';
  return `${reason} ${message}`.toLowerCase();
}

function getUpstreamIp(payload: unknown): string | null {
  if (!isRecord(payload)) return null;

  const message = typeof payload.message === 'string' ? payload.message : '';
  const match = /from IP\s+([0-9a-fA-F:.]+)/i.exec(message);
  return match ? match[1] : null;
}

function mapUpstreamError(status: number, payload: unknown): CocApiResult {
  const detail = getUpstreamDetail(payload);

  if (status === 401 || status === 403) {
    if (status === 403 && (detail.includes('invalidip') || detail.includes('invalid ip'))) {
      const ip = getUpstreamIp(payload);
      const subject = ip ? `IP publik komputer ini (${ip})` : 'IP publik komputer ini';

      return errorResult(
        403,
        'invalid_ip',
        `${subject} belum terdaftar di token API Supercell. Tambahkan IP tersebut di developer.clashofclans.com lalu coba lagi.`,
      );
    }

    return errorResult(
      403,
      'access_denied',
      'Token API Supercell ditolak. Pastikan token masih aktif dan IP publik komputer ini sudah di-allowlist.',
    );
  }

  if (status === 404) {
    return errorResult(404, 'not_found', 'Desa tidak ditemukan. Pastikan tag desa sudah benar.');
  }

  if (status === 429) {
    return errorResult(
      429,
      'rate_limited',
      'Batas permintaan API Supercell tercapai. Coba lagi beberapa saat lagi.',
    );
  }

  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return errorResult(
      503,
      'upstream_unavailable',
      'API Supercell sedang tidak tersedia. Coba lagi nanti.',
    );
  }

  return errorResult(
    status >= 400 && status <= 599 ? status : 502,
    'upstream_error',
    'API Supercell mengembalikan kesalahan. Coba lagi beberapa saat lagi.',
  );
}

export function createCocApi(options: CocApiOptions) {
  const token = options.token?.trim() ?? '';
  const fetchImpl: FetchLike =
    options.fetchImpl ??
    ((url, init) => fetch(url, init));
  const now = options.now ?? (() => Date.now());
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const cache = new Map<string, CacheEntry>();
  const inFlight = new Map<string, Promise<CocApiResult>>();

  async function requestPlayer(tag: string): Promise<CocApiResult> {
    let response: Response;

    try {
      response = await fetchImpl(
        `${COC_API_BASE}/players/${encodeURIComponent(tag)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );
    } catch {
      return errorResult(
        502,
        'network_error',
        'Tidak dapat menghubungi API Supercell. Periksa koneksi internet lalu coba lagi.',
      );
    }

    let payload: unknown = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return mapUpstreamError(response.status, payload);
    }

    const player = normalizePlayer(payload);

    if (!player) {
      return errorResult(
        502,
        'invalid_response',
        'Respons API Supercell tidak dikenali. Coba lagi beberapa saat lagi.',
      );
    }

    cache.set(tag, {
      expiresAt: now() + cacheTtlMs,
      player,
    });

    return {
      status: 200,
      body: player,
      cache: 'miss',
    };
  }

  async function getPlayer(tag: string, refresh: boolean): Promise<CocApiResult> {
    if (!token) {
      return errorResult(
        503,
        'token_missing',
        'Token API belum diset. Tambahkan COC_API_TOKEN di clash-monitoring/.env.local lalu jalankan ulang server.',
      );
    }

    if (!refresh) {
      const cached = cache.get(tag);

      if (cached && cached.expiresAt > now()) {
        return {
          status: 200,
          body: cached.player,
          cache: 'hit',
        };
      }

      if (cached) cache.delete(tag);
    }

    const active = inFlight.get(tag);

    if (active) {
      const result = await active;
      return result.status === 200 ? { ...result, cache: 'hit' } : result;
    }

    const request = requestPlayer(tag).finally(() => {
      inFlight.delete(tag);
    });

    inFlight.set(tag, request);
    return request;
  }

  return {
    async handle(pathname: string): Promise<CocApiResult> {
      const url = new URL(pathname, 'http://localhost');
      const segments = url.pathname.split('/').filter(Boolean);

      if (segments[0] === 'api' && segments[1] === 'coc') {
        segments.splice(0, 2);
      }

      if (segments.length === 1 && segments[0] === 'status') {
        return {
          status: 200,
          body: { configured: token.length > 0 },
        };
      }

      if (segments.length === 2 && segments[0] === 'players') {
        let rawTag: string;

        try {
          rawTag = decodeURIComponent(segments[1]);
        } catch {
          return errorResult(400, 'invalid_tag', 'Tag desa tidak valid.');
        }

        const tag = normalizeTag(rawTag);

        if (!tag) {
          return errorResult(
            400,
            'invalid_tag',
            'Tag desa tidak valid. Gunakan format seperti #ABC123.',
          );
        }

        return getPlayer(tag, url.searchParams.get('refresh') === '1');
      }

      return errorResult(404, 'not_found', 'Endpoint API tidak dikenal.');
    },
  };
}
