import type {
  AddPersonRequest,
  PersonCardFields,
  SnapshotResponse,
} from '@roots/shared';
import { getDeviceToken, setDeviceToken } from './deviceToken';

/**
 * Thin fetch wrapper. All requests are same-origin (single-origin in prod, Vite
 * proxy in dev). The device token is attached automatically once obtained.
 */

let currentFamilyId: string | null = null;

async function req<T>(path: string, init?: RequestInit & { skipAuth?: boolean }): Promise<T> {
  const headers = new Headers(init?.headers);
  // Only declare a JSON content-type when we actually send a body — Fastify
  // rejects an empty body that claims to be application/json.
  if (init?.body != null) headers.set('Content-Type', 'application/json');
  if (!init?.skipAuth && currentFamilyId) {
    const token = getDeviceToken(currentFamilyId);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface InviteInfo {
  familyId: string;
  familyName: string;
}

/** Resolve a family from the invite slug, then ensure we hold a device token. */
export async function enterFamily(slug: string): Promise<InviteInfo> {
  const info = await req<InviteInfo>(`/invite/${slug}`, { skipAuth: true });
  currentFamilyId = info.familyId;
  if (!getDeviceToken(info.familyId)) {
    const { token } = await req<{ token: string }>(`/family/${info.familyId}/device`, {
      method: 'POST',
      skipAuth: true,
    });
    setDeviceToken(info.familyId, token);
  }
  return info;
}

export function setActiveFamily(familyId: string) {
  currentFamilyId = familyId;
}

export const api = {
  snapshot: () => req<SnapshotResponse>('/family/snapshot'),

  addPerson: (body: AddPersonRequest) =>
    req<{ person: SnapshotResponse['people'][number]; union?: SnapshotResponse['unions'][number] }>(
      '/person',
      { method: 'POST', body: JSON.stringify(body) },
    ),

  updatePerson: (id: string, fields: Partial<PersonCardFields>, clientMutationId?: string) =>
    req<SnapshotResponse['people'][number]>(`/person/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields, clientMutationId }),
    }),

  claimPerson: (id: string) =>
    req<{ personId: string; claimedAt: string }>(`/person/${id}/claim`, { method: 'POST' }),

  claimHost: (familyId: string, secret: string) =>
    req<{ token: string }>(`/family/${familyId}/host`, {
      method: 'POST',
      body: JSON.stringify({ secret }),
      skipAuth: true,
    }),
};
