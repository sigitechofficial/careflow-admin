/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** Per-request timeout in milliseconds (default 30000). */
  readonly VITE_API_TIMEOUT_MS?: string
  /** Default staff email prefilled on the login page (baked at build time). */
  readonly VITE_DEFAULT_LOGIN_EMAIL?: string
  /** Default staff password prefilled on the login page (baked at build time). */
  readonly VITE_DEFAULT_LOGIN_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
