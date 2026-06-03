import { cn } from '@/shared/lib/utils'
import type { InitialAssessmentStatus } from '@/features/service-users/initial-assessment/types'

const STATUS_LABEL: Record<InitialAssessmentStatus, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
  ARCHIVED: 'Archived',
  CANCELLED: 'Cancelled',
}

const STATUS_CLASS: Record<InitialAssessmentStatus, string> = {
  DRAFT: 'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  IN_PROGRESS:
    'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  SUBMITTED:
    'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100',
  REVIEWED:
    'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  ARCHIVED:
    'border-border bg-muted text-muted-foreground',
  CANCELLED:
    'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
}

type Props = {
  status: InitialAssessmentStatus
  managerReviewRequired?: boolean
  className?: string
  'data-testid'?: string
}

export function InitialAssessmentStatusBadge({
  status,
  managerReviewRequired,
  className,
  'data-testid': dataTestId = 'ia-submission-status',
}: Props) {
  return (
    <span
      data-testid={dataTestId}
      data-status={status}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold',
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
      {managerReviewRequired && status === 'SUBMITTED' ? (
        <span className="rounded bg-amber-200/80 px-1 py-0.5 text-[10px] uppercase dark:bg-amber-900">
          Manager review
        </span>
      ) : null}
    </span>
  )
}
