import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ClipboardCheck, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import {
  useCreateInitialAssessmentSubmission,
  useInitialAssessmentSubmissions,
} from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import type { InitialAssessmentStatus } from '@/features/service-users/initial-assessment/types'
import { formatInitialAssessmentDateTime } from '@/features/service-users/initial-assessment/utils/submission-display'

const ENTERPRISE_PATH = '/service-users/initial-assessment'
// const LEGACY_PATH = '/service-users/initial-assessment-checklist'

const EDITABLE: InitialAssessmentStatus[] = ['DRAFT', 'IN_PROGRESS']

function statusClass(status: InitialAssessmentStatus): string {
  const map: Record<InitialAssessmentStatus, string> = {
    DRAFT: 'bg-muted text-muted-foreground',
    IN_PROGRESS: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    SUBMITTED: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
    REVIEWED: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    ARCHIVED: 'bg-muted text-muted-foreground',
    CANCELLED: 'bg-destructive/15 text-destructive',
  }
  return map[status] ?? 'bg-muted'
}

type Props = {
  serviceUserId: string
  displayName: string
}

export function ServiceUserInitialAssessmentEnterpriseTab({ serviceUserId, displayName }: Props) {
  const can = useAuthStore((s) => s.can)
  const canRead = can('service_users.initial_assessment.read') || can('service_users.read')
  const canCreate = can('service_users.initial_assessment.create') || can('service_users.initial_assessment.update')

  const submissionsQuery = useInitialAssessmentSubmissions(serviceUserId, canRead)
  const createMutation = useCreateInitialAssessmentSubmission(serviceUserId)

  const submissions = submissionsQuery.data ?? []
  const activeDraft = submissions.find((s) => EDITABLE.includes(s.status))

  const startNew = async () => {
    if (!canCreate) return
    await createMutation.mutateAsync()
  }

  if (!canRead) {
    return <p className="text-sm text-destructive">You do not have permission to view initial assessments.</p>
  }

  return (
    <div className="space-y-6" data-testid="su-initial-assessment-enterprise-tab">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <ClipboardCheck className="h-6 w-6 text-teal-700 dark:text-teal-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Enterprise initial assessment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              14-section regulated assessment for {displayName}. Questions and answers are loaded from the
              backend template API — not the legacy checkbox catalog.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" asChild>
            <Link to={ENTERPRISE_PATH} search={{ serviceUserId }}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {activeDraft ? 'Resume assessment' : 'Open assessment'}
            </Link>
          </Button>
          {canCreate && !activeDraft ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={createMutation.isPending}
              onClick={() => void startNew()}
            >
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Start new draft
            </Button>
          ) : null}
          {/* Legacy checklist — retired in favour of enterprise initial assessment
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to={LEGACY_PATH} search={{ serviceUserId }}>
              Legacy checklist (migration)
            </Link>
          </Button>
          */}
        </div>
      </div>

      {submissionsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading submissions…
        </div>
      ) : submissions.length > 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <h3 className="border-b px-4 py-3 text-sm font-semibold">Assessment history</h3>
          <ul className="divide-y">
            {submissions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <span
                    className={cn(
                      'mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase',
                      statusClass(s.status),
                    )}
                  >
                    {s.status.replace('_', ' ')}
                  </span>
                  <span className="text-muted-foreground">
                    {s.updatedAt ? formatInitialAssessmentDateTime(s.updatedAt) : '—'}
                  </span>
                </div>
                <Button type="button" size="sm" variant="ghost" asChild>
                  <Link to={ENTERPRISE_PATH} search={{ serviceUserId }}>
                    View
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No enterprise assessments yet. Start one to begin.</p>
      )}
    </div>
  )
}
