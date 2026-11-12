import * as React from 'react'
import { Briefcase, KanbanSquare, Search, UserPlus, Users, UserX, X } from 'lucide-react'
import { useSearch } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import { PageHeader } from '@/shared/ui/page-elements'
import { CandidatePipelineBoard } from '@/features/hr/recruitment/components/CandidatePipelineBoard'
import { CandidateFormDialog } from '@/features/hr/recruitment/components/CandidateFormDialog'
import { ClosedCandidatesList } from '@/features/hr/recruitment/components/ClosedCandidatesList'
import {
  useCandidatePipeline,
  useCandidates,
  useVacancies,
} from '@/features/hr/recruitment/hooks/useRecruitment'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

export default function CandidatesPipelinePage() {
  const search = useSearch({ strict: false }) as { vacancyId?: string }
  const canCreate = useAuthStore.getState().can('hr.candidates.create')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [vacancyFilter, setVacancyFilter] = React.useState(search.vacancyId ?? '')
  const [term, setTerm] = React.useState('')
  const [view, setView] = React.useState<'active' | 'closed'>('active')

  const vacanciesQuery = useVacancies({ page: 1, limit: 100 })
  const vacancies = vacanciesQuery.data?.data ?? []

  React.useEffect(() => {
    if (search.vacancyId) setVacancyFilter(search.vacancyId)
  }, [search.vacancyId])

  const filtered = !!vacancyFilter || !!term.trim()

  // Counts for the tabs (the board's query is shared, so this adds no request).
  const pipelineQuery = useCandidatePipeline(vacancyFilter || undefined)
  const activeCount = pipelineQuery.data?.reduce((sum, c) => sum + c.candidates.length, 0)
  const closedCount = useCandidates({ closed: true, vacancyId: vacancyFilter || undefined, page: 1, limit: 1 }).data?.meta
    .total
  const tabs = [
    { value: 'active' as const, label: 'In progress', icon: <KanbanSquare className="h-4 w-4" aria-hidden />, count: activeCount },
    { value: 'closed' as const, label: 'Rejected & withdrawn', icon: <UserX className="h-4 w-4" aria-hidden />, count: closedCount },
  ]

  return (
    <div className="flex flex-col gap-5" data-testid="hr-candidates-pipeline-page">
      <PageHeader
        title="Candidate pipeline"
        description="Every applicant, step by step from application to hire. Open a candidate to do their next step."
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <Users className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'HR', href: '/hr/employees' },
          { label: 'Recruitment', href: '/hr/recruitment' },
          { label: 'Candidates' },
        ]}
        actions={
          canCreate
            ? [
                {
                  label: 'Add candidate',
                  icon: <UserPlus className="h-4 w-4" />,
                  onClick: () => setCreateOpen(true),
                },
              ]
            : undefined
        }
      />

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex gap-1 overflow-x-auto border-b border-border px-2 md:px-3" role="tablist" aria-label="Candidates">
          {tabs.map(t => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={view === t.value}
              onClick={() => setView(t.value)}
              className={cn(
                '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                view === t.value
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.icon}
              {t.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                  view === t.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {t.count ?? '–'}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center md:px-5">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder={view === 'active' ? 'Search name, email or reference' : 'Search name or email'}
              aria-label="Search candidates"
              className="pl-9"
            />
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:w-72">
            <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <Select value={vacancyFilter || 'ALL'} onValueChange={v => setVacancyFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger aria-label="Filter by vacancy" className="min-w-0">
                <SelectValue placeholder="All vacancies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All vacancies</SelectItem>
                {vacancies.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.vacancyReference} — {v.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filtered ? (
            <button
              type="button"
              onClick={() => {
                setTerm('')
                setVacancyFilter('')
              }}
              className="inline-flex items-center gap-1 self-start text-sm font-medium text-muted-foreground hover:text-foreground sm:self-auto"
            >
              <X className="h-3.5 w-3.5" aria-hidden /> Clear
            </button>
          ) : null}
        </div>
        <div className="p-3 md:p-4">
          {view === 'active' ? (
            <CandidatePipelineBoard vacancyId={vacancyFilter || undefined} search={term} />
          ) : (
            <ClosedCandidatesList vacancyId={vacancyFilter || undefined} search={term} />
          )}
        </div>
      </section>

      {canCreate ? (
        <CandidateFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultVacancyId={vacancyFilter || undefined}
        />
      ) : null}
    </div>
  )
}
