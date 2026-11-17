import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useLearningCourseVersions } from '@/features/learning/hooks/useLearning'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'

function count(n: number | undefined, one: string, many: string) {
  const value = n ?? 0
  return `${value} ${value === 1 ? one : many}`
}

function formatDateTime(iso?: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Every version of a course, newest first: status, who published it, what changed, carers assigned. */
export function VersionHistoryPanel({ courseId, compact }: { courseId: string; compact?: boolean }) {
  const { data: versions, isLoading } = useLearningCourseVersions(courseId)
  // Shown above the builder, so only the latest few unless asked.
  const [showAll, setShowAll] = React.useState(false)
  const visible = showAll ? versions : versions?.slice(0, 3)
  const hidden = (versions?.length ?? 0) - (visible?.length ?? 0)

  return (
    <section className="space-y-3" data-testid="version-history-panel">
      {compact ? (
        <p className="text-xs text-muted-foreground">Published versions never change. Carers keep their version.</p>
      ) : (
        <div>
          <h3 className="text-sm font-semibold">Version history</h3>
          <p className="text-xs text-muted-foreground">
            Published versions never change. Carers keep the version they were assigned.
          </p>
        </div>
      )}
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : !versions?.length ? (
        <p className="text-sm text-muted-foreground">No versions.</p>
      ) : (
        <ol className="divide-y divide-border rounded-lg border border-border">
          {(visible ?? []).map(v => (
            <li key={v.id} className={compact ? 'space-y-1 px-3 py-2.5 text-sm' : 'flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-3 text-sm'}>
              <div className={compact ? 'flex items-center gap-2' : 'flex w-28 shrink-0 items-center gap-2'}>
                <span className="font-medium">v{v.versionNumber}</span>
                <LearningStatusBadge status={v.status} size="sm" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p>
                  {v.publishedAt ? (
                    <>
                      Published {formatDateTime(v.publishedAt)}
                      {v.publishedByName ? ` by ${v.publishedByName}` : ''}
                    </>
                  ) : (
                    <>Draft started {formatDateTime(v.createdAt)}</>
                  )}
                </p>
                {v.changeSummary ? <p className="text-muted-foreground">{v.changeSummary}</p> : null}
                <p className="text-xs text-muted-foreground">
                  {count(v.sectionCount, 'module', 'modules')} · {count(v.lessonCount, 'lesson', 'lessons')} ·{' '}
                  {count(v.quizCount, 'quiz', 'quizzes')}
                  {' · '}
                  {v.assignmentCount ?? 0} carer assignment{v.assignmentCount === 1 ? '' : 's'}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {hidden > 0 || showAll ? (
        <Button size="sm" variant="ghost" onClick={() => setShowAll(v => !v)}>
          {showAll ? 'Show fewer' : `Show all versions (${versions?.length ?? 0})`}
        </Button>
      ) : null}
    </section>
  )
}
