import { Link } from '@tanstack/react-router'
import { BarChart3 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import type { SurveyResults } from '@/features/surveys/types'

/**
 * The survey page's "Results so far": sent to, answered and the response rate (public surveys:
 * answered only, as there is no list of people), across every period of a repeating survey, with
 * a way to the results page. Every figure is on the results page too; nothing else is shown here.
 */
export function SurveyResultsStrip({
  surveyId,
  isPublic,
  results,
  fallback,
  className,
}: {
  surveyId: string
  isPublic: boolean
  results: SurveyResults | undefined
  /** The survey's own counts, until the results have loaded. */
  fallback: { recipients: number; responses: number }
  className?: string
}) {
  const p = results?.participation
  const sentTo = p?.sentTo ?? results?.recipients ?? fallback.recipients
  const answered = p?.answered ?? results?.responses ?? fallback.responses
  const rate = p?.responseRate ?? results?.responseRate ?? 0
  const periods = results?.includesPeriodRuns ? (results.periods?.length ?? 0) : 0
  const nothingYet = answered === 0 && (isPublic || sentTo === 0)

  const figures: Array<[string, string | number]> = isPublic
    ? [['Answered', answered]]
    : [
        ['Sent to', sentTo],
        ['Answered', answered],
        ['Response rate', `${rate}%`],
      ]

  return (
    <section
      className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3', className)}
      data-testid="survey-results-strip"
    >
      <div className="min-w-0">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />
          Results so far
        </h2>
        {nothingYet ? (
          <p className="mt-0.5 text-sm text-muted-foreground">No answers yet</p>
        ) : (
          <p className="mt-0.5 text-sm text-foreground">
            {figures.map(([label, value], i) => (
              <span key={label}>
                {i > 0 ? <span className="px-1.5 text-muted-foreground">·</span> : null}
                <span className="text-muted-foreground">{label} </span>
                <span className="font-semibold tabular-nums">{value}</span>
              </span>
            ))}
          </p>
        )}
        {periods > 0 ? <p className="mt-0.5 text-xs text-muted-foreground">All {periods} periods together.</p> : null}
      </div>
      <Button type="button" size="sm" variant="outline" asChild>
        <Link to="/surveys/$surveyId/responses" params={{ surveyId }}>
          See results
        </Link>
      </Button>
    </section>
  )
}
