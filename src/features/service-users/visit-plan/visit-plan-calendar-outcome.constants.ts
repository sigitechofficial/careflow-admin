export type VisitPlanCalendarOutcomeStatus =
  | 'NOT_GENERATED'
  | 'PLANNED'
  | 'STARTED'
  | 'COMPLETED'
  | 'MISSED'
  | 'CANCELLED'
  | 'CALLED_OFF'
  | 'PARTIALLY_COMPLETED'
  | 'NEEDS_ATTENTION'

export type VisitPlanCalendarOutcomeMeta = {
  value: VisitPlanCalendarOutcomeStatus
  label: string
  shortLabel: string
  description: string
  className: string
}

export const VISIT_PLAN_CALENDAR_OUTCOME_OPTIONS: VisitPlanCalendarOutcomeMeta[] = [
  {
    value: 'NOT_GENERATED',
    label: 'Not on rota',
    shortLabel: 'Not generated',
    description: 'Visit plan slot applies but rota has not been generated yet',
    className: 'vp-outcome-not-generated',
  },
  {
    value: 'PLANNED',
    label: 'Planned',
    shortLabel: 'Planned',
    description: 'Not yet attended',
    className: 'vp-outcome-planned',
  },
  {
    value: 'STARTED',
    label: 'In progress',
    shortLabel: 'In progress',
    description: 'Visit has started',
    className: 'vp-outcome-started',
  },
  {
    value: 'COMPLETED',
    label: 'Completed',
    shortLabel: 'Completed',
    description: 'Carer completed the visit',
    className: 'vp-outcome-completed',
  },
  {
    value: 'PARTIALLY_COMPLETED',
    label: 'Partially completed',
    shortLabel: 'Partial',
    description: 'Visit only partly completed',
    className: 'vp-outcome-partial',
  },
  {
    value: 'MISSED',
    label: 'Did not attend',
    shortLabel: 'Missed',
    description: 'Carer did not attend',
    className: 'vp-outcome-missed',
  },
  {
    value: 'CALLED_OFF',
    label: 'Called off',
    shortLabel: 'Called off',
    description: 'Visit was called off',
    className: 'vp-outcome-called-off',
  },
  {
    value: 'CANCELLED',
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    description: 'Visit cancelled',
    className: 'vp-outcome-cancelled',
  },
  {
    value: 'NEEDS_ATTENTION',
    label: 'Needs attention',
    shortLabel: 'Attention',
    description: 'Follow-up required',
    className: 'vp-outcome-attention',
  },
]

const OUTCOME_META_BY_VALUE = Object.fromEntries(
  VISIT_PLAN_CALENDAR_OUTCOME_OPTIONS.map((option) => [option.value, option]),
) as Record<VisitPlanCalendarOutcomeStatus, VisitPlanCalendarOutcomeMeta>

export function visitPlanCalendarOutcomeMeta(status: string): VisitPlanCalendarOutcomeMeta {
  return OUTCOME_META_BY_VALUE[status as VisitPlanCalendarOutcomeStatus] ?? OUTCOME_META_BY_VALUE.PLANNED
}

export function visitPlanCalendarOutcomeLabel(status: string): string {
  return visitPlanCalendarOutcomeMeta(status).label
}

export function visitPlanCalendarOutcomeShortLabel(status: string): string {
  return visitPlanCalendarOutcomeMeta(status).shortLabel
}

export function visitPlanCalendarDisplayStatus(
  outcome: { displayStatus?: string; status: string } | null | undefined,
): VisitPlanCalendarOutcomeStatus {
  if (!outcome) return 'NOT_GENERATED'
  const raw = outcome.displayStatus ?? outcome.status
  return visitPlanCalendarOutcomeMeta(raw).value
}

/** Statuses shown in the calendar legend (excludes rare states duplicated in meaning). */
export const VISIT_PLAN_CALENDAR_OUTCOME_LEGEND: VisitPlanCalendarOutcomeStatus[] = [
  'NOT_GENERATED',
  'PLANNED',
  'STARTED',
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'MISSED',
  'CALLED_OFF',
  'CANCELLED',
  'NEEDS_ATTENTION',
]
