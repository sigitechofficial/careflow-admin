import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Briefcase,
  ChevronRight,
  FileClock,
  Info,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sprout,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { PageHeader } from '@/shared/ui/page-elements'
import { STAT_CARD_TONES, type StatCardTone } from '@/shared/ui/card'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { HrEmployeeListTable } from '@/features/hr/components/HrEmployeeListTable'
import { DEPLOYMENT_LEGEND, DEPLOYMENT_LEGEND_NOTE } from '@/features/hr/components/HrStatusBadges'
import { deploymentStatusLabel, documentExpiry, documentTypeLabel } from '@/features/hr/utils/hr-display.util'
import { useExpiringHrDocuments, useHrSummary } from '@/features/hr/hooks/useHr'
import type { EmployeeLifecycleStatus, HrDeploymentStatus } from '@/features/hr/api/hr.api'
import { useRecruitmentSummary } from '@/features/hr/recruitment/hooks/useRecruitment'
import {
  PIPELINE_STAGES,
  candidateStageLabel,
} from '@/features/hr/recruitment/utils/recruitment-display.util'
import { cn, formatDate } from '@/shared/lib/utils'

type Filters = { lifecycle?: EmployeeLifecycleStatus; deployment?: HrDeploymentStatus }

/** A section card with an icon, title and optional right-hand content. */
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
    <section className={cn('rounded-xl border border-border bg-card shadow-sm', className)}>
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
      <div className="p-4 md:p-5">{children}</div>
    </section>
  )
}

