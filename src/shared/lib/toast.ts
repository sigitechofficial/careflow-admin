import { ApiError } from '@/shared/api/api-client'
import { useToastStore, type ToastVariant } from '@/store/toast.store'

export function toastSuccess(title: string, description?: string) {
  useToastStore.getState().push({ title, description, variant: 'success' })
}

export function toastError(title: string, description?: string) {
  useToastStore.getState().push({ title, description, variant: 'destructive' })
}

export function toastWarning(title: string, description?: string) {
  useToastStore.getState().push({ title, description, variant: 'warning' })
}

export function toastInfo(title: string, description?: string) {
  useToastStore.getState().push({ title, description, variant: 'default' })
}

/** Pull a user-facing message from an API or thrown error. */
export function extractApiErrorMessage(
  e: unknown,
  fallback = 'Please try again or contact support if the problem continues.',
): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error && e.message.trim()) return e.message
  if (typeof e === 'string' && e.trim()) return e
  return fallback
}

/** Convenience for form / API catch blocks. */
export function toastApiError(e: unknown, title = 'Something went wrong', fallbackMessage?: string) {
  toastError(title, extractApiErrorMessage(e, fallbackMessage))
}

export function toastWithVariant(variant: ToastVariant, title: string, description?: string) {
  useToastStore.getState().push({ title, description, variant })
}
