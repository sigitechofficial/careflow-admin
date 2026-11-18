import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight, Mail, SearchX, UserX } from 'lucide-react'
import { useCandidates } from '@/features/hr/recruitment/hooks/useRecruitment'
import { candidateStageLabel, formatDate } from '@/features/hr/recruitment/utils/recruitment-display.util'
import type { CandidateStage } from '@/features/hr/recruitment/api/recruitment.api'
import { UserAvatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

type Outcome = 'ALL' | 'REJECTED' | 'WITHDRAWN'

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
]

const TH = 'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'

function OutcomeBadge({ stage }: { stage: CandidateStage }) {
  const rejected = stage === 'REJECTED'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        rejected
          ? 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300'
          : 'border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300',
      )}
    >
      {rejected ? 'Rejected' : 'Withdrew'}
    </span>
  )
}

/** Candidates whose application was closed: rejected by us, or withdrawn. Open one to see the history or reopen it. */
export function ClosedCandidatesList({ vacancyId, search = '' }: { vacancyId?: string; search?: string }) {
  const navigate = useNavigate()
  const [outcome, setOutcome] = React.useState<Outcome>('ALL')
  const [page, setPage] = React.useState(1)
  React.useEffect(() => setPage(1), [outcome, vacancyId, search])

  const query = useCandidates({
    closed: true,
    stage: outcome === 'ALL' ? undefined : outcome,
    vacancyId,
    search: search.trim() || undefined,
    page,
    limit: 20,
  })
  const rows = query.data?.data ?? []
  const meta = query.data?.meta
  const filtered = outcome !== 'ALL' || !!search.trim() || !!vacancyId

  function open(id: string) {
    void navigate({ to: '/hr/candidates/$candidateId', params: { candidateId: id } })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex overflow-hidden rounded-md border border-input text-sm" role="group" aria-label="Outcome">
          {OUTCOMES.map(o => (
            <button
              key={o.value}
              type="button"
              aria-pressed={outcome === o.value}
              onClick={() => setOutcome(o.value)}
              className={cn(
                'px-3 py-1.5 transition-colors',
                outcome === o.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Open a candidate to see the full history, or to reopen the application at the same step.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              <th className={TH}>Candidate</th>
              <th className={TH}>Vacancy</th>
              <th className={TH}>Outcome</th>
              <th className={TH}>Closed at step</th>
              <th className={TH}>Reason</th>
              <th className={TH}>Closed on</th>
              <th className="w-10 px-2 py-2.5" aria-label="Open" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {query.isLoading ? (
              [0, 1, 2].map(i => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                      <span className="flex-1 space-y-2">
                        <span className="block h-3 w-1/4 animate-pulse rounded bg-muted" />
                        <span className="block h-3 w-1/6 animate-pulse rounded bg-muted" />
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      {filtered ? <SearchX className="h-5 w-5" aria-hidden /> : <UserX className="h-5 w-5" aria-hidden />}
                    </span>
                    <p className="text-sm font-medium">
                      {filtered ? 'No closed applications match' : 'No rejected or withdrawn candidates'}
                    </p>
                    <p className="max-w-sm text-xs text-muted-foreground">
                      {filtered
                        ? 'Try a different search, vacancy or outcome.'
                        : 'When you reject a candidate or they withdraw, they are listed here.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  onClick={() => open(row.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') open(row.id)
                  }}
                  className="group cursor-pointer align-top transition-colors hover:bg-muted/20 focus-visible:bg-muted/30 focus-visible:outline-none"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={row.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold leading-tight group-hover:text-primary">{row.name}</p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">{row.candidateReference}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="whitespace-nowrap">{row.vacancyTitle ?? '—'}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{row.vacancyReference}</p>
                  </td>
                  <td className="px-4 py-3">
                    <OutcomeBadge stage={row.stage} />
                    {row.stage === 'REJECTED' && row.rejectionEmailedAt ? (
                      <p className="mt-1 flex items-center gap-1 whitespace-nowrap text-[11px] text-muted-foreground">
                        <Mail className="h-3 w-3" aria-hidden /> Candidate emailed
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {row.closedFromStage ? candidateStageLabel(row.closedFromStage) : '—'}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="line-clamp-2 text-muted-foreground" title={row.outcomeReason ?? undefined}>
                      {row.outcomeReason ?? '—'}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatDate(row.closedAt ?? row.updatedAt)}</td>
                  <td className="px-2 py-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={!meta.hasNextPage} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      ) : null}
    </div>
  )
}
