import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Check, Lock, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import {
  useIncident,
  useChangeIncidentSeverity,
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
import { IncidentNextStepBar } from '@/features/incidents/components/IncidentNextStepBar'
import { CATEGORY_DETAILS_TITLE } from '@/features/incidents/category-details'
import { useEmployee } from '@/features/employees/hooks/useEmployees'
import { IncidentOutcomeSection } from '@/features/incidents/components/IncidentOutcomeSection'
import { IncidentTimeline } from '@/features/incidents/components/IncidentTimeline'
import {
  IncidentWorkflowStepCard,
  resolveIncidentDetailWorkflow,
  type WorkflowStepState,
} from '@/features/incidents/components/IncidentWorkflowStepCard'
import {
  IMMEDIATE_ACTION_OPTIONS,
  INCIDENT_SEVERITY_BADGE,
  INCIDENT_STATUS_BADGE,
  INCIDENT_PERSON_KIND_OPTIONS,
  WHO_INFORMED_LABELS,
  type IncidentSeverity,
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

/** Tab label for a workflow step: tick when done, number otherwise, "Now" on the current step. */
function StepTabLabel({ n, label, state }: { n: number; label: string; state: WorkflowStepState }) {
  return (
    <>
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold',
          state === 'complete' && 'border-success bg-success text-white',
          state === 'current' && 'border-primary text-primary',
          state === 'upcoming' && 'border-muted-foreground/40 text-muted-foreground',
        )}
        aria-hidden
      >
        {state === 'complete' ? <Check className="h-3 w-3" /> : n}
      </span>
      {label}
      {state === 'current' ? (
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
          Now
        </span>
      ) : null}
    </>
  )
}

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
  // Re-render when the organisation timezone loads so dates/timeline use it.
  useOrganisationDisplayFormat()
  const { data: incident, isLoading, isError } = useIncident(incidentId)

  const allegedStaffId =
    ((incident?.categoryDetails?.allegedPerson as { employeeId?: string } | undefined)?.employeeId) ?? ''
  const allegedStaffQuery = useEmployee(allegedStaffId, Boolean(allegedStaffId))
  const staffName = (id: string) => {
    const pd = id === allegedStaffId ? allegedStaffQuery.data?.personalDetail : undefined
    return pd ? [pd.firstName, pd.lastName].filter(Boolean).join(' ') || undefined : undefined
  }

  const severityMutation = useChangeIncidentSeverity(incidentId)

  const [nextSeverity, setNextSeverity] = React.useState<IncidentSeverity | ''>('')
  const [severityReason, setSeverityReason] = React.useState('')
  // Selected tab; null = follow the current workflow step (and jump there when the step changes).
  const [tab, setTab] = React.useState<string | null>(null)
  const currentStepId = incident
    ? resolveIncidentDetailWorkflow(incident.status, Boolean(incident.outcome?.finalOutcome?.trim()))
        .currentId
    : null
  React.useEffect(() => {
    setTab(null)
  }, [currentStepId])

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

  // Closed incidents are read-only (the API enforces this); changes require reopening first.
  const isClosed = incident.status === 'CLOSED'
  const canEditRecord = canEdit && !isClosed
  const canInvestigateRecord = canInvestigate && !isClosed
  const canReviewRecord = canReview && !isClosed
  const canManageActionsRecord = canManageActions && !isClosed

  const hasFinalOutcome = Boolean(incident.outcome?.finalOutcome?.trim())
  const workflow = resolveIncidentDetailWorkflow(incident.status, hasFinalOutcome)
  const stepState = Object.fromEntries(workflow.steps.map((s) => [s.id, s])) as Record<
    (typeof workflow.steps)[number]['id'],
    (typeof workflow.steps)[number]
  >

  const openMandatoryActions = incident.actions.filter(
    (a) => a.isMandatory && a.status !== 'COMPLETED' && a.status !== 'CANCELLED',
  ).length
  // Everyone involved (older incidents only have the primary person).
  const involvedServiceUsers = incident.involvedServiceUsers?.length
    ? incident.involvedServiceUsers
    : incident.primaryServiceUser
      ? [incident.primaryServiceUser]
      : []
  const involvedEmployees = incident.involvedEmployees?.length
    ? incident.involvedEmployees
    : incident.primaryEmployee
      ? [incident.primaryEmployee]
      : []

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
        {(incident.reopenCount ?? 0) > 0 && (
          <Badge variant="warning" title={incident.lastReopenedAt ? `Last reopened ${formatOrganisationDateTime(incident.lastReopenedAt)}` : undefined}>
            Reopened{(incident.reopenCount ?? 0) > 1 ? ` ×${incident.reopenCount}` : ''}
          </Badge>
        )}
      </div>

      <IncidentNextStepBar
        incidentId={incident.id}
        status={incident.status}
        severity={incident.severity}
        hasFinalOutcome={hasFinalOutcome}
        openMandatoryActions={openMandatoryActions}
        canReview={canReview}
        canClose={canClose}
        canReopen={canReopen}
      />

      <Tabs value={tab ?? workflow.currentId} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList variant="underline" className="h-auto min-w-max justify-start">
            {workflow.steps.map((step, index) => (
              <TabsTrigger key={step.id} value={step.id} variant="underline">
                <StepTabLabel n={index + 1} label={step.label.replace(/^\d+\.\s*/, '')} state={step.state} />
              </TabsTrigger>
            ))}
            <TabsTrigger value="records" variant="underline">
              Supporting records
            </TabsTrigger>
            <TabsTrigger value="timeline" variant="underline">
              Timeline
            </TabsTrigger>
            {canReview && (
              <TabsTrigger value="admin" variant="underline">
                Admin controls
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* forceMount keeps unsaved form input when switching tabs (inactive tabs are hidden). */}
        <TabsContent value="raise" forceMount>
        {/* Step 1 — Raise */}
        <IncidentWorkflowStepCard
          stepNumber={1}
          title="Raise"
          hint={stepState.raise.hint}
          state={stepState.raise.state}
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
            <Field
              label="Who was affected"
              value={incident.affectedPersonKinds
                .map((k) => INCIDENT_PERSON_KIND_OPTIONS.find((o) => o.value === k)?.label ?? k)
                .join(', ')}
            />
            {involvedServiceUsers.length > 0 && (
              <Field
                label={involvedServiceUsers.length > 1 ? 'Service users' : 'Service user'}
                value={
                  <span className="flex flex-col gap-0.5">
                    {involvedServiceUsers.map((su) => (
                      <Link
                        key={su.id}
                        to="/service-users/$serviceUserId"
                        params={{ serviceUserId: su.id }}
                        className="text-primary underline underline-offset-2 hover:no-underline"
                      >
                        {su.name ?? 'Service user'}
                        {su.serviceUserNumber ? ` (${su.serviceUserNumber})` : ''}
                      </Link>
                    ))}
                  </span>
                }
              />
            )}
            {involvedEmployees.length > 0 && (
              <Field
                label="Staff involved"
                value={
                  <span className="flex flex-col gap-0.5">
                    {involvedEmployees.map((emp) => (
                      <Link
                        key={emp.id}
                        to="/hr/employees/$employeeId"
                        params={{ employeeId: emp.id }}
                        className="text-primary underline underline-offset-2 hover:no-underline"
                      >
                        {emp.name ?? 'Staff member'}
                      </Link>
                    ))}
                  </span>
                }
              />
            )}
            {incident.primaryPersonName && <Field label="Other person" value={incident.primaryPersonName} />}
            <Field label="Branch" value={incident.location?.name} />
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

          {(incident.injuryOccurred || incident.injuries.length > 0 || canEditRecord) && (
            <SubBlock title="Injuries">
              {incident.injuryDetails && (
                <p className="mb-3 whitespace-pre-wrap text-sm text-foreground">{incident.injuryDetails}</p>
              )}
              <IncidentInjuriesPanel
                incidentId={incident.id}
                injuries={incident.injuries}
                canManage={canEditRecord}
                serviceUserId={incident.primaryServiceUserId}
              />
            </SubBlock>
          )}

          <SubBlock title="Witnesses">
            <IncidentWitnessesPanel
              incidentId={incident.id}
              witnesses={incident.witnesses}
              canManage={canEditRecord}
            />
          </SubBlock>
        </IncidentWorkflowStepCard>
        </TabsContent>

        <TabsContent value="review" forceMount>
        {/* Step 2 — Review */}
        <IncidentWorkflowStepCard
          stepNumber={2}
          title="Review"
          hint={stepState.review.hint}
          state={stepState.review.state}
        >
          {canReviewRecord || incident.review ? (
            <IncidentReviewSection incidentId={incident.id} review={incident.review} canEdit={canReviewRecord} />
          ) : (
            <p className="text-sm text-muted-foreground">No review recorded yet.</p>
          )}
        </IncidentWorkflowStepCard>
        </TabsContent>

        <TabsContent value="investigate" forceMount>
        {/* Step 3 — Investigate */}
        <IncidentWorkflowStepCard
          stepNumber={3}
          title="Investigate"
          hint={stepState.investigate.hint}
          state={stepState.investigate.state}
        >
          {(canInvestigateRecord || incident.investigation) && (
            <IncidentInvestigationSection
              incidentId={incident.id}
              investigation={incident.investigation}
              carerSuspensions={incident.carerSuspensions ?? []}
              courseRecommendations={incident.courseRecommendations ?? []}
              canEdit={canInvestigateRecord}
              primaryEmployeeId={incident.primaryEmployeeId}
              serviceUsers={involvedServiceUsers}
              involvedEmployees={involvedEmployees}
            />
          )}
          {!canInvestigateRecord && !incident.investigation && (
            <p className="text-sm text-muted-foreground">No investigation recorded yet.</p>
          )}
        </IncidentWorkflowStepCard>
        </TabsContent>

        <TabsContent value="actions" forceMount>
        {/* Step 4 — Corrective measures */}
        <IncidentWorkflowStepCard
          stepNumber={4}
          title="Corrective measures"
          hint={stepState.actions.hint}
          state={stepState.actions.state}
        >
          <IncidentActionsSection
            incidentId={incident.id}
            actions={incident.actions}
            canManage={canManageActionsRecord}
          />
        </IncidentWorkflowStepCard>
        </TabsContent>

        <TabsContent value="outcome" forceMount>
        {/* Step 5 — Outcome & close */}
        <IncidentWorkflowStepCard
          stepNumber={5}
          title="Outcome & close"
          hint={stepState.outcome.hint}
          state={stepState.outcome.state}
        >
          {/* Closing and reopening happen in the "Next step" bar; this section only records the outcome. */}
          {canReview || incident.outcome || incident.status === 'CLOSED' || incident.status === 'AWAITING_CLOSURE' ? (
            <IncidentOutcomeSection
              incident={incident}
              outcome={incident.outcome}
              canEditOutcome={canReviewRecord}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Move to Ready to close when investigation and corrective measures are finished.
            </p>
          )}
        </IncidentWorkflowStepCard>
        </TabsContent>

        <TabsContent value="records" forceMount>
        <Section title="Supporting records">
          <div className="space-y-4">
            <SubBlock title="Documents & attachments">
              <IncidentAttachmentsPanel incidentId={incident.id} canManage={canEditRecord} />
            </SubBlock>
            <SubBlock title="Related care records">
              <IncidentCareRecordsPanel
                incidentId={incident.id}
                records={incident.relatedCareRecords ?? []}
                canManage={canEditRecord}
                serviceUserId={incident.primaryServiceUserId}
              />
            </SubBlock>
            <SubBlock title="Related incidents">
              <IncidentRelatedPanel incidentId={incident.id} canManage={canEditRecord} />
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
        </TabsContent>

        <TabsContent value="timeline" forceMount>
        <Section title="Timeline">
          <IncidentTimeline events={incident.history ?? []} />
        </Section>
        </TabsContent>

        {canReview && (
          <TabsContent value="admin" forceMount>
          <Section title="Admin controls">
            <div className="space-y-4">
              {!isClosed && (
              <div>
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
              )}
            </div>
          </Section>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
