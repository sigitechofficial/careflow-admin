import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Loader2,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { useLearningDashboard } from '@/features/learning/hooks/useLearning'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { LEARNING_PATHS } from '@/features/learning/learning-routes'
import { LearningModuleFlowPanel } from '@/features/learning/components/LearningModuleFlowPanel'

function KpiCard({
  title,
  value,
  hint,
  icon,
  tone,
  href,
  loading,
}: {
  title: string
  value: number
  hint: string
  icon: React.ReactNode
  tone: string
  href: string
  loading?: boolean
}) {
  return (
    <Link
      to={href}
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-display font-bold tabular-nums text-foreground">
            {loading ? '—' : value}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}>
          {icon}
        </span>
      </div>
    </Link>
  )
}

export function LearningDashboardPanel() {
  const { locationId } = useGlobalLocationScope()
  const { data, isLoading, isError } = useLearningDashboard(locationId)

  const chartData = data
    ? [
        { name: 'Published', value: data.publishedCourses },
        { name: 'Overdue', value: data.overdueAssignments },
        { name: 'Certificates', value: data.activeCertificates },
        { name: 'Pending ext.', value: data.externalTrainingPending },
      ]
    : []

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Unable to load learning dashboard summary.
      </div>
    )
  }

  return (
    <div className="space-y-8" data-testid="learning-dashboard-panel">
      <LearningModuleFlowPanel />

      <div className="space-y-6">
        <ContentSectionHeader
          title="Overview"
          description="Organisation-wide learning KPIs and quick links."
          icon={<GraduationCap className="h-5 w-5" />}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            title="Courses"
            value={data?.courses ?? 0}
            hint={`${data?.publishedCourses ?? 0} published`}
            icon={<BookOpen className="h-5 w-5" />}
            tone="bg-sky-500/10 text-sky-700 dark:text-sky-300"
            href={LEARNING_PATHS.courses}
            loading={isLoading}
          />
          <KpiCard
            title="Assignments"
            value={data?.assignments ?? 0}
            hint={`${data?.overdueAssignments ?? 0} overdue`}
            icon={<ClipboardList className="h-5 w-5" />}
            tone="bg-amber-500/10 text-amber-800 dark:text-amber-300"
            href={LEARNING_PATHS.assignments}
            loading={isLoading}
          />
          <KpiCard
            title="Certificates"
            value={data?.activeCertificates ?? 0}
            hint="Active certificates"
            icon={<Award className="h-5 w-5" />}
            tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            href={LEARNING_PATHS.certificates}
            loading={isLoading}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Activity snapshot</h3>
            {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">Attention needed</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                {data?.overdueAssignments ?? 0} overdue assignments
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0 text-sky-600" />
                {data?.upcomingTrainingEvents ?? 0} upcoming training events
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 shrink-0 text-violet-600" />
                {data?.externalTrainingPending ?? 0} external training records pending verification
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
