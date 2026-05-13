import { ApiError } from '@/lib/api-client'
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

/** Convenience for form / API catch blocks. */
export function toastApiError(e: unknown, title = 'Something went wrong', fallbackMessage?: string) {
  const description =
    e instanceof ApiError ? e.message : fallbackMessage ?? 'Please try again or contact support if the problem continues.'
  toastError(title, description)
}

export function toastWithVariant(variant: ToastVariant, title: string, description?: string) {
  useToastStore.getState().push({ title, description, variant })
}
