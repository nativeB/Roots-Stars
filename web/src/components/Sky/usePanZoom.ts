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

/** Lightweight pan + pinch/wheel zoom for the SVG sky. Touch-first. */
export function usePanZoom(initial: Viewport) {
  const [viewport, setViewport] = useState<Viewport>(initial);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
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

  return { viewport, setViewport, onPointerDown, onPointerMove, onPointerUp, onWheel, reset, pinch };
}
