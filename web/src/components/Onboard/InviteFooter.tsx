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
    <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center">
      <button
        onClick={copy}
        className="pointer-events-auto rounded-full bg-space-panel/80 px-4 py-2 font-body text-sm text-starlight backdrop-blur transition hover:bg-space-panel"
      >
        {copied ? '✦ Link copied — share it with family' : '↗ Invite the rest of the family'}
      </button>
    </div>
  );
}
