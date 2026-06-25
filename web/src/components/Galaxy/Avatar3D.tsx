import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

/**
 * Builds a circular avatar texture for a person: either their photo (cropped to
 * a disc) or a warm generated fallback — a per-person colored gradient disc with
 * their initial or signature emoji. Either way every star reads as a face/person,
 * never a bare dot. Cached per (url|fallback-key).
 */

const cache = new Map<string, THREE.Texture>();

function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

function makeFallback(name: string, emoji: string | null, claimed: boolean): THREE.Texture {
  const key = `fb:${name}:${emoji ?? ''}:${claimed}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const hue = hashHue(name);
  // warm radial gradient disc, tinted by a per-person hue
  const g = ctx.createRadialGradient(S * 0.4, S * 0.35, S * 0.1, S / 2, S / 2, S / 2);
  g.addColorStop(0, `hsl(${hue} 70% 62%)`);
  g.addColorStop(0.7, `hsl(${hue} 55% 42%)`);
  g.addColorStop(1, `hsl(${(hue + 30) % 360} 50% 28%)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  ctx.fill();

  // initial or emoji
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (emoji) {
    ctx.font = `${S * 0.5}px serif`;
    ctx.fillText(emoji, S / 2, S / 2 + S * 0.04);
  } else {
    ctx.font = `600 ${S * 0.46}px Fraunces, Georgia, serif`;
    ctx.fillText((name.trim()[0] ?? '✦').toUpperCase(), S / 2, S / 2 + S * 0.04);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Returns a texture: the loaded photo (disc-cropped) or the fallback meanwhile. */
export function useAvatarTexture(
  name: string,
  emoji: string | null,
  claimed: boolean,
  photoUrl?: string,
): THREE.Texture {
  const fallback = useMemo(() => makeFallback(name, emoji, claimed), [name, emoji, claimed]);
  const [tex, setTex] = useState<THREE.Texture>(fallback);

  useEffect(() => {
    setTex(fallback);
    if (!photoUrl) return;
    const cached = cache.get(photoUrl);
    if (cached) {
      setTex(cached);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      // crop to a centered disc
      const S = 256;
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const ctx = c.getContext('2d')!;
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const ar = img.width / img.height;
      let dw = S;
      let dh = S;
      if (ar > 1) dw = S * ar;
      else dh = S / ar;
      ctx.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      cache.set(photoUrl, t);
      setTex(t);
    };
    img.src = photoUrl;
    return () => {
      cancelled = true;
    };
  }, [photoUrl, fallback]);

  return tex;
}
