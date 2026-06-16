import { ApiError } from '@/shared/api/api-client'

type ApiErrorBody = {
  message?: unknown
  errors?: Array<{ target?: unknown; field?: string }>
}

function conflictFieldsFromBody(body: unknown): string[] {
  if (!body || typeof body !== 'object') return []
  const errors = (body as ApiErrorBody).errors
  if (!Array.isArray(errors)) return []
  const fields = new Set<string>()
  for (const err of errors) {
    if (typeof err.field === 'string' && err.field.trim()) {
      fields.add(err.field.trim())
    }
    const target = err.target
    const items = Array.isArray(target) ? target : target != null ? [target] : []
    for (const item of items) {
      const raw = String(item).trim()
      if (!raw) continue
      const suffixMatch = raw.match(/_([A-Za-z0-9]+)_key$/)
      fields.add(suffixMatch?.[1] ?? raw)
    }
  }
  return [...fields]
}

export function apiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (error instanceof ApiError) {
    return error.message.trim() || fallback
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

export function applyApiConflictFieldErrors(
  error: unknown,
  setError: (name: 'username' | 'email', error: { type: string; message: string }) => void,
): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false
  const message = apiErrorMessage(error)
  const fields = conflictFieldsFromBody(error.body)
  let applied = false
  if (fields.includes('username')) {
    setError('username', { type: 'server', message })
    applied = true
  }
  if (fields.includes('email')) {
    setError('email', { type: 'server', message })
    applied = true
  }
  return applied
}
