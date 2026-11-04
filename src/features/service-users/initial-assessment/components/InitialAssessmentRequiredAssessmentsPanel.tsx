import { CheckCircle2, ClipboardCheck, CircleAlert } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { formatDate } from '@/shared/lib/utils'
import type { InitialAssessmentRequiredAssessment } from '@/features/service-users/initial-assessment/types'

type Props = {
  serviceUserId: string
  items: InitialAssessmentRequiredAssessment[]
}

/**
 * Assessments the organisation requires for the care plans this Initial Assessment recommends
 * (configured in Care pathway settings → Required Assessments). Informational: it blocks nothing.
 */
export function InitialAssessmentRequiredAssessmentsPanel({ serviceUserId, items }: Props) {
  if (!items.length) return null
  const outstanding = items.filter((i) => !i.lastCompletedAt).length

  return (
    <div className="space-y-3" data-testid="ia-required-assessments">
      <div className="flex flex-wrap items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-teal-700 dark:text-teal-300" aria-hidden />
        <h3 className="text-sm font-semibold">Required assessments ({items.length})</h3>
        {outstanding ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            {outstanding} not done yet
          </span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            All done
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        The recommended care plans need these assessments. Complete them from the service user&apos;s care plan
        page.
      </p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((item) => (
          <li
            key={item.assessmentFormId}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
            data-testid={`ia-required-assessment-${item.assessmentFormId}`}
          >
            <div className="min-w-0">
              <p className="font-medium">{item.assessmentFormName}</p>
              <p className="text-xs text-muted-foreground">
                Required by {item.requiredBy.map((r) => r.carePlanName).join(', ')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-sm">
              {item.lastCompletedAt ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Completed {formatDate(item.lastCompletedAt)}
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300">
                    <CircleAlert className="h-4 w-4" aria-hidden />
                    Not done yet
                  </span>
                  <Link
                    to="/service-users/$serviceUserId/care-plan"
                    params={{ serviceUserId }}
                    hash="care-plans-assessment-risk"
                    className="text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
                  >
                    Do assessment
                  </Link>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
