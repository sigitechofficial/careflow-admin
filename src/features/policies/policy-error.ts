import { ApiError } from '@/shared/api/api-client'
import { extractApiErrorMessage } from '@/shared/lib/toast'

export function policyErrorCopy(err: unknown): { title: string; message: string } {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return { title: 'Signed out', message: 'Please sign in again to continue.' }
    }
    if (err.status === 403) {
      return {
        title: 'Permission denied',
        message: "You don't have permission to perform this action.",
      }
    }
    if (err.status === 404) {
      return { title: 'Not found', message: 'Policy not found.' }
    }
    if (err.status === 409) {
      const detail = extractApiErrorMessage(err)
      if (/already exists/i.test(detail)) {
        return { title: 'Conflict', message: detail }
      }
      return {
        title: 'Conflict',
        message: 'This policy has changed. Refresh before continuing.',
      }
    }
    if (err.status === 422) {
      return { title: 'Invalid data', message: extractApiErrorMessage(err) }
    }
    if (err.status >= 500) {
      return { title: 'Server error', message: 'Something went wrong. Try again later.' }
    }
  }
  return { title: 'Something went wrong', message: extractApiErrorMessage(err) }
}

export function toastPolicyError(err: unknown, toastError: (title: string, description?: string) => void) {
  const copy = policyErrorCopy(err)
  toastError(copy.title, copy.message)
}
