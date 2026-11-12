import { Link } from '@tanstack/react-router'
import { ArrowRight, BadgeCheck, Briefcase, CalendarDays, SearchX, UsersRound } from 'lucide-react'
import { useCandidatePipeline } from '@/features/hr/recruitment/hooks/useRecruitment'
import {
  PIPELINE_STAGES,
  STAGE_NEXT_ACTION,
  appliedAgo,
  candidateStageLabel,
} from '@/features/hr/recruitment/utils/recruitment-display.util'
import type { CandidateRow, CandidateSource } from '@/features/hr/recruitment/api/recruitment.api'
import { UserAvatar } from '@/shared/ui/avatar'
import { cn } from '@/shared/lib/utils'

const SOURCE_TEXT: Record<CandidateSource, string> = {
  WEBSITE: 'Careers page',
  REFERRAL: 'Referral',
  AGENCY: 'Agency',
  INTERNAL: 'Internal',
  MANUAL: 'Added by staff',
  EMAIL: 'Email',
}

/** A candidate on the board. Steps are done on the candidate page, so the card says what is next and opens it. */
function CandidatePipelineCard({ candidate }: { candidate: CandidateRow }) {
  const hired = !!candidate.convertedEmployeeId
  return (
    <Link
      to="/hr/candidates/$candidateId"
      params={{ candidateId: candidate.id }}
      className={cn(
        'group block rounded-lg border border-border bg-card shadow-sm transition-all duration-150',
        'hover:-translate-y-px hover:border-primary/40 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="flex items-start gap-2.5 p-3">
        <UserAvatar name={candidate.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight group-hover:text-primary">{candidate.name}</p>
          <p className="truncate text-[11px] tabular-nums text-muted-foreground">{candidate.candidateReference}</p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {SOURCE_TEXT[candidate.source] ?? candidate.source}
        </span>
      </div>
      <div className="space-y-1 px-3 pb-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 truncate">
          <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{candidate.vacancyTitle ?? 'Vacancy'}</span>
        </p>
        <p className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {appliedAgo(candidate.createdAt)}
        </p>
      </div>
      <div
        className={cn(
          'flex items-start gap-1.5 rounded-b-lg border-t px-3 py-2 text-xs',
          hired
            ? 'border-emerald-500/20 bg-emerald-500/5 font-medium text-emerald-700 dark:text-emerald-300'
            : 'border-border bg-muted/30 text-foreground/80',
        )}
      >
        {hired ? (
          <>
            <BadgeCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden /> Hired — employee record created
          </>
        ) : (
          <>
            <ArrowRight className="mt-px h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span>{STAGE_NEXT_ACTION[candidate.stage]}</span>
          </>
        )}
      </div>
    </Link>
  )
}

function matches(candidate: CandidateRow, term: string): boolean {
  if (!term) return true
  return [candidate.name, candidate.email, candidate.phone, candidate.candidateReference, candidate.vacancyTitle]
    .filter(Boolean)
    .some(v => v!.toLowerCase().includes(term))
}

/** Six columns, one per hiring step. Narrow screens scroll sideways. */
export function CandidatePipelineBoard({ vacancyId, search = '' }: { vacancyId?: string; search?: string }) {
  const query = useCandidatePipeline(vacancyId)
  const columns = query.data ?? []
  const term = search.trim().toLowerCase()
  const byStage = PIPELINE_STAGES.map(stage => ({
    stage,
    candidates: (columns.find(c => c.stage === stage)?.candidates ?? []).filter(c => matches(c, term)),
  }))
  const total = byStage.reduce((sum, c) => sum + c.candidates.length, 0)

  if (!query.isLoading && total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-14 text-center">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {term ? <SearchX className="h-5 w-5" aria-hidden /> : <UsersRound className="h-5 w-5" aria-hidden />}
        </span>
        <p className="text-sm font-medium">{term ? 'No candidates match your search' : 'No candidates yet'}</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {term
            ? 'Try a different name, email or reference.'
            : 'Applications from the careers page appear here. You can also add a candidate yourself.'}
        </p>
      </div>
    )
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <div className="grid min-w-max auto-cols-[minmax(250px,1fr)] grid-flow-col gap-3 2xl:min-w-0">
        {byStage.map(({ stage, candidates }, idx) => (
          <section
            key={stage}
            aria-label={candidateStageLabel(stage)}
            className="flex min-w-0 flex-col rounded-xl border border-border bg-muted/20"
          >
            <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <span
                className={cn(
                  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  candidates.length > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {idx + 1}
              </span>
              <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{candidateStageLabel(stage)}</h3>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground ring-1 ring-border">
                {query.isLoading ? '–' : candidates.length}
              </span>
            </header>
            <div className="flex-1 space-y-2 p-2.5">
              {query.isLoading ? (
                [0, 1].map(i => <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />)
              ) : candidates.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  No candidates at this step
                </p>
              ) : (
                candidates.map(candidate => <CandidatePipelineCard key={candidate.id} candidate={candidate} />)
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
