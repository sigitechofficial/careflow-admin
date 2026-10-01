import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import {
  Search, X, ChevronLeft,
  ChevronRight, ChevronsLeft, Dot,
  Globe, Loader2,
  Users, UserCheck, CalendarDays, CheckCircle2,
  Bell, AlertTriangle, ShieldAlert, GraduationCap, Wrench,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/shared/ui/card'
import { useAuthStore } from '@/features/auth/store'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
import { useHandoverReport } from '@/features/home/hooks/useHandoverReport'
import type { HandoverReportSortBy } from '@/features/home/api/handover-report.api'
import { operationalTodayIso, addDaysToOperationalIso } from '@/shared/lib/operational-day.util'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useEmployeeChartSummary } from '@/features/employees/hooks/useEmployees'
import { useScheduleList, useHousekeepingJobsNeedingAttention } from '@/features/scheduling/hooks/useScheduling'
import { getJobsDayTimeline } from '@/features/scheduling/api/scheduling.api'
import { schedulingKeys } from '@/features/scheduling/keys'
import { useUnreadNotificationCount } from '@/features/notifications/hooks/useUnreadNotificationCount'
import { useIncidentStats } from '@/features/incidents/hooks/useIncidents'
import { useComplianceBoard } from '@/features/employees/hooks/useEmployeeCompliance'
import { useLearningDashboard } from '@/features/learning/hooks/useLearning'

const systemUpgrades = [
  {
    section: 'New Navigation',
    items: [
      'Streamlined menus to navigate the care system',
      'Updated look and feel of the settings screen',
    ],
  },
  {
    section: 'PainChek Enhancements',
    items: ['Send Service User location information to your PainChek product'],
  },
]

type SortBy = HandoverReportSortBy