/** Head-count card in the app's stat-card style. Clicking it filters the employee list. */
function StatTile({
  label,
  value,
  hint,
  icon,
  tone,
  active,
  loading,
  onClick,
}: {
  label: string
  value: number | undefined
  hint?: string
  icon: React.ReactNode
  tone: StatCardTone
  active?: boolean
  loading?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group rounded-xl border bg-card p-4 text-left shadow-sm transition-colors duration-150',
        'hover:border-primary/30 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' : 'border-border',
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
          <p className="font-display text-2xl font-bold tabular-nums tracking-tight">
            {loading || value === undefined ? '—' : value}
          </p>
          <p className="truncate text-xs text-muted-foreground">{hint ?? ' '}</p>
        </div>
        <ChevronRight
          className={cn(
            'mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-opacity',
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          aria-hidden
        />
      </div>
    </button>
  )
}

const READINESS: {
  status: HrDeploymentStatus
  label: string
  hint: string
  icon: React.ReactNode
  bar: string
  chip: string
}[] = [
  {
    status: 'GREEN',
    label: 'Ready to deploy',
    hint: 'Can be put on visits',
    icon: <ShieldCheck className="h-4 w-4" />,
    bar: 'bg-emerald-500',
    chip: STAT_CARD_TONES.emerald,
  },
  {
    status: 'AMBER',
    label: 'At risk',
    hint: 'Something needs attention soon',
    icon: <ShieldAlert className="h-4 w-4" />,
    bar: 'bg-amber-500',
    chip: STAT_CARD_TONES.amber,
  },
  {
    status: 'RED',
    label: 'Not deployable',
    hint: 'Must not be put on visits',
    icon: <ShieldX className="h-4 w-4" />,
    bar: 'bg-red-500',
    chip: STAT_CARD_TONES.rose,
  },
]

function DeploymentReadiness({
  counts,
  total,
  active,
  onSelect,
  flagged,
}: {
  counts: Record<HrDeploymentStatus, number> | undefined
  flagged: number | undefined
  total: number | undefined
  active: HrDeploymentStatus | undefined
  onSelect: (status: HrDeploymentStatus) => void
}) {
  const ready = counts && total ? Math.round((counts.GREEN / total) * 100) : null
  return (
    <Panel
      className="h-full"
      icon={<ShieldCheck className="h-4 w-4" />}
      title="Deployment readiness"
      description="Who can safely be put on visits today"
      aside={
        ready !== null ? (
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{ready}%</span> ready
          </span>
        ) : null
      }
    >
      <div
        className="mb-4 flex h-2 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={
          counts
            ? `${counts.GREEN} ready, ${counts.AMBER} at risk, ${counts.RED} not deployable`
            : 'Loading deployment readiness'
        }
      >
        {counts && total
          ? READINESS.map(r =>
              counts[r.status] ? (
                <div key={r.status} className={r.bar} style={{ width: `${(counts[r.status] / total) * 100}%` }} />
              ) : null,
            )
          : null}
      </div>
      <ul className="space-y-1">
        {READINESS.map(r => (
          <li key={r.status}>
            <button
              type="button"
              onClick={() => onSelect(r.status)}
              aria-pressed={active === r.status}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active === r.status && 'bg-primary/5 ring-1 ring-primary/20',
              )}
            >
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', r.chip)}>{r.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {r.label} <span className="font-normal text-muted-foreground">· {deploymentStatusLabel(r.status)}</span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  {DEPLOYMENT_LEGEND.find(l => l.status === r.status)?.meaning ?? r.hint}
                </span>
              </span>
              <span className="font-display text-lg font-bold tabular-nums">{counts ? counts[r.status] : '—'}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {flagged ? (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {flagged} {flagged === 1 ? 'person is' : 'people are'} counted lower than their HR status because of
          compliance (for example an expired DBS). Click a status to see who.
        </p>
      ) : null}
      <p className="mt-3 flex items-start gap-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        {DEPLOYMENT_LEGEND_NOTE}
      </p>
    </Panel>
  )
}

const EXPIRING_PREVIEW = 6

/** HR documents (ID, certificates, ...) that have expired or expire in the next 30 days. */
function ExpiringDocuments() {
  const query = useExpiringHrDocuments()
  const docs = query.data ?? []
  const [showAll, setShowAll] = React.useState(false)
  const expired = docs.filter(d => (documentExpiry(d.expiryDate)?.days ?? 0) < 0).length
  const shown = showAll ? docs : docs.slice(0, EXPIRING_PREVIEW)

  return (
    <Panel
      icon={<FileClock className="h-4 w-4" />}
      title="Expiring HR documents"
      description="Expired, or expiring in the next 30 days"
      aside={
        docs.length ? (
          <span className="text-xs text-muted-foreground">
            {expired ? (
              <>
                <span className="font-semibold tabular-nums text-rose-700 dark:text-rose-300">{expired}</span> expired ·{' '}
              </>
            ) : null}
            <span className="font-semibold tabular-nums text-foreground">{docs.length - expired}</span> expiring soon
          </span>
        ) : null
      }
    >
      {query.isLoading ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2].map(i => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Could not load expiring documents.</p>
      ) : docs.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
          No HR documents expire in the next 30 days.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {shown.map(doc => {
              const expiry = documentExpiry(doc.expiryDate)
              return (
                <li key={doc.id}>
                  <Link
                    to="/hr/employees/$employeeId"
                    params={{ employeeId: doc.employeeId }}
                    search={{ tab: 'documents' }}
                    className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{doc.employeeName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {documentTypeLabel(doc.documentType)} · {doc.name}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-medium',
                          expiry?.tone === 'expired'
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
                        )}
                      >
                        {expiry?.label}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">{formatDate(doc.expiryDate)}</span>
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
          {docs.length > EXPIRING_PREVIEW ? (
            <button
              type="button"
              onClick={() => setShowAll(v => !v)}
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              {showAll ? 'Show fewer' : `Show all ${docs.length}`}
            </button>
          ) : null}
        </>
      )}
    </Panel>
  )
}

function RecruitmentSnapshot() {
  const query = useRecruitmentSummary()
  const summary = query.data
  const counts = new Map(summary?.pipelineSummary.map(s => [s.stage, s.count]) ?? [])
  const inProgress = summary
    ? PIPELINE_STAGES.slice(0, -1).reduce((sum, s) => sum + (counts.get(s) ?? 0), 0)
    : null

  return (
    <Panel
      className="h-full"
      icon={<Briefcase className="h-4 w-4" />}
      title="Recruitment"
      description="Candidates at each step of the hiring flow"
      aside={
        <Link
          to="/hr/candidates"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Open pipeline <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Link
          to="/hr/vacancies"
          className="group rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/20"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Open vacancies</p>
          <p className="font-display text-xl font-bold tabular-nums">{summary?.openVacancies ?? '—'}</p>
        </Link>
        <Link
          to="/hr/candidates"
          className="group rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/20"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Candidates in progress</p>
          <p className="font-display text-xl font-bold tabular-nums">{inProgress ?? '—'}</p>
        </Link>
      </div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PIPELINE_STAGES.map((stage, idx) => {
          const count = counts.get(stage) ?? 0
          return (
            <li key={stage}>
              <Link
                to="/hr/candidates"
                className={cn(
                  'flex h-full flex-col gap-1 rounded-lg border px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/20',
                  count > 0 ? 'border-border bg-card' : 'border-dashed border-border bg-muted/10',
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                      count > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{candidateStageLabel(stage)}</span>
                </span>
                <span className="font-display text-lg font-bold tabular-nums">{summary ? count : '—'}</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

export default function HrDashboardPage() {
  const navigate = useNavigate()
  const can = useAuthStore.getState().can
  const canRecruit = can('hr.vacancies.read') || can('hr.candidates.read')
  const canAddEmployee = can('employees.create')
  const summaryQuery = useHrSummary()
  const summary = summaryQuery.data
  const loading = summaryQuery.isLoading
  const [filters, setFilters] = React.useState<Filters>({})
  const listRef = React.useRef<HTMLDivElement>(null)

  function applyFilter(next: Filters) {
    setFilters(prev =>
      prev.lifecycle === next.lifecycle && prev.deployment === next.deployment ? {} : next,
    )
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const lc = summary?.lifecycle
  const isFilter = (f: Filters) => filters.lifecycle === f.lifecycle && filters.deployment === f.deployment

  const actions = [
    ...(canRecruit
      ? [
          {
            label: 'Recruitment',
            icon: <Briefcase className="h-4 w-4" />,
            variant: 'outline' as const,
            onClick: () => void navigate({ to: '/hr/recruitment' }),
          },
        ]
      : []),
    ...(canAddEmployee
      ? [
          {
            label: 'Add employee',
            icon: <UserPlus className="h-4 w-4" />,
            onClick: () => void navigate({ to: '/employee/add' }),
          },
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-5" data-testid="hr-dashboard-page">
      <PageHeader
        title="HR Dashboard"
        description="Who works here, who is starting or leaving, and who is ready to be deployed."
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <Users className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'HR Dashboard' }]}
        actions={actions.length ? actions : undefined}
      />

      <PolicyContextPanel moduleType="HR" />

      <section aria-label="Workforce" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="All employees"
          value={summary?.total}
          hint="Everyone on the HR record"
          icon={<UsersRound className="h-5 w-5" />}
          tone="primary"
          loading={loading}
          active={!filters.lifecycle && !filters.deployment}
          onClick={() => applyFilter({})}
        />
        <StatTile
          label="Active"
          value={lc?.ACTIVE}
          hint={lc && lc.ACTIVE_PAUSED ? `Plus ${lc.ACTIVE_PAUSED} paused` : 'Working now'}
          icon={<UserCheck className="h-5 w-5" />}
          tone="emerald"
          loading={loading}
          active={isFilter({ lifecycle: 'ACTIVE' })}
          onClick={() => applyFilter({ lifecycle: 'ACTIVE' })}
        />
        <StatTile
          label="Onboarding"
          value={lc?.ONBOARDING}
          hint={
            lc && lc.PRE_EMPLOYMENT + lc.CLEARED
              ? `Plus ${lc.PRE_EMPLOYMENT + lc.CLEARED} before start`
              : 'New starters settling in'
          }
          icon={<Sprout className="h-5 w-5" />}
          tone="sky"
          loading={loading}
          active={isFilter({ lifecycle: 'ONBOARDING' })}
          onClick={() => applyFilter({ lifecycle: 'ONBOARDING' })}
        />
        <StatTile
          label="Leaving"
          value={lc?.LEAVING}
          hint={lc ? `${lc.LEFT + lc.ALUMNI} already left` : undefined}
          icon={<LogOut className="h-5 w-5" />}
          tone="amber"
          loading={loading}
          active={isFilter({ lifecycle: 'LEAVING' })}
          onClick={() => applyFilter({ lifecycle: 'LEAVING' })}
        />
      </section>

      <div className={cn('grid gap-5', canRecruit && 'xl:grid-cols-5')}>
        <div className={cn(canRecruit && 'xl:col-span-2')}>
          <DeploymentReadiness
            counts={summary?.deployment}
            flagged={summary?.complianceFlagged}
            total={summary?.total}
            active={filters.lifecycle ? undefined : filters.deployment}
            onSelect={status => applyFilter({ deployment: status })}
          />
        </div>
        {canRecruit ? (
          <div className="xl:col-span-3">
            <RecruitmentSnapshot />
          </div>
        ) : null}
      </div>

      <ExpiringDocuments />

      <div ref={listRef} className="scroll-mt-4">
        <Panel
          icon={<Users className="h-4 w-4" />}
          title="Employees"
          description="Click a card above to filter, or search and filter here"
        >
          <HrEmployeeListTable
            lifecycle={filters.lifecycle}
            deployment={filters.deployment}
            onLifecycleChange={lifecycle => setFilters(f => ({ ...f, lifecycle }))}
            onDeploymentChange={deployment => setFilters(f => ({ ...f, deployment }))}
          />
        </Panel>
      </div>
    </div>
  )
}
