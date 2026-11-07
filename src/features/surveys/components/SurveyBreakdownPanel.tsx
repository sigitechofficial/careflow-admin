import { Progress } from '@/shared/ui/misc'
import type { SurveyBreakdown } from '@/features/surveys/types'

const TITLES: Record<SurveyBreakdown['dimension'], string> = {
  branch: 'Responses by branch',
  jobTitle: 'Responses by job title',
  channel: 'How they answered',
  respondent: 'Who answered',
}

/**
 * Group breakdowns (by branch / job title, and how people answered: channel and who answered). For
 * anonymous surveys the API withholds or combines small groups (fewer than 5 responses) so nobody
 * can be identified; the panel shows the reason instead.
 */
export function SurveyBreakdownPanel({
  breakdowns,
  title,
  description,
  className,
}: {
  breakdowns: SurveyBreakdown[] | undefined
  /** Section heading above the cards (none by default). */
  title?: string
  description?: string
  className?: string
}) {
  const shown = (breakdowns ?? []).filter(b => b.suppressed || b.groups.length > 0)
  if (shown.length === 0) return null
  return (
    <div className={className}>
      {title ? (
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {shown.map(b => {
          const total = b.groups.reduce((sum, g) => sum + g.responses, 0)
          return (
            <section key={b.dimension} className="rounded-lg border border-border bg-card px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">{TITLES[b.dimension]}</h3>
              {b.suppressed ? (
                <p className="mt-2 text-xs text-muted-foreground" data-testid={`breakdown-${b.dimension}-withheld`}>
                  {b.note ?? 'Not shown, to protect anonymity.'}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {b.groups.map(g => {
                    const percent = total > 0 ? Math.round((g.responses / total) * 100) : 0
                    return (
                      <li key={g.key} className="flex items-center gap-2 text-sm">
                        <span className="w-40 shrink-0 truncate text-muted-foreground" title={g.label}>
                          {g.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Progress value={percent} size="sm" aria-label={`${g.label} ${percent}%`} />
                        </div>
                        <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
                          {g.responses} · {percent}%
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
              {!b.suppressed && b.note ? <p className="mt-2 text-xs text-muted-foreground">{b.note}</p> : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
