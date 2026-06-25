/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Constellation layout: 'galaxy' (3D, default), 'tree' (2D), or 'force' (2D radial). */
  readonly VITE_LAYOUT?: 'galaxy' | 'tree' | 'force';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
