import type { AccountApiMetadata } from './types.ts';

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

export type CocApiStatus = {
  configured: boolean;
};

export class CocApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'CocApiError';
    this.status = status;
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function requestJson<T>(path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`/api/coc${path}`, {
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    throw new CocApiError(
      503,
      'proxy_unavailable',
      'Tidak dapat menghubungi proxy API lokal. Pastikan aplikasi dijalankan dengan npm run dev atau npm run preview.',
    );
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    throw new CocApiError(
      503,
      'proxy_unavailable',
      'Fitur API hanya tersedia saat aplikasi dijalankan lokal dengan npm run dev atau npm run preview.',
    );
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new CocApiError(
      502,
      'invalid_response',
      'Respons proxy API tidak dapat dibaca. Coba lagi beberapa saat lagi.',
    );
  }

  if (!response.ok) {
    const errorBody = isRecord(body) && isRecord(body.error) ? body.error : null;
    const code =
      errorBody && typeof errorBody.code === 'string' ? errorBody.code : 'unknown_error';
    const message =
      errorBody && typeof errorBody.message === 'string'
        ? errorBody.message
        : 'API desa mengembalikan kesalahan. Coba lagi beberapa saat lagi.';

    throw new CocApiError(response.status, code, message);
  }

  return body as T;
}

export function getApiStatus(): Promise<CocApiStatus> {
  return requestJson<CocApiStatus>('/status');
}

export function getPlayer(tag: string, refresh = false): Promise<CocPlayerSummary> {
  const query = refresh ? '?refresh=1' : '';
  return requestJson<CocPlayerSummary>(`/players/${encodeURIComponent(tag)}${query}`);
}

export function toAccountMetadata(
  player: CocPlayerSummary,
  now = Date.now(),
): AccountApiMetadata {
  return {
    name: player.name,
    townHallLevel: player.townHallLevel,
    expLevel: player.expLevel,
    trophies: player.trophies,
    bestTrophies: player.bestTrophies,
    warStars: player.warStars,
    clanTag: player.clan?.tag ?? null,
    clanName: player.clan?.name ?? null,
    clanLevel: player.clan?.clanLevel ?? null,
    leagueName: player.leagueName,
    updatedAt: now,
  };
}

export function getCocApiErrorMessage(error: unknown): string {
  if (error instanceof CocApiError) return error.message;
  if (error instanceof Error && error.message.trim() !== '') return error.message;
  return 'Gagal mengambil detail desa dari API. Coba lagi beberapa saat lagi.';
}

export function isCocProxyUnavailable(error: unknown): boolean {
  return error instanceof CocApiError && error.code === 'proxy_unavailable';
}
