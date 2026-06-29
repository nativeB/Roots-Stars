/**
 * A warm, deterministic fallback avatar for anyone without a photo — a per-person
 * hue gradient disc with their initial or signature emoji, as a data-URL so it
 * drops straight into an <img>/<image href>. Cached per key. This is what makes
 * the sky read as faces/people instead of identical dots.
 */
const cache = new Map<string, string>();

function hue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function avatarDataUrl(name: string, emoji: string | null): string {
  const key = `${name}|${emoji ?? ''}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const h = hue(name);
  const g = ctx.createRadialGradient(S * 0.38, S * 0.32, S * 0.08, S / 2, S / 2, S / 2);
  g.addColorStop(0, `hsl(${h} 72% 64%)`);
  g.addColorStop(0.72, `hsl(${h} 56% 44%)`);
  g.addColorStop(1, `hsl(${(h + 28) % 360} 50% 30%)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (emoji) {
    ctx.font = `${S * 0.52}px serif`;
    ctx.fillText(emoji, S / 2, S / 2 + S * 0.04);
  } else {
    ctx.font = `600 ${S * 0.46}px Fraunces, Georgia, serif`;
    ctx.fillText((name.trim()[0] ?? '✦').toUpperCase(), S / 2, S / 2 + S * 0.04);
  }

  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
