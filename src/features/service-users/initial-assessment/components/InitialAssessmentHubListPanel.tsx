import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import type { InitialAssessmentSubmission, InitialAssessmentStatus } from '@/features/service-users/initial-assessment/types'
import { formatInitialAssessmentDateTime } from '@/features/service-users/initial-assessment/utils/submission-display'

const STATUS_CLASS: Record<InitialAssessmentStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  SUBMITTED: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
  REVIEWED: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  ARCHIVED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/15 text-destructive',
}

type Props = {
  submissions: InitialAssessmentSubmission[]
  activeId: string | null
  canCreate: boolean
  creating?: boolean
  onSelect: (id: string) => void
  onStartNew: () => void
}

export function InitialAssessmentHubListPanel({
  submissions,
  activeId,
  canCreate,
  creating,
  onSelect,
  onStartNew,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <h3 className="border-b px-4 py-3 text-sm font-semibold">All assessments for this service user</h3>
      {submissions.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No assessments yet. Start a new assessment from the Form tab.
        </p>
      ) : (
        <ul className="divide-y">
          {submissions.map((s, idx) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <button
                type="button"
                className={cn('flex flex-1 flex-wrap items-center gap-2 text-left', activeId === s.id && 'font-medium')}
                onClick={() => onSelect(s.id)}
              >
                <span className="text-xs text-muted-foreground">#{submissions.length - idx}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold uppercase', STATUS_CLASS[s.status])}>
                  {s.status.replace('_', ' ')}
                </span>
                <span className="text-muted-foreground">
                  {s.template?.name ?? 'Template'} v{s.template?.version ?? '—'}
                </span>
                <span className="text-muted-foreground">Updated {formatInitialAssessmentDateTime(s.updatedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {canCreate ? (
        <div className="flex flex-wrap gap-2 border-t px-4 py-3">
          <Button type="button" size="sm" onClick={onStartNew} disabled={creating}>
            Start new assessment
          </Button>
        </div>
      ) : null}
    </div>
  )
}
