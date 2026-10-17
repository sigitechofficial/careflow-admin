import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  ListChecks,
  PlusCircle,
  Search,
  Scale,
  ShieldAlert,
} from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '@/shared/ui/card'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { useIncidents, useIncidentStats } from '@/features/incidents/hooks/useIncidents'
import { INCIDENT_SEVERITY_BADGE, INCIDENT_STATUS_BADGE } from '@/features/incidents/types'

export default function IncidentsDashboardPage() {
  const can = useAuthStore(s => s.can)
  const { locationId } = useGlobalLocationScope()
  const navigate = useNavigate()
  // Re-render when the organisation timezone loads so recent-incident dates use it.
  const { timezoneReady } = useOrganisationDisplayFormat()
  const statsQuery = useIncidentStats(locationId)
  const recentQuery = useIncidents({
    page: 1,
    limit: 8,
    locationId: locationId ?? undefined,
  })
  const stats = statsQuery.data
  const loading = statsQuery.isLoading
  const items = recentQuery.data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident Dashboard"
        description="What needs attention, and recent activity."
        icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accident & Incident' },
          { label: 'Dashboard' },
        ]}
        actions={[
          {
            label: 'All incidents',
            onClick: () => navigate({ to: '/incidents/view' }),
            icon: <Eye className="h-4 w-4" />,
          },
          ...(can('incidents.create')
            ? [
                {
                  label: 'Raise incident',
                  onClick: () => navigate({ to: '/incidents/raise' }),
                  icon: <PlusCircle className="h-4 w-4" />,
                },
              ]
            : []),
        ]}
      />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Needs attention</h2>
          <Link
            to="/incidents/view"
            className="text-xs font-medium text-primary hover:underline"
          >
            Open list
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Overdue actions"
            value={stats?.overdueActions ?? 0}
            hint="Past due date"
            icon={<Clock className="h-5 w-5" aria-hidden />}
            tone="destructive"
            emphasize={(stats?.overdueActions ?? 0) > 0}
            loading={loading}
            to="/incidents/view"
            search={{ overdue: true }}
          />
          <StatCard
            label="Open high / critical"
            value={stats?.highOrCritical ?? 0}
            hint="Open severe cases"
            icon={<ShieldAlert className="h-5 w-5" aria-hidden />}
            tone="rose"
            emphasize={(stats?.highOrCritical ?? 0) > 0}
            loading={loading}
            to="/incidents/view"
            search={{ open: true, severity: 'HIGH,CRITICAL' }}
          />
          <StatCard
            label="Actions required"
            value={stats?.actionsRequired ?? 0}
            hint="Waiting on follow-up"
            icon={<ListChecks className="h-5 w-5" aria-hidden />}
            tone="amber"
            loading={loading}
            to="/incidents/view"
            search={{ status: 'ACTIONS_REQUIRED' }}
          />
          <StatCard
            label="Duty of Candour overdue"
            value={stats?.candourOverdue ?? 0}
            hint="Not told in time"
            icon={<Scale className="h-5 w-5" aria-hidden />}
            tone="destructive"
            emphasize={(stats?.candourOverdue ?? 0) > 0}
            loading={loading}
            to="/incidents/view"
            search={{ doc: true }}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Workflow</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Open"
            value={stats?.open ?? 0}
            icon={<ClipboardList className="h-5 w-5" aria-hidden />}
            tone="sky"
            loading={loading}
            to="/incidents/view"
            search={{ open: true }}
          />
          <StatCard
            label="Not picked up"
            value={stats?.notPickedUp ?? 0}
            icon={<Search className="h-5 w-5" aria-hidden />}
            tone="amber"
            loading={loading}
            to="/incidents/view"
            search={{ status: 'REPORTED' }}
          />
          <StatCard
            label="Under investigation"
            value={stats?.underInvestigation ?? 0}
            icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
            tone="violet"
            loading={loading}
            to="/incidents/view"
            search={{ status: 'UNDER_INVESTIGATION' }}
          />
          <StatCard
            label="Closed this month"
            value={stats?.closedThisMonth ?? 0}
            icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
            tone="emerald"
            loading={loading}
            to="/incidents/view"
            search={{ status: 'CLOSED', closed: stats?.monthStart }}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_240px]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border py-4">
            <CardTitle className="text-sm">Recent incidents</CardTitle>
            <Button type="button" size="sm" variant="ghost" asChild>
              <Link to="/incidents/view">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentQuery.isLoading ? (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                  <ClipboardList className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No incidents yet</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Raised incidents will show up here.
                  </p>
                </div>
                {can('incidents.create') ? (
                  <Button type="button" size="sm" asChild>
                    <Link to="/incidents/raise">Raise incident</Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Reference</th>
                      <th className="px-4 py-2.5 font-medium">Event</th>
                      <th className="px-4 py-2.5 font-medium">Severity</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(inc => (
                      <tr
                        key={inc.id}
                        className="border-b border-border/70 last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to="/incidents/$incidentId"
                            params={{ incidentId: inc.id }}
                            className="font-medium text-primary hover:underline"
                          >
                            {inc.referenceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-foreground">{inc.category.label}</span>
                          {inc.subtype ? (
                            <span className="text-muted-foreground"> · {inc.subtype.label}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={INCIDENT_SEVERITY_BADGE[inc.severity]} size="sm">
                            {inc.severityLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={INCIDENT_STATUS_BADGE[inc.status]} size="sm">
                            {inc.statusLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {timezoneReady ? formatOrganisationDateTime(inc.occurredAt) : '…'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border py-4">
            <CardTitle className="text-sm">Shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-3">
            <ShortcutLink to="/incidents/view" icon={<Eye className="h-4 w-4" />} label="All incidents" />
            <ShortcutLink
              to="/incidents/my-actions"
              icon={<ListChecks className="h-4 w-4" />}
              label="My actions"
            />
            <ShortcutLink
              to="/incidents/analytics"
              icon={<BarChart3 className="h-4 w-4" />}
              label="Analytics"
            />
            {can('incidents.create') ? (
              <ShortcutLink
                to="/incidents/raise"
                icon={<PlusCircle className="h-4 w-4" />}
                label="Raise incident"
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ShortcutLink({
  to,
  icon,
  label,
}: {
  to: '/incidents/view' | '/incidents/my-actions' | '/incidents/analytics' | '/incidents/raise'
  icon: ReactNode
  label: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  )
}
