import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Eye, PlusCircle } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import { useIncidents, useIncidentStats } from '@/features/incidents/hooks/useIncidents'
import { INCIDENT_SEVERITY_BADGE, INCIDENT_STATUS_BADGE } from '@/features/incidents/types'

function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'warning' | 'danger' | 'success'
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-destructive'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'success'
          ? 'text-success'
          : 'text-foreground'
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  )
}

export default function IncidentsDashboardPage() {
  const can = useAuthStore((s) => s.can)
  const { locationId } = useGlobalLocationScope()
  const navigate = useNavigate()
  const statsQuery = useIncidentStats(locationId)
  const recentQuery = useIncidents({
    page: 1,
    limit: 8,
    locationId: locationId ?? undefined,
  })
  const stats = statsQuery.data

  return (
    <div className="space-y-4">
      <PageHeader
        title="Incident Dashboard"
        description="Overview of open incidents, severity and workflow status."
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <StatCard label="Open" value={stats?.open ?? 0} />
        <StatCard label="Awaiting review" value={stats?.awaitingReview ?? 0} tone="warning" />
        <StatCard label="Under investigation" value={stats?.underInvestigation ?? 0} tone="warning" />
        <StatCard label="Actions required" value={stats?.actionsRequired ?? 0} tone="danger" />
        <StatCard label="Overdue actions" value={stats?.overdueActions ?? 0} tone="danger" />
        <StatCard label="High / Critical" value={stats?.highOrCritical ?? 0} tone="danger" />
        <StatCard label="Closed this month" value={stats?.closedThisMonth ?? 0} tone="success" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Recent incidents</h3>
          <Link to="/incidents/view" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Reference</th>
                <th className="px-3 py-2.5 font-medium">Event</th>
                <th className="px-3 py-2.5 font-medium">Severity</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Incident date</th>
              </tr>
            </thead>
            <tbody>
              {recentQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : (recentQuery.data?.items.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">No incidents recorded.</td>
                </tr>
              ) : (
                recentQuery.data!.items.map((inc) => (
                  <tr key={inc.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2.5">
                      <Link to="/incidents/$incidentId" params={{ incidentId: inc.id }} className="font-medium text-primary hover:underline">
                        {inc.referenceNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      {inc.category.label}
                      {inc.subtype ? <span className="text-muted-foreground"> · {inc.subtype.label}</span> : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={INCIDENT_SEVERITY_BADGE[inc.severity]} size="sm">{inc.severityLabel}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={INCIDENT_STATUS_BADGE[inc.status]} size="sm">{inc.statusLabel}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatOrganisationIsoDateLong(inc.occurredAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
