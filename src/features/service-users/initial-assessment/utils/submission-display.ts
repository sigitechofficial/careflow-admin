import { plainTextFromHtml } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import type { InitialAssessmentSubmissionUserRef } from '@/features/service-users/initial-assessment/types'
import { formatDate, formatDateTime } from '@/shared/lib/utils'

export function formatInitialAssessmentUser(
  user?: InitialAssessmentSubmissionUserRef | null,
): string {
  if (!user) return '—'
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name || user.email
}

export function formatInitialAssessmentDateTime(iso: string | null | undefined): string {
  return formatDateTime(iso)
}

export function formatInitialAssessmentDate(iso: string | null | undefined): string {
  return formatDate(iso)
}

/** Read-only display for Summernote / HTML note fields — never show raw markup. */
export function formatRichTextForDisplay(value: string | null | undefined): string {
  if (!value?.trim()) return ''
  return plainTextFromHtml(value)
}
