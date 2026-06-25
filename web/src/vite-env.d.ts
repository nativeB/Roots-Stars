/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Constellation layout engine: 'tree' (default) or 'force' (radial nebula). */
  readonly VITE_LAYOUT?: 'tree' | 'force';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
