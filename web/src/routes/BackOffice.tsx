import { useState } from 'react';
import type { AdminRow, DuesStatus } from '@roots/shared';
import { adminApi } from '../lib/adminApi';

const DUES: DuesStatus[] = ['none', 'unpaid', 'partial', 'paid'];
const DUES_LABEL: Record<DuesStatus, string> = {
  none: '—',
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
};
const DUES_COLOR: Record<DuesStatus, string> = {
  none: 'text-muted',
  unpaid: 'text-red-300',
  partial: 'text-amber-300',
  paid: 'text-aurora-teal',
};

/**
 * Deliberately small host-only back office (not a CMS). Sign in with the family
 * host secret, then track simple bookkeeping per person — dues, a private note,
 * a contact — and export it as CSV. This data never reaches normal members.
 */
export function BackOffice({ slug }: { slug: string }) {
  const [authed, setAuthed] = useState(false);
  const [secret, setSecret] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminRow[]>([]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    setError(null);
    try {
      const ok = await adminApi.signIn(slug, secret);
      if (!ok) {
        setError('That host secret didn’t work.');
        return;
      }
      setAuthed(true);
      setRows(await adminApi.ledger());
    } catch {
      setError('Could not reach the family. Check the link.');
    } finally {
      setSigningIn(false);
    }
  }

  function patch(personId: string, p: Partial<AdminRow>) {
    setRows((rs) => rs.map((r) => (r.personId === personId ? { ...r, ...p } : r)));
    void adminApi.updateRow(personId, p as never);
  }

  function exportCsv() {
    const head = ['Name', 'Dues', 'Amount', 'Note', 'Contact'];
    const esc = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const lines = rows.map((r) =>
      [r.name, r.duesStatus, r.duesAmount ?? '', r.note ?? '', r.contact ?? '']
        .map(esc)
        .join(','),
    );
    const csv = [head.map(esc).join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roots-and-stars-ledger.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!authed) {
    return (
      <main className="flex min-h-full items-center justify-center bg-space-deep p-6">
        <form
          onSubmit={signIn}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-space-panel p-6"
        >
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
            Family management
          </p>
          <h1 className="mt-1 font-display text-2xl text-starlight">Back office</h1>
          <p className="mt-2 text-sm text-muted">
            Host only. Enter the family host secret to manage bookkeeping.
          </p>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Host secret"
            autoFocus
            className="mt-4 w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-starlight outline-none focus:border-glow-gold/70"
            data-testid="host-secret"
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={signingIn || !secret}
            className="mt-4 w-full rounded-full bg-glow-gold py-3 font-semibold text-space-deep disabled:opacity-60"
            data-testid="host-signin"
          >
            {signingIn ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-space-deep p-5">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
              Family management
            </p>
            <h1 className="font-display text-2xl text-starlight">Back office</h1>
          </div>
          <button
            onClick={exportCsv}
            className="rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-starlight hover:bg-white/10"
            data-testid="export-csv"
          >
            ↓ Export CSV
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm" data-testid="ledger">
            <thead>
              <tr className="bg-white/[0.04] text-left text-muted">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Dues</th>
                <th className="p-3 font-medium">Amount</th>
                <th className="p-3 font-medium">Note</th>
                <th className="p-3 font-medium">Contact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.personId} className="border-t border-white/5">
                  <td className="p-3 font-display text-starlight">{r.name}</td>
                  <td className="p-3">
                    <select
                      value={r.duesStatus}
                      onChange={(e) => patch(r.personId, { duesStatus: e.target.value as DuesStatus })}
                      className={`rounded-lg border border-white/10 bg-space-deep px-2 py-1 ${DUES_COLOR[r.duesStatus]}`}
                      data-testid={`dues-${r.personId}`}
                    >
                      {DUES.map((d) => (
                        <option key={d} value={d}>
                          {DUES_LABEL[d]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      defaultValue={r.duesAmount ?? ''}
                      onBlur={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        patch(r.personId, { duesAmount: Number.isFinite(n) ? n : null });
                      }}
                      inputMode="numeric"
                      placeholder="—"
                      className="w-20 rounded-lg border border-white/10 bg-space-deep px-2 py-1 text-starlight"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      defaultValue={r.note ?? ''}
                      onBlur={(e) => patch(r.personId, { note: e.target.value || null })}
                      placeholder="—"
                      className="w-44 rounded-lg border border-white/10 bg-space-deep px-2 py-1 text-starlight"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      defaultValue={r.contact ?? ''}
                      onBlur={(e) => patch(r.personId, { contact: e.target.value || null })}
                      placeholder="—"
                      className="w-40 rounded-lg border border-white/10 bg-space-deep px-2 py-1 text-starlight"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          This page and its data are private to the host — family members never see it.
        </p>
      </div>
    </main>
  );
}
