import { cn } from '@/shared/lib/utils'
import type { AuditDashboard } from '../types'
import { shortMonth } from '../labels'

type Month = AuditDashboard['timeline'][number]

/** Red when anything was missed, amber while audits are due, green when the month is all done. */
function tone(m: Month, isFuture: boolean): string {
  if (m.missed) return 'bg-destructive text-destructive-foreground'
  if (m.due) return 'bg-warning text-warning-foreground'
  if (isFuture) return 'bg-muted text-muted-foreground'
  return 'bg-success text-success-foreground'
}

/** Month-by-month audits: done, missed and due, six months back and eleven ahead. */
export function AuditTimeline({ data, loading }: { data: AuditDashboard | undefined; loading?: boolean }) {
  const months = data?.timeline ?? []
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="audit-timeline">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Audit timeline</h2>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Legend className="bg-success" label="Completed" />
          <Legend className="bg-destructive" label="Missed" />
          <Legend className="bg-warning" label="Due" />
        </div>
      </div>
      {loading && !months.length ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto pb-1">
          <ol className="relative flex min-w-[56rem] items-start justify-between pt-2" aria-label="Audits by month">
            <span className="absolute left-3 right-3 top-[1.4rem] h-0.5 bg-border" aria-hidden />
            {months.map(m => {
              const current = m.month === data?.currentMonth
              const isFuture = Boolean(data && m.month > data.currentMonth)
              const total = m.completed + m.missed + m.due
              const summary = `${m.missed} missed, ${m.due} due, ${m.completed} completed`
              return (
                <li
                  key={m.month}
                  className={cn(
                    'group relative z-[1] flex w-14 flex-col items-center rounded-md pb-1',
                    current && 'bg-primary/5',
                  )}
                  data-testid="audit-timeline-month"
                  data-month={m.month}
                >
                  <button
                    type="button"
                    className={cn(
                      'mt-1 flex h-8 w-8 cursor-default items-center justify-center rounded-full text-xs font-semibold ring-4 ring-card focus:outline-none focus-visible:ring-primary',
                      tone(m, isFuture),
                    )}
                    aria-label={`${shortMonth(m.month)}: ${summary}`}
                    title={summary}
                  >
                    {total}
                  </button>
                  <span className="mt-1.5 whitespace-nowrap text-[11px] text-muted-foreground">{shortMonth(m.month)}</span>
                  {current ? (
                    <span className="mt-0.5 whitespace-nowrap text-[10px] font-semibold text-primary">This month</span>
                  ) : null}
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute top-12 z-10 hidden w-max rounded-md border border-border bg-popover px-2.5 py-1.5 text-left text-xs text-popover-foreground shadow-md group-focus-within:block group-hover:block"
                  >
                    <span className="flex items-center gap-1.5">
                      <i className="h-2 w-2 rounded-full bg-destructive" aria-hidden />
                      {m.missed} missed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <i className="h-2 w-2 rounded-full bg-warning" aria-hidden />
                      {m.due} due
                    </span>
                    <span className="flex items-center gap-1.5">
                      <i className="h-2 w-2 rounded-full bg-success" aria-hidden />
                      {m.completed} completed
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </section>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className={cn('h-2.5 w-2.5 rounded-full', className)} aria-hidden />
      {label}
    </span>
  )
}
