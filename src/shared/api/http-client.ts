/** Resilient browser fetch: bounded wait time, retries with backoff for transient failures. */

export type FetchResilienceOptions = {
  timeoutMs?: number
  retry?: {
    /** Retries after the first attempt (default: 2 for GET/HEAD, 0 for other methods). */
    maxRetries?: number
    baseDelayMs?: number
    /** When true, retry POST/PUT/PATCH/DELETE on transient server/network errors. Default false. */
    retryMutations?: boolean
  }
}

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_BASE_DELAY_MS = 400
const MAX_BACKOFF_MS = 8_000

function envNumber(key: keyof ImportMetaEnv, fallback: number): number {
  const raw = import.meta.env[key]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function getDefaultApiTimeoutMs(): number {
  return envNumber('VITE_API_TIMEOUT_MS', DEFAULT_TIMEOUT_MS)
}

function getDefaultMaxRetries(method: string, opts?: FetchResilienceOptions['retry']): number {
  if (opts?.maxRetries !== undefined) return Math.max(0, opts.maxRetries)
  const idempotent = method === 'GET' || method === 'HEAD'
  return idempotent ? 2 : 0
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}

function isNetworkishFailure(e: unknown): boolean {
  if (isAbortError(e)) return false
  return e instanceof TypeError
}

function mergeSignals(user: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const deadline = AbortSignal.timeout(timeoutMs)
  if (!user) return deadline
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([user, deadline])
  }
  const merged = new AbortController()
  const stop = () => {
    if (!merged.signal.aborted) merged.abort()
  }
  if (user.aborted || deadline.aborted) {
    stop()
    return merged.signal
  }
  user.addEventListener('abort', stop, { once: true })
  deadline.addEventListener('abort', stop, { once: true })
  return merged.signal
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header?.trim()) return null
  const asNum = Number(header)
  if (Number.isFinite(asNum) && asNum >= 0) return Math.min(asNum * 1000, 60_000)
  const when = Date.parse(header)
  if (!Number.isNaN(when)) return Math.min(Math.max(0, when - Date.now()), 60_000)
  return null
}

function transientStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function backoffDelayMs(attempt: number, baseDelayMs: number, retryAfterMs: number | null): number {
  const jitter = 0.5 + Math.random() * 0.5
  const exp = baseDelayMs * 2 ** attempt * jitter
  const capped = Math.min(exp, MAX_BACKOFF_MS)
  if (retryAfterMs != null) return Math.max(capped, retryAfterMs)
  return capped
}

/**
 * fetch with per-request timeout (AbortSignal.timeout) and limited retries for
 * GET/HEAD (and optionally mutations) on 408/429/5xx and network errors.
 */
export async function fetchWithResilience(
  url: string,
  init: RequestInit = {},
  options?: FetchResilienceOptions,
): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const idempotent = method === 'GET' || method === 'HEAD'
  const allowRetry = idempotent || options?.retry?.retryMutations === true
  const timeoutMs = options?.timeoutMs ?? getDefaultApiTimeoutMs()
  const baseDelayMs = options?.retry?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS
  const maxRetries = getDefaultMaxRetries(method, options?.retry)

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const signal = mergeSignals(init.signal ?? undefined, timeoutMs)
    try {
      const res = await fetch(url, { ...init, signal })
      if (res.ok || !allowRetry || attempt === maxRetries) {
        return res
      }
      if (!transientStatus(res.status)) {
        return res
      }
      const retryAfter = parseRetryAfterMs(res.headers.get('Retry-After'))
      await sleep(backoffDelayMs(attempt, baseDelayMs, retryAfter))
    } catch (e) {
      lastError = e
      if (isAbortError(e)) {
        throw e
      }
      if (!allowRetry || !isNetworkishFailure(e) || attempt === maxRetries) {
        throw e
      }
      await sleep(backoffDelayMs(attempt, baseDelayMs, null))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed after retries')
}
