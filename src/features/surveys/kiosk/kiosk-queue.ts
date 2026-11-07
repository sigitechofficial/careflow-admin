import { ApiError, apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { submitPublicSurveyResponse } from '@/features/surveys/api/surveys.api'
import type { PublicSurveyForm, SubmitSurveyResponseInput } from '@/features/surveys/types'

/**
 * Kiosk tablet (Phase 3): answers are kept on the tablet until they are sent, so a dropped
 * connection loses nothing. Each answer goes with a form token of its own (survey-link-guard.ts): a
 * token is used once, so sending a kept answer twice is refused ("already sent") and never counted
 * twice. Tokens last 24 hours, so answers kept offline must be sent within a day.
 *
 * Kept in this browser only, under the shared link: the form (to start offline), a stock of tokens
 * and the answers waiting to be sent. Nothing about who answered; sent answers are removed at once.
 */

export type KioskQueued = { formToken: string; input: SubmitSurveyResponseInput }

/** Top the stock up when it falls below this (the API gives at most 25 at a time). */
export const KIOSK_STOCK_LOW = 10
export const KIOSK_STOCK_FULL = 25
/** A token older than this is not used for a new answer (it must still be sent within 24 hours). */
const TOKEN_USABLE_MS = 20 * 60 * 60_000

const keyOf = (kind: 'form' | 'tokens' | 'queue', link: string) => `careflow-kiosk-${kind}:${link}`

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** When a form token was given (its second part, seconds in base 36), or null. */
export function tokenIssuedAt(formToken: string): number | null {
  const issued = formToken.split('.')[1]
  const seconds = issued ? parseInt(issued, 36) : NaN
  return Number.isFinite(seconds) ? seconds * 1000 : null
}

const usable = (formToken: string, now: number) => {
  const at = tokenIssuedAt(formToken)
  return at !== null && now - at < TOKEN_USABLE_MS
}

// ---- The form (so the kiosk can start again while offline) ----

export function cacheKioskForm(link: string, form: PublicSurveyForm): void {
  // The form's own token is kept in the stock, never with the form.
  write(keyOf('form', link), { ...form, formToken: null })
}

export function cachedKioskForm(link: string): PublicSurveyForm | null {
  return read<PublicSurveyForm | null>(keyOf('form', link), null)
}

// ---- The stock of form tokens ----

export function addFormTokens(link: string, tokens: readonly string[], now: number = Date.now()): void {
  const stock = read<string[]>(keyOf('tokens', link), []).filter(t => usable(t, now))
  for (const t of tokens) if (t && !stock.includes(t)) stock.push(t)
  write(keyOf('tokens', link), stock.slice(-KIOSK_STOCK_FULL * 2))
}

export function formTokenStock(link: string, now: number = Date.now()): number {
  return read<string[]>(keyOf('tokens', link), []).filter(t => usable(t, now)).length
}

/** Takes the oldest usable token from the stock (null when there is none). */
export function takeFormToken(link: string, now: number = Date.now()): string | null {
  const stock = read<string[]>(keyOf('tokens', link), []).filter(t => usable(t, now))
  const next = stock.shift() ?? null
  write(keyOf('tokens', link), stock)
  return next
}

export async function fetchFormTokens(link: string, count: number): Promise<string[]> {
  const res = await apiJson<ApiEnvelope<{ formTokens: string[] }>>(
    `/surveys/public/${encodeURIComponent(link)}/form-tokens?count=${Math.max(1, Math.min(KIOSK_STOCK_FULL, count))}`,
    { method: 'GET' },
  )
  return res.data?.formTokens ?? []
}

// ---- Answers waiting to be sent ----

export function kioskQueue(link: string): KioskQueued[] {
  return read<KioskQueued[]>(keyOf('queue', link), [])
}

/** Keeps an answer on the tablet. False when the browser would not keep it (storage full or blocked). */
export function queueAnswer(link: string, item: KioskQueued): boolean {
  return write(keyOf('queue', link), [...kioskQueue(link), item])
}

function removeQueued(link: string, formToken: string) {
  write(
    keyOf('queue', link),
    kioskQueue(link).filter(q => q.formToken !== formToken),
  )
}

type Outcome = 'sent' | 'drop' | 'later'

/**
 * What to do with a kept answer after trying to send it:
 * sent; already sent (kept on an earlier try whose reply was lost) = sent; refused for good (the form
 * expired, a question changed, the survey closed) = dropped; no connection, too busy or a server
 * error = kept for later.
 */
export function outcomeOf(error: unknown): Outcome {
  if (!(error instanceof ApiError)) return 'later'
  const code = (error.body as { code?: unknown } | undefined)?.code
  if (code === 'SURVEY_FORM_ALREADY_SENT') return 'sent'
  if (error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500) return 'later'
  return 'drop'
}

export type FlushResult = {
  sent: number
  /** Could never be sent (refused by the survey). */
  dropped: number
  left: number
  /** The closing message for each answer sent now, by form token. */
  closing: Record<string, { closingMessage?: string | null; closingMessages?: Record<string, string> }>
}

let flushing: Promise<FlushResult> | null = null

/** Sends the kept answers, oldest first; stops at the first that has to wait (no connection). */
export function flushKioskQueue(link: string): Promise<FlushResult> {
  if (flushing) return flushing
  flushing = (async () => {
    const result: FlushResult = { sent: 0, dropped: 0, left: 0, closing: {} }
    for (const item of kioskQueue(link)) {
      try {
        const res = await submitPublicSurveyResponse(link, { ...item.input, formToken: item.formToken })
        result.closing[item.formToken] = { closingMessage: res?.closingMessage, closingMessages: res?.closingMessages }
        result.sent += 1
        removeQueued(link, item.formToken)
      } catch (e) {
        const outcome = outcomeOf(e)
        if (outcome === 'later') break
        if (outcome === 'sent') result.sent += 1
        else result.dropped += 1
        removeQueued(link, item.formToken)
      }
    }
    result.left = kioskQueue(link).length
    return result
  })().finally(() => {
    flushing = null
  })
  return flushing
}
