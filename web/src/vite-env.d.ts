/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Layout: 'focus' (walk view, default), 'tree' (2D), 'force' (radial), 'galaxy' (3D). */
  readonly VITE_LAYOUT?: 'focus' | 'galaxy' | 'tree' | 'force';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
