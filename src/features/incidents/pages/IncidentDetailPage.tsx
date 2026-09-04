import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Clock, Lock, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { useAuthStore } from '@/features/auth/store'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import {
  useIncident,
  useChangeIncidentSeverity,
  useChangeIncidentStatus,
} from '@/features/incidents/hooks/useIncidents'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { IncidentReviewSection } from '@/features/incidents/components/IncidentReviewSection'
import { IncidentInvestigationSection } from '@/features/incidents/components/IncidentInvestigationSection'
import { IncidentActionsSection } from '@/features/incidents/components/IncidentActionsSection'
import {
  IncidentAttachmentsPanel,
  IncidentCareRecordsPanel,
  IncidentInjuriesPanel,
  IncidentRelatedPanel,
  IncidentWitnessesPanel,
} from '@/features/incidents/components/IncidentCarePanels'
import { ServiceUserIncidentHistoryPanel } from '@/features/incidents/components/ServiceUserIncidentHistoryPanel'
import { IncidentOutcomeSection } from '@/features/incidents/components/IncidentOutcomeSection'
import {
  IMMEDIATE_ACTION_OPTIONS,
  INCIDENT_SEVERITY_BADGE,
  INCIDENT_STATUS_BADGE,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_TRANSITIONS,
  type IncidentSeverity,
  type IncidentStatus,
} from '@/features/incidents/types'

const SEVERITIES: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const actionLabel = (code: string) =>
  IMMEDIATE_ACTION_OPTIONS.find((o) => o.value === code)?.label ?? code

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

