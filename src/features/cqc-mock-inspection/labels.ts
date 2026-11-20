import type { BadgeProps } from '@/shared/ui/badge'
import type { CqcRating, MockInspectionStatus } from './types'

export const RATING_LABEL: Record<CqcRating, string> = {
  OUTSTANDING: 'Outstanding',
  GOOD: 'Good',
  REQUIRES_IMPROVEMENT: 'Requires improvement',
  INADEQUATE: 'Inadequate',
}

export function ratingVariant(rating: CqcRating | null | undefined): BadgeProps['variant'] {
  switch (rating) {
    case 'OUTSTANDING':
      return 'solid-success'
    case 'GOOD':
      return 'success'
    case 'REQUIRES_IMPROVEMENT':
      return 'warning'
    case 'INADEQUATE':
      return 'destructive'
    default:
      return 'muted'
  }
}

export const STATUS_LABEL: Record<MockInspectionStatus, string> = {
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export function statusVariant(status: MockInspectionStatus): BadgeProps['variant'] {
  return status === 'COMPLETED' ? 'success' : status === 'CANCELLED' ? 'muted' : 'info'
}

/** Score chip colours: 1 red, 2 amber, 3 green, 4 strong green. */
export function scoreVariant(score: number | null): BadgeProps['variant'] {
  if (score === null) return 'outline'
  if (score <= 1) return 'destructive'
  if (score === 2) return 'warning'
  if (score === 3) return 'success'
  return 'solid-success'
}

export const SOURCE_LABEL: Record<string, string> = {
  SURVEY_RESULT: 'Survey result',
  POLICY: 'Policy',
  AUDIT: 'Audit',
  INCIDENT_LEARNING: 'Incident learning',
  TRAINING: 'Training',
  COMPLAINT: 'Complaint',
  COMPLIMENT: 'Compliment',
  MANUAL: 'Added by hand',
}

export const CATEGORY_LABEL: Record<string, string> = {
  PEOPLES_EXPERIENCE: "People's experience",
  STAFF_FEEDBACK: 'Feedback from staff and leaders',
  PARTNER_FEEDBACK: 'Feedback from partners',
  OBSERVATION: 'Observation',
  PROCESSES: 'Processes',
  OUTCOMES: 'Outcomes',
}
