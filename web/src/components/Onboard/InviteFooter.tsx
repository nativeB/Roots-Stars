import { useState } from 'react';

/** Copy-the-invite-link nudge. The link is the key — sharing it invites family. */
export function InviteFooter({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${globalThis.location.origin}/j/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked; the link is still visible in the URL bar */
    }
  }

  return (
    <button
      onClick={copy}
      className="pointer-events-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-full border border-white/10 bg-space-panel/70 py-2.5 font-body text-sm font-medium text-starlight backdrop-blur-md transition hover:border-white/20 hover:bg-space-panel"
    >
      {copied ? '✦ Link copied — share it with family' : '↗ Invite the rest of the family'}
    </button>
  );
}
