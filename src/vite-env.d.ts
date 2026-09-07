/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** Per-request timeout in milliseconds (default 30000). */
  readonly VITE_API_TIMEOUT_MS?: string
  /** Google Maps JavaScript API key (Places Autocomplete for branch addresses). */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  /**
   * Show Initial Assessment QA Demo Data in production builds (`true` only).
   * Not a secret. Hidden unless this is exactly `true` (or Vite DEV).
   */
  readonly VITE_ENABLE_IA_QA_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