function countActiveServiceUsersByZone(
  zones: Array<{ name: string }>,
  members: Array<{ isActive: boolean; zoneName?: string | null }>,
): Array<{ zoneName: string; count: number }> {
  const counts = new Map<string, number>()
  for (const zone of zones) {
    counts.set(zone.name, 0)
  }
  for (const member of members) {
    if (!member.isActive) continue
    const zoneName = member.zoneName?.trim() || 'Unassigned'
    counts.set(zoneName, (counts.get(zoneName) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([zoneName, count]) => ({ zoneName, count }))
}

function toIsoDateInput(value: string): string {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
  if (!m) return ''
  return `${m[3]}-${m[2]}-${m[1]}`
}

function formatDisplayDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

/* ─── Home Page ───────────────────────────────────────────────────────────── */
export default function HomePage() {
  const canManagePortal = useAuthStore(s => s.can('service_users.portal.read'))
  const canReadSettings = useAuthStore(s => s.can('lookups.read'))
  const canReadHandover = useAuthStore(
    s => s.can('schedule.read') || s.can('scheduled_visits.read') || s.can('service_users.read'),
  )
  const generalSettingsQuery = useGeneralSettings(canReadSettings)
  const serviceUserLocationsQuery = useServiceUserLocations(canReadSettings)
  const serviceUsersByZone = React.useMemo(
    () =>
      countActiveServiceUsersByZone(
        serviceUserLocationsQuery.data?.zones ?? [],
        serviceUserLocationsQuery.data?.members ?? [],
      ),
    [serviceUserLocationsQuery.data],
  )
  const windowHours = generalSettingsQuery.data?.handoverReportLastHours ?? 12

  const today = operationalTodayIso()
  const defaultFrom = addDaysToOperationalIso(today, -1)

  const serviceUsersQuery = useServiceUsers({ page: 1, limit: 1 })
  const employeeSummaryQuery = useEmployeeChartSummary()
  const todayVisitsQuery = useScheduleList(today)

  const totalServiceUsers = serviceUsersQuery.data?.meta?.total ?? 0
  const totalCarers = employeeSummaryQuery.data?.staff?.active ?? 0
  const todayJobs = todayVisitsQuery.data?.jobs ?? []
  const todayVisitsCount = todayJobs.length
  const todayCompletedCount = todayJobs.filter(j => j.status === 'COMPLETED').length

  const unreadCount = useUnreadNotificationCount()
  const incidentStats = useIncidentStats()
  const complianceBoard = useComplianceBoard()
  const learningDashboard = useLearningDashboard()
  const housekeepingJobs = useHousekeepingJobsNeedingAttention(1)

  const weekDates = React.useMemo(() => {
    const parts = today.split('-').map(Number)
    const dt = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!))
    const dow = dt.getUTCDay()
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    return Array.from({ length: 7 }, (_, i) =>
      addDaysToOperationalIso(today, mondayOffset + i),
    )
  }, [today])

  const weekQueries = useQueries({
    queries: weekDates.map(date => ({
      queryKey: schedulingKeys.list(date),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getJobsDayTimeline(date, { limit: 200 }, { signal }),
    })),
  })

  const weekVisitsLoading = weekQueries.some(q => q.isLoading)
  const weekDataKey = weekQueries.map(q => q.dataUpdatedAt).join(',')
  const weekStats = React.useMemo(() => {
    let total = 0
    let completed = 0
    for (const q of weekQueries) {
      const jobs = q.data?.jobs ?? []
      total += jobs.length
      completed += jobs.filter(j => j.status === 'COMPLETED').length
    }
    return { total, completed, pending: total - completed }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDataKey])

  const [showFilter, setShowFilter] = React.useState(false)
  const [sortBy, setSortBy] = React.useState<SortBy>('latest')
  const [fromDate, setFromDate] = React.useState(defaultFrom)
  const [toDate, setToDate] = React.useState(today)
  const [serviceUserSearch, setServiceUserSearch] = React.useState('')
  const [appliedFrom, setAppliedFrom] = React.useState<string | undefined>(undefined)
  const [appliedTo, setAppliedTo] = React.useState<string | undefined>(undefined)
  const [appliedName, setAppliedName] = React.useState('')
  const [page, setPage] = React.useState(1)

  const handoverQuery = useHandoverReport({
    from: appliedFrom,
    to: appliedTo,
    serviceUserName: appliedName || undefined,
    sortBy,
    enabled: canReadHandover,
  })

  const PAGE_SIZE = 2
  const entries = handoverQuery.data?.entries ?? []
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const paged = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  React.useEffect(() => {
    setPage(1)
  }, [appliedFrom, appliedTo, appliedName, sortBy, entries.length])

  const applyFilter = () => {
    const from = toIsoDateInput(fromDate) || fromDate
    const to = toIsoDateInput(toDate) || toDate
    setAppliedFrom(from)
    setAppliedTo(to)
    setAppliedName(serviceUserSearch.trim())
    setPage(1)
  }

  const clearFilter = () => {
    setFromDate(defaultFrom)
    setToDate(today)
    setServiceUserSearch('')
    setAppliedFrom(undefined)
    setAppliedTo(undefined)
    setAppliedName('')
    setPage(1)
  }

  const rangeLabel =
    appliedFrom && appliedTo
      ? `${formatDisplayDate(appliedFrom)} – ${formatDisplayDate(appliedTo)}`
      : `Last ${handoverQuery.data?.windowHours ?? windowHours} hours`

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Service Users"
          value={totalServiceUsers}
          hint="Active service users"
          icon={<Users className="h-5 w-5" />}
          tone="sky"
          loading={serviceUsersQuery.isLoading}
          to="/service-users/all"
          data-testid="home-stat-service-users"
        />
        <StatCard
          label="Total Carers"
          value={totalCarers}
          hint="Active employees"
          icon={<UserCheck className="h-5 w-5" />}
          tone="emerald"
          loading={employeeSummaryQuery.isLoading}
          to="/employee/all"
          data-testid="home-stat-carers"
        />
        <StatCard
          label="Today's Visits"
          value={todayVisitsCount}
          hint={`Scheduled for ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
          icon={<CalendarDays className="h-5 w-5" />}
          tone="amber"
          loading={todayVisitsQuery.isLoading}
          to="/scheduling"
          data-testid="home-stat-today-visits"
        />
        <StatCard
          label="Completed Visits"
          value={todayCompletedCount}
          hint={todayVisitsCount > 0 ? `${Math.round((todayCompletedCount / todayVisitsCount) * 100)}% of today's visits` : 'No visits scheduled'}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="violet"
          loading={todayVisitsQuery.isLoading}
          to="/scheduling"
          data-testid="home-stat-completed-visits"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>My Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ActionRow
                icon={<Bell className="h-5 w-5 text-blue-400" />}
                text={
                  <>
                    You have <strong>{unreadCount.data ?? 0}</strong> unread notification{(unreadCount.data ?? 0) !== 1 ? 's' : ''}.
                  </>
                }
              />
              <ActionRow
                icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
                text={
                  <>
                    <strong>{incidentStats.data?.open ?? 0}</strong> open incident{(incidentStats.data?.open ?? 0) !== 1 ? 's' : ''},{' '}
                    <strong>{incidentStats.data?.overdueActions ?? 0}</strong> overdue action{(incidentStats.data?.overdueActions ?? 0) !== 1 ? 's' : ''}.{' '}
                    <Link to="/incidents/dashboard" className="font-bold text-foreground hover:text-primary hover:underline transition-colors">
                      View incidents
                    </Link>
                  </>
                }
              />
              <ActionRow
                icon={<ShieldAlert className="h-5 w-5 text-red-500" />}
                text={
                  <>
                    <strong>{complianceBoard.data?.summary?.expiredCount ?? 0}</strong> expired document{(complianceBoard.data?.summary?.expiredCount ?? 0) !== 1 ? 's' : ''},{' '}
                    <strong>{complianceBoard.data?.summary?.expiring7Count ?? 0}</strong> expiring within 7 days.{' '}
                    <Link to="/employee/compliance" className="font-bold text-foreground hover:text-primary hover:underline transition-colors">
                      Compliance board
                    </Link>
                  </>
                }
              />
              <ActionRow
                icon={<GraduationCap className="h-5 w-5 text-violet-500" />}
                text={
                  <>
                    <strong>{learningDashboard.data?.overdueAssignments ?? 0}</strong> overdue training assignment{(learningDashboard.data?.overdueAssignments ?? 0) !== 1 ? 's' : ''}.{' '}
                    <Link to="/learning" className="font-bold text-foreground hover:text-primary hover:underline transition-colors">
                      Learning dashboard
                    </Link>
                  </>
                }
              />
              <ActionRow
                icon={<Wrench className="h-5 w-5 text-orange-500" />}
                text={
                  <>
                    <strong>{housekeepingJobs.data?.meta?.total ?? 0}</strong> visit{(housekeepingJobs.data?.meta?.total ?? 0) !== 1 ? 's' : ''} needing attention.{' '}
                    <Link to="/scheduling/jobs" className="font-bold text-foreground hover:text-primary hover:underline transition-colors">
                      Manage jobs
                    </Link>
                  </>
                }
              />
              {canManagePortal ? (
                <ActionRow
                  icon={<Globe className="h-5 w-5 text-sky-500" />}
                  text={
                    <>
                      Manage service user portal access.{' '}
                      <Link
                        to="/admin/service-user-portal"
                        className="font-bold text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        Open portal admin
                      </Link>
                    </>
                  }
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Handover Report</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{rangeLabel}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowFilter(f => !f)}
                  disabled={!canReadHandover}
                >
                  {showFilter ? 'Hide Filter' : 'Show Filter'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canReadHandover ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  You do not have permission to view the handover report.
                </p>
              ) : (
                <>
                  {showFilter && (
                    <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-sm font-medium w-36 shrink-0">From</label>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={e => setFromDate(e.target.value)}
                          className="flex-1 min-w-[220px] border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-sm font-medium w-36 shrink-0">To</label>
                        <input
                          type="date"
                          value={toDate}
                          onChange={e => setToDate(e.target.value)}
                          className="flex-1 min-w-[220px] border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-sm font-medium w-36 shrink-0">Service User Name</label>
                        <div className="flex gap-2 flex-1 min-w-[220px]">
                          <input
                            type="text"
                            value={serviceUserSearch}
                            onChange={e => setServiceUserSearch(e.target.value)}
                            placeholder="Service User Name"
                            className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            onKeyDown={e => {
                              if (e.key === 'Enter') applyFilter()
                            }}
                          />
                          <button
                            type="button"
                            onClick={applyFilter}
                            className="bg-primary text-primary-foreground rounded-md px-3 py-2 hover:bg-primary/90 transition-colors"
                          >
                            <Search className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={applyFilter}
                          className="border border-border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={clearFilter}
                          className="flex items-center gap-1.5 border border-border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                          Clear Filter
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-5 flex-wrap">
                    <span className="text-sm text-muted-foreground">Sort report by</span>
                    {([
                      { value: 'name', label: 'Service User Name' },
                      { value: 'earliest', label: 'Sort by Time Earliest' },
                      { value: 'latest', label: 'Sort by Time Latest' },
                    ] as { value: SortBy; label: string }[]).map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          checked={sortBy === opt.value}
                          onChange={() => {
                            setSortBy(opt.value)
                            setPage(1)
                          }}
                          className="h-4 w-4 accent-primary"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>

                  {handoverQuery.isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading handover report…
                    </div>
                  ) : handoverQuery.isError ? (
                    <p className="text-sm text-destructive py-4 text-center">
                      Could not load handover report.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-5 divide-y divide-border">
                        {paged.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No handover notes in this period.
                          </p>
                        ) : (
                          paged.map(entry => (
                            <div key={entry.id} className="pt-4 first:pt-0">
                              <Link
                                to="/service-users/$serviceUserId"
                                params={{ serviceUserId: entry.serviceUserId }}
                                className="text-primary hover:underline font-semibold text-sm text-left"
                              >
                                {entry.serviceUserName}
                              </Link>
                              <p className="text-sm font-medium mt-0.5">
                                {entry.timeLabel} - {entry.task} - {entry.carerName}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-4">
                                {entry.notes}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {entries.length > PAGE_SIZE && (
                        <div className="flex items-center justify-center gap-1 pt-2">
                          <PaginationBtn onClick={() => setPage(1)} disabled={page === 1}>
                            <ChevronsLeft className="h-3.5 w-3.5" />
                            <span>First Page</span>
                          </PaginationBtn>
                          <PaginationBtn
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            <span>Previous</span>
                          </PaginationBtn>
                          <span className="text-xs text-muted-foreground px-2">
                            {page} / {totalPages}
                          </span>
                          <PaginationBtn
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                          >
                            <span>Next</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </PaginationBtn>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="pt-5">
              <h2 className="font-bold text-base mb-4">
                Weekly Visits Overview
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                {weekDates[0] && weekDates[6]
                  ? `${formatDisplayDate(weekDates[0])} – ${formatDisplayDate(weekDates[6])}`
                  : 'Current week'}
              </p>
              {weekVisitsLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading visits…
                </div>
              ) : weekStats.total === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  No visits scheduled this week.
                </p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: weekStats.completed },
                          { name: 'Pending', value: weekStats.pending },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value}`, 'Visits']}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--card)',
                          fontSize: '12px',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 flex items-center justify-center gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold text-foreground tabular-nums">{weekStats.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{weekStats.completed}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{weekStats.pending}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {canReadSettings ? (
            <Card data-testid="home-service-users-by-zone">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-bold text-base">Service users by zone</h2>
                  <Link
                    to="/settings/location-management"
                    className="shrink-0 text-xs font-medium text-primary hover:underline"
                  >
                    Manage zones
                  </Link>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-3">
                  {serviceUserLocationsQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading zones…</p>
                  ) : serviceUserLocationsQuery.isError ? (
                    <p className="text-sm text-destructive">Could not load zone counts.</p>
                  ) : serviceUsersByZone.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No zones configured.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {serviceUsersByZone.map(row => (
                        <li
                          key={row.zoneName}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="truncate text-foreground">{row.zoneName}</span>
                          <span className="shrink-0 tabular-nums font-medium text-foreground">
                            {row.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <span>Version Number - 5.9.2</span>
        <span>Licence expire on 31 Dec 50</span>
      </div>
    </div>
  )
}

function ActionRow({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <span className="shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function PaginationBtn({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1 rounded border border-border text-xs transition-colors',
        disabled
          ? 'opacity-40 cursor-not-allowed bg-muted'
          : 'hover:bg-muted bg-background',
      )}
    >
      {children}
    </button>
  )
}
