import * as React from 'react'
import { Briefcase, UserPlus, Users } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui/page-elements'
import { useRecruitmentSummary } from '@/features/hr/recruitment/hooks/useRecruitment'
import { RecruitmentStageBadge } from '@/features/hr/recruitment/components/RecruitmentStatusBadges'
import { candidateStageLabel } from '@/features/hr/recruitment/utils/recruitment-display.util'

export default function RecruitmentDashboardPage() {
  const summaryQuery = useRecruitmentSummary()
  const summary = summaryQuery.data

  return (
    <div className="flex flex-col gap-4" data-testid="hr-recruitment-dashboard">
      <PageHeader
        title="Recruitment"
        description="Vacancy pipeline, candidate applications, and hiring progress."
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
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Open vacancies</p>
          <p className="mt-1 text-2xl font-semibold">{summary?.openVacancies ?? '—'}</p>
          <Link to="/hr/vacancies" className="mt-2 text-sm text-primary hover:underline">
            View vacancies
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Active candidates</p>
          <p className="mt-1 text-2xl font-semibold">{summary?.activeCandidates ?? '—'}</p>
          <Link to="/hr/candidates" className="mt-2 text-sm text-primary hover:underline">
            View pipeline
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Quick links</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              to="/hr/vacancies"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Briefcase className="h-3.5 w-3.5" />
              Vacancies
            </Link>
            <Link
              to="/hr/candidates"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Users className="h-3.5 w-3.5" />
              Candidates
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
          <h2 className="text-sm font-medium">Pipeline summary</h2>
          {summaryQuery.isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {(summary?.pipelineSummary ?? []).map(row => (
                <li key={row.stage} className="flex items-center justify-between text-sm">
                  <span>{candidateStageLabel(row.stage)}</span>
                  <span className="font-medium">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
          <h2 className="text-sm font-medium">Recent applications</h2>
          {summaryQuery.isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          ) : (summary?.recentApplications ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No recent applications.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {summary?.recentApplications.map(app => (
                <li key={app.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <Link
                      to="/hr/candidates/$candidateId"
                      params={{ candidateId: app.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {app.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{app.vacancyTitle}</p>
                  </div>
                  <RecruitmentStageBadge stage={app.stage} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
