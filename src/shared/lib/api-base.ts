/** Vite env; no Zustand — safe to import from auth store. */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL ?? ''
  return typeof raw === 'string' ? raw.replace(/\/$/, '') : ''
}
