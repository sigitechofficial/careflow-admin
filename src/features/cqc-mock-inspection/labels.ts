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

/** "Met 2 · Partially met 1 · Not met 0 points" for a scoring. */
export function pointsSummary(s: { metPoints: number; partlyMetPoints: number; notMetPoints: number }) {
  return `Met ${s.metPoints} · Partially met ${s.partlyMetPoints} · Not met ${s.notMetPoints} points`
}

/** "4 at 100% · 3 at 75% · 2 at 50% · else 1" for a scoring. */
export function levelsSummary(s: { score4Percent: number; score3Percent: number; score2Percent: number }) {
  return `Score 4 at ${s.score4Percent}% · 3 at ${s.score3Percent}% · 2 at ${s.score2Percent}% · below that 1`
}

/** "Amina Khan, Tom Reed" for the staff an action is for. */
export function staffNames(staff: { name: string | null }[]): string {
  return staff.map(s => s.name ?? 'a staff member').join(', ')
}
