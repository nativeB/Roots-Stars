import { useCallback, useRef, useState } from 'react';
import type { LayoutBounds } from '@roots/shared';

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const FIT_MAX_SCALE = 1.7; // cap for auto-fit so small families fill without ballooning

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Lightweight pan + pinch/wheel zoom for the SVG sky. Touch-first. */
export function usePanZoom(initial: Viewport) {
  const [viewport, setViewport] = useState<Viewport>(initial);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const animRef = useRef<number | null>(null);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  /**
   * Smoothly move the camera so a world point lands at a target screen point,
   * at a target scale. Used for tap-to-focus (zoom-in toward the star).
   */
  const animateTo = useCallback((next: Viewport, duration = 520) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const start = performance.now();
    let from: Viewport;
    setViewport((v) => {
      from = v;
      return v;
    });
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const k = easeInOut(t);
      setViewport({
        x: from.x + (next.x - from.x) * k,
        y: from.y + (next.y - from.y) * k,
        scale: from.scale + (next.scale - from.scale) * k,
      });
      if (t < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  }, []);

  /** Focus a world point at a screen anchor (sx, sy) and zoom to `scale`. */
  const focusOn = useCallback(
    (worldX: number, worldY: number, sx: number, sy: number, scale: number, instant = false) => {
      const s = clampScale(scale);
      const target = { x: sx - worldX * s, y: sy - worldY * s, scale: s };
      if (instant) {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        setViewport(target);
      } else {
        animateTo(target);
      }
    },
    [animateTo],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (animRef.current) cancelAnimationFrame(animRef.current); // user takes over
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setViewport((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setViewport((v) => {
      const scale = clampScale(v.scale * factor);
      const k = scale / v.scale;
      // zoom toward the cursor
      const x = e.clientX - (e.clientX - v.x) * k;
      const y = e.clientY - (e.clientY - v.y) * k;
      return { x, y, scale };
    });
  }, []);

  const reset = useCallback(
    (
      bounds: LayoutBounds,
      width: number,
      height: number,
      insets: { top?: number; bottom?: number } = {},
    ) => {
      const top = insets.top ?? 0;
      const bottom = insets.bottom ?? 0;
      const availH = Math.max(1, height - top - bottom);
      const bw = bounds.maxX - bounds.minX || 1;
      const bh = bounds.maxY - bounds.minY || 1;
      // fill the available frame generously; allow modest zoom-in for small
      // families so the stars feel present rather than lost in space.
      const raw = Math.min(width / bw, availH / bh) * 0.92;
      const scale = Math.min(FIT_MAX_SCALE, clampScale(raw));
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      const x = width / 2 - cx * scale;
      const y = top + availH / 2 - cy * scale;
      setViewport({ x, y, scale });
    },
    [],
  );

  return {
    viewport,
    setViewport,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    reset,
    focusOn,
    animateTo,
    pinch,
  };
}
