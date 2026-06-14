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

  updatePerson: (
    id: string,
    fields: Partial<PersonCardFields>,
    opts?: { editPin?: string; setEditPin?: string | null; clientMutationId?: string },
  ) =>
    req<SnapshotResponse['people'][number]>(`/person/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields, ...opts }),
    }),

  claimPerson: (id: string, editPin?: string) =>
    req<{ personId: string; claimedAt: string }>(`/person/${id}/claim`, {
      method: 'POST',
      body: editPin ? JSON.stringify({ editPin }) : undefined,
    }),

  claimHost: (familyId: string, secret: string) =>
    req<{ token: string }>(`/family/${familyId}/host`, {
      method: 'POST',
      body: JSON.stringify({ secret }),
      skipAuth: true,
    }),

  deletePerson: (id: string) => req<{ ok: true }>(`/person/${id}`, { method: 'DELETE' }),

  exportData: () => req<unknown>('/family/export'),

  photoUrl: (id: string) => req<{ url: string | null }>(`/person/${id}/photo-url`),

  /** Presign → PUT to R2 → record the key. Returns the stored photoKey. */
  async uploadPhoto(personId: string, blob: Blob): Promise<string> {
    const { uploadUrl, photoKey } = await req<{ uploadUrl: string; photoKey: string }>(
      '/upload/presign',
      { method: 'POST', body: JSON.stringify({ personId, contentType: 'image/webp' }) },
    );
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/webp' },
      body: blob,
    });
    if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
    await req(`/person/${personId}/photo`, {
      method: 'POST',
      body: JSON.stringify({ photoKey }),
    });
    return photoKey;
  },
};
