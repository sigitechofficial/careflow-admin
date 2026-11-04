import { ApiError, formatApiErrorMessage } from '@/shared/api/api-client'
import { useToastStore, type ToastVariant } from '@/store/toast.store'
import {
  CARER_NO_CONTRACTED_HOURS_CODE,
  CARER_OVER_MAX_CODE,
  useCarerHoursStopStore,
} from '@/store/carer-hours-stop.store'

export function toastSuccess(title: string, description?: string) {
  useToastStore.getState().push({ title, description, variant: 'success' })
}

/** Errors and warnings stay long enough to read: 8s, plus time for long messages, up to 20s. */
function readingDuration(title: string, description?: string): number {
  const length = title.length + (description?.length ?? 0)
  return Math.min(20000, Math.max(8000, 3000 + length * 50))
}

export function toastError(title: string, description?: string) {
  useToastStore
    .getState()
    .push({ title, description, variant: 'destructive', duration: readingDuration(title, description) })
}

export function toastWarning(title: string, description?: string) {
  useToastStore
    .getState()
    .push({ title, description, variant: 'warning', duration: readingDuration(title, description) })
}

export function toastInfo(title: string, description?: string) {
  useToastStore.getState().push({ title, description, variant: 'default' })
}

/** Pull a user-facing message from an API or thrown error. */
export function extractApiErrorMessage(
  e: unknown,
  fallback = 'Please try again or contact support if the problem continues.',
): string {
  if (e instanceof ApiError) {
    if (e.body) {
      const detail = formatApiErrorMessage(e.body, e.message)
      if (detail && detail !== 'Validation failed') return detail
    }
    return e.message
  }
  // fetch() rejects with a bare TypeError when the request never reaches the server.
  if (e instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(e.message)) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  if (e instanceof Error && e.message.trim()) return e.message
  if (typeof e === 'string' && e.trim()) return e
  return fallback
}

/** Convenience for form / API catch blocks. */
export function toastApiError(e: unknown, title = 'Something went wrong', fallbackMessage?: string) {
  // Carer weekly hours stops (no contracted hours / above the maximum) open a dialog with a link.
  if (e instanceof ApiError && e.body && typeof e.body === 'object') {
    const body = e.body as { code?: unknown; employeeId?: unknown }
    if (body.code === CARER_NO_CONTRACTED_HOURS_CODE || body.code === CARER_OVER_MAX_CODE) {
      useCarerHoursStopStore.getState().show({
        code: body.code,
        message: extractApiErrorMessage(e, fallbackMessage),
        employeeId: typeof body.employeeId === 'string' && body.employeeId ? body.employeeId : undefined,
      })
      return
    }
  }
  toastError(title, extractApiErrorMessage(e, fallbackMessage))
}

export function toastWithVariant(variant: ToastVariant, title: string, description?: string) {
  useToastStore.getState().push({ title, description, variant })
}