export default function IncidentDetailPage() {
  const { incidentId } = useParams({ strict: false }) as { incidentId: string }
  const can = useAuthStore((s) => s.can)
  const { data: incident, isLoading, isError } = useIncident(incidentId)

  const statusMutation = useChangeIncidentStatus(incidentId)
  const severityMutation = useChangeIncidentSeverity(incidentId)

  const [nextStatus, setNextStatus] = React.useState<IncidentStatus | ''>('')
  const [statusReason, setStatusReason] = React.useState('')
  const [nextSeverity, setNextSeverity] = React.useState<IncidentSeverity | ''>('')
  const [severityReason, setSeverityReason] = React.useState('')

  const canReview = can('incidents.review')
  const canInvestigate = can('incidents.investigate')
  const canManageActions = can('incidents.manage_actions')
  const canEdit = can('incidents.update')
  const canClose = can('incidents.close')
  const canReopen = can('incidents.reopen')

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading incident…</div>
  }
  if (isError || !incident) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden />
        <p className="mt-3 text-sm text-muted-foreground">
          This incident could not be found, or you don’t have permission to view it.
        </p>
        <Link to="/incidents/view" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to all incidents
        </Link>
      </div>
    )
  }

  // CLOSED / REOPENED are driven by the dedicated Outcome & Closure controls.
  const validNext = (INCIDENT_STATUS_TRANSITIONS[incident.status] ?? []).filter(
    (s) => s !== 'CLOSED' && s !== 'REOPENED',
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title={incident.referenceNumber}
        icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accident & Incident' },
          { label: 'All Incidents', href: '/incidents/view' },
          { label: incident.referenceNumber },
        ]}
      />

      <PolicyContextPanel moduleType="INCIDENT" recordId={incident.id} />

      <div className="flex flex-wrap items-center gap-2">
        <Link to="/incidents/view">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
          </Button>
        </Link>
        <span className="text-sm font-medium text-foreground">
          {incident.category.label}
          {incident.subtype ? ` · ${incident.subtype.label}` : ''}
        </span>
        <Badge variant={INCIDENT_SEVERITY_BADGE[incident.severity]}>{incident.severityLabel}</Badge>
        <Badge variant={INCIDENT_STATUS_BADGE[incident.status]}>{incident.statusLabel}</Badge>
        {incident.privacyLevel !== 'NORMAL' && (
          <Badge variant="destructive">
            <Lock className="mr-1 h-3 w-3" /> {incident.privacyLevel === 'RESTRICTED' ? 'Restricted' : 'Highly confidential'}
          </Badge>
        )}
        {incident.injuryOccurred && <Badge variant="warning">Injury recorded</Badge>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Overview">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Incident date & time" value={formatOrganisationIsoDateLong(incident.occurredAt)} />
              <Field label="Reported" value={formatOrganisationIsoDateLong(incident.reportedAt)} />
              <Field label="Specific area" value={incident.specificArea} />
              <Field label="Injury" value={incident.injuryOccurred ? 'Yes' : 'No'} />
            </dl>
            <div className="mt-4 space-y-3">
              <Field label="What happened" value={<p className="whitespace-pre-wrap">{incident.description}</p>} />
              {incident.contextBefore && (
                <Field label="Immediately before" value={<p className="whitespace-pre-wrap">{incident.contextBefore}</p>} />
              )}
              {incident.contextAfter && (
                <Field label="Afterwards" value={<p className="whitespace-pre-wrap">{incident.contextAfter}</p>} />
              )}
            </div>
          </Section>

          <Section title="Immediate actions taken">
            {incident.immediateActionCodes.length === 0 && !incident.immediateActions ? (
              <p className="text-sm text-muted-foreground">None recorded.</p>
            ) : (
              <>
                {incident.immediateActionCodes.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {incident.immediateActionCodes.map((code) => (
                      <Badge key={code} variant="muted" size="sm">
                        {actionLabel(code)}
                      </Badge>
                    ))}
                  </div>
                )}
                {incident.immediateActions && (
                  <p className="whitespace-pre-wrap text-sm text-foreground">{incident.immediateActions}</p>
                )}
              </>
            )}
          </Section>

          <Section title="Corrective actions">
            <IncidentActionsSection
              incidentId={incident.id}
              actions={incident.actions}
              canManage={canManageActions}
            />
          </Section>

          {(incident.injuryOccurred || incident.injuries.length > 0 || canEdit) && (
            <Section title="Injuries">
              <IncidentInjuriesPanel
                incidentId={incident.id}
                injuries={incident.injuries}
                canManage={canEdit}
                serviceUserId={incident.primaryServiceUserId}
              />
            </Section>
          )}

          <Section title="Witnesses">
            <IncidentWitnessesPanel incidentId={incident.id} witnesses={incident.witnesses} canManage={canEdit} />
          </Section>

          <Section title="Related care records">
            <IncidentCareRecordsPanel incidentId={incident.id} records={incident.relatedCareRecords} canManage={canEdit} />
          </Section>

          <Section title="Related incidents">
            <IncidentRelatedPanel incidentId={incident.id} canManage={canEdit} />
          </Section>

          <Section title="Documents & attachments">
            <IncidentAttachmentsPanel incidentId={incident.id} canManage={canEdit} />
          </Section>

          {(canReview || incident.outcome || incident.status === 'CLOSED') && (
            <Section title="Outcome & closure">
              <IncidentOutcomeSection
                incident={incident}
                outcome={incident.outcome}
                canEditOutcome={canReview}
                canClose={canClose}
                canReopen={canReopen}
              />
            </Section>
          )}

          {(canInvestigate || incident.investigation) && (
            <Section title="Investigation">
              <IncidentInvestigationSection
                incidentId={incident.id}
                investigation={incident.investigation}
                canEdit={canInvestigate}
              />
            </Section>
          )}

          <Section title="Timeline">
            <ol className="space-y-3">
              {incident.history.map((ev, i) => (
                <li key={i} className="flex gap-3">
                  <div className="mt-0.5">
                    <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{ev.detail}</p>
                    <p className="text-xs text-muted-foreground">{formatOrganisationIsoDateLong(ev.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Original report">
            <p className="text-sm text-muted-foreground">
              This is the preserved frontline report. Management updates are recorded separately and audited.
            </p>
            <dl className="mt-3 space-y-3">
              <Field label="Reference" value={incident.referenceNumber} />
              <Field label="Submitted" value={formatOrganisationIsoDateLong(incident.reportedAt)} />
            </dl>
          </Section>

          {incident.primaryServiceUserId && (
            <Section title="This service user's incidents">
              <ServiceUserIncidentHistoryPanel
                serviceUserId={incident.primaryServiceUserId}
                excludeIncidentId={incident.id}
              />
            </Section>
          )}

          {(canReview || incident.review) && (
            <Section title="Manager review">
              <IncidentReviewSection incidentId={incident.id} review={incident.review} canEdit={canReview} />
            </Section>
          )}

          {canReview && (
            <Section title="Workflow">
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Move to status</label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as IncidentStatus | '')}
                    disabled={validNext.length === 0}
                  >
                    <option value="">{validNext.length ? 'Select…' : 'No transitions available'}</option>
                    {validNext.map((s) => (
                      <option key={s} value={s}>{INCIDENT_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <input
                    className="mt-2 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Reason (optional)"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                  <Button
                    className="mt-2 w-full"
                    size="sm"
                    disabled={!nextStatus}
                    loading={statusMutation.isPending}
                    onClick={() => {
                      if (!nextStatus) return
                      statusMutation.mutate(
                        { status: nextStatus, reason: statusReason || undefined },
                        { onSuccess: () => { setNextStatus(''); setStatusReason('') } },
                      )
                    }}
                  >
                    Update status
                  </Button>
                </div>

                <div className="border-t border-border pt-4">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Change severity</label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={nextSeverity}
                    onChange={(e) => setNextSeverity(e.target.value as IncidentSeverity | '')}
                  >
                    <option value="">Select…</option>
                    {SEVERITIES.filter((s) => s !== incident.severity).map((s) => (
                      <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                  <input
                    className="mt-2 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Reason (optional)"
                    value={severityReason}
                    onChange={(e) => setSeverityReason(e.target.value)}
                  />
                  <Button
                    className="mt-2 w-full"
                    size="sm"
                    variant="outline"
                    disabled={!nextSeverity}
                    loading={severityMutation.isPending}
                    onClick={() => {
                      if (!nextSeverity) return
                      severityMutation.mutate(
                        { severity: nextSeverity, reason: severityReason || undefined },
                        { onSuccess: () => { setNextSeverity(''); setSeverityReason('') } },
                      )
                    }}
                  >
                    Update severity
                  </Button>
                </div>
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
