import type { InitialAssessmentSubmissionUserRef } from '@/features/service-users/initial-assessment/types'

export function formatInitialAssessmentUser(
  user?: InitialAssessmentSubmissionUserRef | null,
): string {
  if (!user) return '—'
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name || user.email
}

export function formatInitialAssessmentDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}
