import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  ChevronRight,
  ExternalLink,
  Inbox,
  ListChecks,
  UserPlus,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { STAT_CARD_TONES, type StatCardTone } from '@/shared/ui/card'
import { UserAvatar } from '@/shared/ui/avatar'
import { useRecruitmentSummary } from '@/features/hr/recruitment/hooks/useRecruitment'
import { RecruitmentStageBadge } from '@/features/hr/recruitment/components/RecruitmentStatusBadges'
import {
  PIPELINE_STAGES,
  STAGE_NEXT_ACTION,
  appliedAgo,
  candidateStageLabel,
} from '@/features/hr/recruitment/utils/recruitment-display.util'
import { cn } from '@/shared/lib/utils'

/** A section card with an icon, title and optional right-hand content (same look as the HR Dashboard). */
function Panel({
  icon,
  title,
  description,
  aside,
  children,
  className,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex min-w-0 flex-col rounded-xl border border-border bg-card shadow-sm', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight">{title}</h2>
            {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {aside}
      </header>
      <div className="flex-1 p-4 md:p-5">{children}</div>
    </section>
  )
}

/** Count card that opens the related list. */
function StatLink({
  to,
  label,
  value,
  hint,
  icon,
  tone,
}: {
  to: '/hr/vacancies' | '/hr/candidates'
  label: string
  value: number | undefined
  hint: string
  icon: React.ReactNode
  tone: StatCardTone
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group rounded-xl border border-border bg-card p-4 shadow-sm transition-colors duration-150',
        'hover:border-primary/30 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105',
            STAT_CARD_TONES[tone],
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold tabular-nums tracking-tight">{value ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
        <ChevronRight
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </div>
    </Link>
  )
}

function HiringPipeline({ counts, loading }: { counts: Map<string, number>; loading: boolean }) {
  const max = Math.max(1, ...PIPELINE_STAGES.map(s => counts.get(s) ?? 0))
  return (
    <ol className="space-y-1">
      {PIPELINE_STAGES.map((stage, idx) => {
        const count = counts.get(stage) ?? 0
        return (
          <li key={stage}>
            <Link
              to="/hr/candidates"
              className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  count > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {idx + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium">{candidateStageLabel(stage)}</span>
                  <span className="font-display text-base font-bold tabular-nums">{loading ? '—' : count}</span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary/70 transition-[width] duration-300"
                    style={{ width: loading ? '0%' : `${(count / max) * 100}%` }}
                  />
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {count > 0 ? `Next: ${STAGE_NEXT_ACTION[stage]}` : 'No candidates at this step'}
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

export default function RecruitmentDashboardPage() {
  const navigate = useNavigate()
  const summaryQuery = useRecruitmentSummary()
  const summary = summaryQuery.data
  const loading = summaryQuery.isLoading
  const counts = new Map<string, number>(summary?.pipelineSummary.map(s => [s.stage, s.count]) ?? [])
  const recent = summary?.recentApplications ?? []

  return (
    <div className="flex flex-col gap-5" data-testid="hr-recruitment-dashboard">
      <PageHeader
        title="Recruitment"
        description="Open vacancies, new applications and where each candidate is in the hiring steps."
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <UserPlus className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'HR', href: '/hr/employees' },
          { label: 'Recruitment' },
        ]}
        actions={[
          {
            label: 'Careers page',
            icon: <ExternalLink className="h-4 w-4" />,
            variant: 'outline' as const,
            onClick: () => window.open('/careers', '_blank', 'noopener'),
          },
          {
            label: 'Vacancies',
            icon: <Briefcase className="h-4 w-4" />,
            onClick: () => void navigate({ to: '/hr/vacancies' }),
          },
        ]}
      />

      <section aria-label="Recruitment at a glance" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatLink
          to="/hr/vacancies"
          label="Open vacancies"
          value={loading ? undefined : summary?.openVacancies}
          hint="Taking applications now"
          icon={<Briefcase className="h-5 w-5" />}
          tone="violet"
        />
        <StatLink
          to="/hr/candidates"
          label="Candidates in progress"
          value={loading ? undefined : summary?.activeCandidates}
          hint="Across all six steps"
          icon={<Users className="h-5 w-5" />}
          tone="primary"
        />
        <StatLink
          to="/hr/candidates"
          label="New applications"
          value={loading ? undefined : counts.get('APPLIED') ?? 0}
          hint="Waiting to be reviewed"
          icon={<Inbox className="h-5 w-5" />}
          tone="sky"
        />
        <StatLink
          to="/hr/candidates"
          label="Cleared to start"
          value={loading ? undefined : counts.get('ACCEPTED') ?? 0}
          hint="All pre-employment checks passed"
          icon={<BadgeCheck className="h-5 w-5" />}
          tone="emerald"
        />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          icon={<ListChecks className="h-4 w-4" />}
          title="Hiring pipeline"
          description="Candidates at each step, and what to do next"
          aside={
            <Link
              to="/hr/candidates"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Open pipeline <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        >
          <HiringPipeline counts={counts} loading={loading} />
        </Panel>

        <Panel
          className="xl:col-span-2"
          icon={<Inbox className="h-4 w-4" />}
          title="Recent applications"
          description="The latest people to apply"
          aside={
            recent.length > 0 ? (
              <Link
                to="/hr/candidates"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null
          }
        >
          {loading ? (
            <ul className="space-y-3" aria-label="Loading recent applications">
              {[0, 1, 2, 3].map(i => (
                <li key={i} className="flex items-center gap-3">
                  <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                  <span className="flex-1 space-y-1.5">
                    <span className="block h-3 w-1/2 animate-pulse rounded bg-muted" />
                    <span className="block h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </span>
                </li>
              ))}
            </ul>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Inbox className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-sm font-medium">No applications yet</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Open a vacancy and share your careers page link so people can apply.
              </p>
              <Link
                to="/hr/vacancies"
                className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Go to vacancies <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          ) : (
            <ul className="-my-1 divide-y divide-border">
              {recent.map(app => (
                <li key={app.id}>
                  <Link
                    to="/hr/candidates/$candidateId"
                    params={{ candidateId: app.id }}
                    className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <UserAvatar name={app.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium group-hover:text-primary">{app.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {app.vacancyTitle} · {appliedAgo(app.createdAt)}
                      </span>
                    </span>
                    <RecruitmentStageBadge stage={app.stage} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
