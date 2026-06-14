import type { AdminRow, DuesStatus } from '@roots/shared';

interface InviteInfo {
  familyId: string;
  familyName: string;
}

/**
 * Back-office API. Separate from the member client: it holds a HOST token,
 * obtained by entering the family host secret. Admin data (dues/notes/contact)
 * is only ever fetched here, never in a normal member's client.
 */

let hostToken: string | null = null;

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set('Content-Type', 'application/json');
  if (hostToken) headers.set('Authorization', `Bearer ${hostToken}`);
  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

export const adminApi = {
  hasSession: () => hostToken !== null,

  /** Resolve the family by slug, then exchange the host secret for a host token. */
  async signIn(slug: string, secret: string): Promise<boolean> {
    const info = await fetch(`/api/invite/${slug}`).then((r) =>
      r.ok ? (r.json() as Promise<InviteInfo>) : null,
    );
    if (!info) return false;
    const res = await fetch(`/api/family/${info.familyId}/host`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    });
    if (!res.ok) return false;
    const { token } = (await res.json()) as { token: string };
    hostToken = token;
    return true;
  },

  ledger: () => req<{ rows: AdminRow[] }>('/admin/ledger').then((r) => r.rows),

  updateRow: (
    personId: string,
    patch: Partial<Pick<AdminRow, 'duesStatus' | 'duesAmount' | 'note' | 'contact'>> & {
      duesStatus?: DuesStatus;
    },
  ) => req<{ ok: true }>(`/admin/person/${personId}`, { method: 'PATCH', body: JSON.stringify(patch) }),
};
