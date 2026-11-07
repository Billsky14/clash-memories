import type {
  AccountsResponse,
  BoostKind,
  BoostResponse,
  ImportResponse,
} from './types.ts';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export class ApiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};

  if (init?.body) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiClientError(
      'Tidak dapat terhubung ke server. Pastikan clashbe sudah berjalan.',
    );
  }

  if (!response.ok) {
    let message = `Permintaan gagal (${response.status}).`;

    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === 'string') message = body.error;
    } catch {
      // Keep the generic message when the response body is not JSON.
    }

    throw new ApiClientError(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function fetchAccounts(): Promise<AccountsResponse> {
  return request<AccountsResponse>('/api/accounts');
}

export function importAccount(payload: unknown): Promise<ImportResponse> {
  return request<ImportResponse>('/api/imports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteUpgrade(id: number): Promise<void> {
  return request<void>(`/api/upgrades/${id}`, { method: 'DELETE' });
}

export function deleteAccount(tag: string): Promise<void> {
  return request<void>(`/api/accounts/${encodeURIComponent(tag)}`, {
    method: 'DELETE',
  });
}

export function activateBoost(
  tag: string,
  kind: BoostKind,
  quantity: number,
): Promise<BoostResponse> {
  return request<BoostResponse>(
    `/api/accounts/${encodeURIComponent(tag)}/boosts`,
    {
      method: 'POST',
      body: JSON.stringify({ kind, quantity }),
    },
  );
}
