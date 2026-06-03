/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** Per-request timeout in milliseconds (default 30000). */
  readonly VITE_API_TIMEOUT_MS?: string
  /** Set to `true` on live/staging builds to show Playwright Tests on the IA enterprise page. */
  readonly VITE_ENABLE_IA_PLAYWRIGHT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
