import { Link } from '@tanstack/react-router'
import { CheckCircle2, ClipboardList } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import { useCompleteIncidentAction, useMyIncidentActions } from '@/features/incidents/hooks/useIncidents'
import {
  INCIDENT_ACTION_STATUS_BADGE,
  INCIDENT_ACTION_STATUS_LABELS,
} from '@/features/incidents/types'

export default function MyActionsPage() {
  const { data: actions, isLoading } = useMyIncidentActions()
  const completeMutation = useCompleteIncidentAction()

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Actions"
        description="Corrective actions from incidents assigned to you."
        icon={<ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accident & Incident' },
          { label: 'My Actions' },
        ]}
      />

      <div className="rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <p className="p-8 text-center text-muted-foreground">Loading…</p>
        ) : (actions?.length ?? 0) === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success/60" aria-hidden />
            <p className="mt-2 text-sm text-muted-foreground">You have no outstanding actions. Nice work.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {actions!.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                    {a.title}
                    {a.isMandatory && <Badge variant="destructive" size="sm">Mandatory</Badge>}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Link to="/incidents/$incidentId" params={{ incidentId: a.incidentId }} className="text-xs text-primary hover:underline">
                      {a.incidentReference}
                    </Link>
                    <Badge variant={INCIDENT_ACTION_STATUS_BADGE[a.displayStatus]} size="sm">
                      {INCIDENT_ACTION_STATUS_LABELS[a.displayStatus]}
                    </Badge>
                    {a.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        Due {formatOrganisationIsoDateLong(a.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  loading={completeMutation.isPending}
                  onClick={() => completeMutation.mutate({ actionId: a.id })}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Complete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
