/** Vite env; no Zustand — safe to import from auth store. */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL ?? ''
  const configured = typeof raw === 'string' ? raw.replace(/\/$/, '') : ''

  // SPA opened via LAN IP/hostname but env still points at this machine's localhost —
  // that would hit the *client* PC, not the API host. Use Vite same-origin /api proxy.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const onLocalhost = host === 'localhost' || host === '127.0.0.1'
    const pointsAtLocalApi =
      configured === 'http://localhost:3000' ||
      configured === 'http://127.0.0.1:3000' ||
      configured.startsWith('http://localhost:') ||
      configured.startsWith('http://127.0.0.1:')
    if (!onLocalhost && pointsAtLocalApi) {
      return '/api'
    }
  }

  return configured
}
