/**
 * Layout output consumed by the SVG renderer. Pure geometry — no React, no DOM.
 * Computed client-side by web/src/layout/computeLayout.ts from people + unions.
 */

export interface PositionedNode {
  personId: string;
  x: number;
  y: number;
  generation: number;
  claimed: boolean;
}

export interface UnionAnchor {
  unionId: string;
  x: number;
  y: number;
}

export type ThreadKind = 'partner' | 'parent-child';

export interface PositionedThread {
  /** Stable id, e.g. `pc:<unionId>:<childId>` or `pt:<unionId>`. Used as React key + ignite lookup. */
  id: string;
  kind: ThreadKind;
  /** SVG path `d` string. One clean path per thread so the ignite pulse can trace it. */
  d: string;
  unionId: string;
  /** For parent-child threads, the child this thread leads to. */
  childId?: string;
}

export interface LayoutBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface LayoutResult {
  nodes: PositionedNode[];
  threads: PositionedThread[];
  unionAnchors: UnionAnchor[];
  bounds: LayoutBounds;
}
