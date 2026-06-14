import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { formatDate } from '@/shared/lib/utils'
import { useAssessmentCompletions } from '@/features/service-users/assessments/hooks/useServiceUserAssessments'
import type { AssessmentCompletion, AssessmentCompletionUser } from '@/features/service-users/assessments/types'

const formatAssessmentUser = (user?: AssessmentCompletionUser | string | null) => {
  if (!user) return '—'
  if (typeof user === 'string') return user
  const name = user.name ?? [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name || user.email || '—'
}

type Props = {
  serviceUserId: string
  assessmentKey: string
  onSelectCompletion: (completion: AssessmentCompletion) => void
  activeCompletionId?: string | null
}

export function AssessmentHistoryList({
  serviceUserId,
  assessmentKey,
  onSelectCompletion,
  activeCompletionId,
}: Props) {
  const historyQuery = useAssessmentCompletions(serviceUserId, assessmentKey, true)
  const completions = historyQuery.data ?? []

  if (historyQuery.isLoading) {
    return <p className="text-xs text-muted-foreground">Loading history…</p>
  }

  if (historyQuery.error) {
    return (
      <p className="text-xs text-destructive" role="alert">
        Unable to load history.
      </p>
    )
  }

  if (completions.length === 0) {
    return <p className="text-xs text-muted-foreground">No previous completions yet.</p>
  }

  return (
    <div className="space-y-2">
      {completions.map((completion) => (
        <div
          key={completion.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2"
        >
          <div className="min-w-[12rem]">
            <div className="text-xs font-medium text-foreground">
              {completion.completedAt ? formatDate(completion.completedAt) : '—'}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatAssessmentUser(completion.completedBy)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeCompletionId === completion.id && (
              <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-900">
                Open
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => onSelectCompletion(completion)}
            >
              View
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
