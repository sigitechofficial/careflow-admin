import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Lock, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { useAuthStore } from '@/features/auth/store'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
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
import { IncidentCategoryDetailsView } from '@/features/incidents/components/IncidentCategoryDetailsView'
import { CATEGORY_DETAILS_TITLE } from '@/features/incidents/category-details'
import { useEmployee } from '@/features/employees/hooks/useEmployees'
import { IncidentOutcomeSection } from '@/features/incidents/components/IncidentOutcomeSection'
import { IncidentTimeline } from '@/features/incidents/components/IncidentTimeline'
import {
  IncidentWorkflowStepCard,
  resolveIncidentDetailWorkflow,
} from '@/features/incidents/components/IncidentWorkflowStepCard'
import {
  IMMEDIATE_ACTION_OPTIONS,
  INCIDENT_SEVERITY_BADGE,
  INCIDENT_STATUS_BADGE,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_TRANSITIONS,
  WHO_INFORMED_LABELS,
  isReinvestigateTransition,
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

const yesNoUnknown = (v: boolean | null | undefined) => (v === true ? 'Yes' : v === false ? 'No' : 'Not known')

function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 p-3 sm:p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  )
}

export default function IncidentDetailPage() {
  const { incidentId } = useParams({ strict: false }) as { incidentId: string }
  const can = useAuthStore((s) => s.can)
  const { data: incident, isLoading, isError } = useIncident(incidentId)

  const allegedStaffId =
    ((incident?.categoryDetails?.allegedPerson as { employeeId?: string } | undefined)?.employeeId) ?? ''
  const allegedStaffQuery = useEmployee(allegedStaffId, Boolean(allegedStaffId))
  const staffName = (id: string) => {
    const pd = id === allegedStaffId ? allegedStaffQuery.data?.personalDetail : undefined
    return pd ? [pd.firstName, pd.lastName].filter(Boolean).join(' ') || undefined : undefined
  }

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

  const validNext = (INCIDENT_STATUS_TRANSITIONS[incident.status] ?? []).filter(
    (s) => s !== 'CLOSED',
  )
  const hasFinalOutcome = Boolean(incident.outcome?.finalOutcome?.trim())
  const workflow = resolveIncidentDetailWorkflow(incident.status, hasFinalOutcome)
  const stepState = Object.fromEntries(workflow.steps.map((s) => [s.id, s])) as Record<
    (typeof workflow.steps)[number]['id'],
    (typeof workflow.steps)[number]
  >

  const canStartInvestigation =
    canReview && incident.status === 'REPORTED' && validNext.includes('UNDER_INVESTIGATION')
  const canMarkActionsRequired =
    canReview &&
    (incident.status === 'UNDER_INVESTIGATION' ||
      incident.status === 'AWAITING_REVIEW' ||
      incident.status === 'REOPENED' ||
      incident.status === 'AWAITING_CLOSURE') &&
    validNext.includes('ACTIONS_REQUIRED')
  const canMarkReadyToClose =
    canReview &&
    (incident.status === 'UNDER_INVESTIGATION' ||
      incident.status === 'ACTIONS_REQUIRED' ||
      incident.status === 'AWAITING_REVIEW' ||
      incident.status === 'REOPENED') &&
    validNext.includes('AWAITING_CLOSURE')
  const canSubmitReinvestigate =
    canReopen &&
    validNext.includes('UNDER_INVESTIGATION') &&
    isReinvestigateTransition(incident.status, 'UNDER_INVESTIGATION')

  const legacyNext = validNext.filter((s) => {
    if (s === 'UNDER_INVESTIGATION' && (canStartInvestigation || canSubmitReinvestigate)) return false
    if (s === 'AWAITING_CLOSURE' && canMarkReadyToClose) return false
    if (s === 'ACTIONS_REQUIRED' && canMarkActionsRequired) return false
    return true
  })

  const currentHint = stepState[workflow.currentId]?.hint

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
            <Lock className="mr-1 h-3 w-3" />{' '}
            {incident.privacyLevel === 'RESTRICTED' ? 'Restricted' : 'Highly confidential'}
          </Badge>
        )}
        {incident.injuryOccurred && <Badge variant="warning">Injury recorded</Badge>}
        {incident.carerSafeguardingConcern && (
          <Badge variant="destructive">
            <ShieldAlert className="mr-1 h-3 w-3" /> Safeguarding concern raised
          </Badge>
        )}
        {incident.followUpRequired && <Badge variant="warning">Follow-up required</Badge>}
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Workflow
        </p>
        <ol className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
          {workflow.steps.map((step, index) => (
            <li key={step.id} className="flex items-center gap-2 text-sm">
              {index > 0 ? (
                <span className="hidden text-muted-foreground sm:inline" aria-hidden>
                  →
                </span>
              ) : null}
              <span
                className={
                  step.state === 'current'
                    ? 'font-semibold text-foreground'
                    : step.state === 'complete'
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/70'
                }
              >
                {step.label.replace(/^\d+\.\s*/, '')}
                {step.state === 'current' ? ' (now)' : ''}
              </span>
            </li>
          ))}
        </ol>
        {currentHint && (
          <p className="mt-2 text-sm text-foreground">
            <span className="font-medium">Next: </span>
            {currentHint}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {/* Step 1 — Raise */}
        <IncidentWorkflowStepCard
          stepNumber={1}
          title="Raise"
          hint={stepState.raise.hint}
          state={stepState.raise.state}
          nextAction={
            canStartInvestigation ? (
              <Button
                size="sm"
                loading={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    status: 'UNDER_INVESTIGATION',
                    reason: 'Started investigation',
                  })
                }
              >
                Start investigation
              </Button>
            ) : undefined
          }
        >
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Incident date & time" value={formatOrganisationDateTime(incident.occurredAt)} />
            <Field label="Reported time" value={formatOrganisationDateTime(incident.reportedAt)} />
            <Field label="Reported by" value={incident.reportedBy?.name} />
            <Field
              label="Recorded by"
              value={
                incident.reportedBy?.source === 'CARER_APP'
                  ? 'Carer app (self-reported)'
                  : incident.reportedBy?.recordedByName
              }
            />
            <Field label="Specific area" value={incident.specificArea} />
            <Field label="Injury" value={incident.injuryOccurred ? 'Yes' : 'No'} />
            {incident.scheduledJobId && (
              <Field
                label="Reported during visit"
                value={
                  <Link
                    to="/scheduling/visits/$jobId"
                    params={{ jobId: incident.scheduledJobId }}
                    className="text-primary underline underline-offset-2 hover:no-underline"
                  >
                    Open visit
                  </Link>
                }
              />
            )}
          </dl>
          <div className="mt-4 space-y-3">
            <Field label="What happened" value={<p className="whitespace-pre-wrap">{incident.description}</p>} />
            {incident.contextBefore && (
              <Field
                label="Immediately before"
                value={<p className="whitespace-pre-wrap">{incident.contextBefore}</p>}
              />
            )}
            {incident.contextAfter && (
              <Field
                label="Afterwards"
                value={<p className="whitespace-pre-wrap">{incident.contextAfter}</p>}
              />
            )}
            {incident.peopleInvolved && (
              <Field
                label="People involved"
                value={<p className="whitespace-pre-wrap">{incident.peopleInvolved}</p>}
              />
            )}
          </div>

          {(incident.affectedPersonKinds.length > 0 ||
            incident.ambulanceAttended != null ||
            incident.takenToAe != null ||
            incident.admittedToHospital != null) && (
            <SubBlock title="Hospital outcome">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Ambulance attended" value={yesNoUnknown(incident.ambulanceAttended)} />
                <Field label="Taken to A&E" value={yesNoUnknown(incident.takenToAe)} />
                <Field label="Admitted to hospital" value={yesNoUnknown(incident.admittedToHospital)} />
              </dl>
            </SubBlock>
          )}

          {incident.categoryDetails && Object.keys(incident.categoryDetails).length > 0 && (
            <SubBlock title={CATEGORY_DETAILS_TITLE[incident.category.key] ?? 'Category details'}>
              <IncidentCategoryDetailsView details={incident.categoryDetails} staffNameById={staffName} />
            </SubBlock>
          )}

          <SubBlock title="Immediate response">
            {incident.immediateActionCodes.length === 0 &&
            !incident.immediateActions &&
            incident.whoInformedKeys.length === 0 &&
            !incident.emergencyServicesDetails ? (
              <p className="text-sm text-muted-foreground">None recorded.</p>
            ) : (
              <>
                {incident.immediateActionCodes.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      What was done
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                    {incident.immediateActionCodes.map((code) => (
                      <Badge key={code} variant="muted" size="sm">
                        {actionLabel(code)}
                      </Badge>
                    ))}
                    </div>
                  </div>
                )}
                {incident.immediateActions && (
                  <p className="whitespace-pre-wrap text-sm text-foreground">{incident.immediateActions}</p>
                )}
                {incident.whoInformedKeys.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Who was informed
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {incident.whoInformedKeys.map((key) => (
                        <Badge key={key} variant="outline" size="sm">
                          {WHO_INFORMED_LABELS[key] ?? key}
                        </Badge>
                      ))}
                      {incident.familyInformed && !incident.whoInformedKeys.includes('family_nok') && (
                        <Badge variant="outline" size="sm">
                          Family / NOK informed
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                {incident.emergencyServicesDetails && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Emergency services
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {incident.emergencyServicesDetails}
                    </p>
                  </div>
                )}
              </>
            )}
          </SubBlock>

          {(incident.injuryOccurred || incident.injuries.length > 0 || canEdit) && (
            <SubBlock title="Injuries">
              {incident.injuryDetails && (
                <p className="mb-3 whitespace-pre-wrap text-sm text-foreground">{incident.injuryDetails}</p>
              )}
              <IncidentInjuriesPanel
                incidentId={incident.id}
                injuries={incident.injuries}
                canManage={canEdit}
                serviceUserId={incident.primaryServiceUserId}
              />
            </SubBlock>
          )}

          <SubBlock title="Witnesses">
            <IncidentWitnessesPanel
              incidentId={incident.id}
              witnesses={incident.witnesses}
              canManage={canEdit}
            />
          </SubBlock>
        </IncidentWorkflowStepCard>

        {/* Step 2 — Investigate */}
        <IncidentWorkflowStepCard
          stepNumber={2}
          title="Investigate"
          hint={stepState.investigate.hint}
          state={stepState.investigate.state}
          nextAction={
            canMarkActionsRequired ? (
              <Button
                size="sm"
                loading={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    status: 'ACTIONS_REQUIRED',
                    reason: 'Corrective measures required',
                  })
                }
              >
                Actions required
              </Button>
            ) : undefined
          }
        >
          {(canInvestigate || incident.investigation) && (
            <IncidentInvestigationSection
              incidentId={incident.id}
              investigation={incident.investigation}
              carerSuspensions={incident.carerSuspensions ?? []}
              courseRecommendations={incident.courseRecommendations ?? []}
              canEdit={canInvestigate}
              primaryEmployeeId={incident.primaryEmployeeId}
            />
          )}
          {!canInvestigate && !incident.investigation && (
            <p className="text-sm text-muted-foreground">No investigation recorded yet.</p>
          )}
          {(canReview || incident.review) && (
            <SubBlock title="Manager review">
              <IncidentReviewSection
                incidentId={incident.id}
                review={incident.review}
                canEdit={canReview}
              />
            </SubBlock>
          )}
        </IncidentWorkflowStepCard>

        {/* Step 3 — Corrective measures */}
        <IncidentWorkflowStepCard
          stepNumber={3}
          title="Corrective measures"
          hint={stepState.actions.hint}
          state={stepState.actions.state}
          nextAction={
            canMarkReadyToClose ? (
              <Button
                size="sm"
                loading={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    status: 'AWAITING_CLOSURE',
                    reason: 'Ready to close',
                  })
                }
              >
                Ready to close
              </Button>
            ) : undefined
          }
        >
          <IncidentActionsSection
            incidentId={incident.id}
            actions={incident.actions}
            canManage={canManageActions}
          />
        </IncidentWorkflowStepCard>

        {/* Step 4 — Outcome & close */}
        <IncidentWorkflowStepCard
          stepNumber={4}
          title="Outcome & close"
          hint={stepState.outcome.hint}
          state={stepState.outcome.state}
          nextAction={
            canSubmitReinvestigate ? (
              <Button
                size="sm"
                variant="outline"
                loading={statusMutation.isPending}
                onClick={() => {
                  const reason = window.prompt('Reason for re-investigation?')
                  if (!reason?.trim()) return
                  statusMutation.mutate({
                    status: 'UNDER_INVESTIGATION',
                    reason: reason.trim(),
                  })
                }}
              >
                Submit for re-investigation
              </Button>
            ) : undefined
          }
        >
          {canReview || incident.outcome || incident.status === 'CLOSED' || incident.status === 'AWAITING_CLOSURE' ? (
            <IncidentOutcomeSection
              incident={incident}
              outcome={incident.outcome}
              canEditOutcome={canReview}
              canClose={canClose}
              canReopen={canReopen}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Move to Ready to close when investigation and corrective measures are finished.
            </p>
          )}
        </IncidentWorkflowStepCard>

        <Section title="Supporting records">
          <div className="space-y-4">
            <SubBlock title="Documents & attachments">
              <IncidentAttachmentsPanel incidentId={incident.id} canManage={canEdit} />
            </SubBlock>
            <SubBlock title="Related care records">
              <IncidentCareRecordsPanel
                incidentId={incident.id}
                records={incident.relatedCareRecords ?? []}
                canManage={canEdit}
                serviceUserId={incident.primaryServiceUserId}
              />
            </SubBlock>
            <SubBlock title="Related incidents">
              <IncidentRelatedPanel incidentId={incident.id} canManage={canEdit} />
            </SubBlock>
            {incident.primaryServiceUserId && (
              <SubBlock title="This service user's incidents">
                <ServiceUserIncidentHistoryPanel
                  serviceUserId={incident.primaryServiceUserId}
                  excludeIncidentId={incident.id}
                />
              </SubBlock>
            )}
            <SubBlock title="Original report">
              <p className="text-sm text-muted-foreground">
                Preserved frontline report. Management updates are recorded separately and audited.
              </p>
              <dl className="mt-3 space-y-3">
                <Field label="Reference" value={incident.referenceNumber} />
                <Field label="Submitted" value={formatOrganisationDateTime(incident.reportedAt)} />
                {incident.carerSafeguardingConcern != null && (
                  <Field
                    label="Safeguarding concern"
                    value={incident.carerSafeguardingConcern ? 'Yes' : 'No'}
                  />
                )}
                {incident.followUpRequired && <Field label="Follow-up required" value="Yes" />}
                {incident.familyInformed && <Field label="Family informed" value="Yes" />}
              </dl>
              {incident.carerNotes && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Carer notes
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{incident.carerNotes}</p>
                </div>
              )}
            </SubBlock>
          </div>
        </Section>

        <Section title="Timeline">
          <IncidentTimeline events={incident.history ?? []} />
        </Section>

        {canReview && (
          <Section title="Admin controls">
            <div className="space-y-4">
              {legacyNext.length > 0 && (
                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Other status
                  </label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as IncidentStatus | '')}
                  >
                    <option value="">Select…</option>
                    {legacyNext.map((s) => (
                      <option key={s} value={s}>
                        {INCIDENT_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <input
                    className="mt-2 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={
                      nextStatus && isReinvestigateTransition(incident.status, nextStatus)
                        ? 'Reason (required)'
                        : 'Reason (optional)'
                    }
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                  <Button
                    className="mt-2"
                    size="sm"
                    variant="outline"
                    disabled={
                      !nextStatus ||
                      (isReinvestigateTransition(incident.status, nextStatus) &&
                        !statusReason.trim())
                    }
                    loading={statusMutation.isPending}
                    onClick={() => {
                      if (!nextStatus) return
                      statusMutation.mutate(
                        { status: nextStatus, reason: statusReason || undefined },
                        {
                          onSuccess: () => {
                            setNextStatus('')
                            setStatusReason('')
                          },
                        },
                      )
                    }}
                  >
                    Update status
                  </Button>
                </div>
              )}

              <div className={legacyNext.length > 0 ? 'border-t border-border pt-4' : undefined}>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Change severity
                </label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={nextSeverity}
                  onChange={(e) => setNextSeverity(e.target.value as IncidentSeverity | '')}
                >
                  <option value="">Select…</option>
                  {SEVERITIES.filter((s) => s !== incident.severity).map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
                <input
                  className="mt-2 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Reason (optional)"
                  value={severityReason}
                  onChange={(e) => setSeverityReason(e.target.value)}
                />
                <Button
                  className="mt-2"
                  size="sm"
                  variant="outline"
                  disabled={!nextSeverity}
                  loading={severityMutation.isPending}
                  onClick={() => {
                    if (!nextSeverity) return
                    severityMutation.mutate(
                      { severity: nextSeverity, reason: severityReason || undefined },
                      {
                        onSuccess: () => {
                          setNextSeverity('')
                          setSeverityReason('')
                        },
                      },
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
  )
}
