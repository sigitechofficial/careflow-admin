import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Check, Lock, PencilLine, ShieldAlert } from 'lucide-react'
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
} from '@/features/incidents/hooks/useIncidents'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { IncidentReviewSection } from '@/features/incidents/components/IncidentReviewSection'
import {
  IncidentCandourDecisionSection,
  IncidentCandourStepsSection,
  IncidentCandourSummary,
  candourStepsTabVisible,
} from '@/features/incidents/components/IncidentCandourSection'
import { IncidentInvestigationSection } from '@/features/incidents/components/IncidentInvestigationSection'
import { IncidentActionsSection } from '@/features/incidents/components/IncidentActionsSection'
import {
  IncidentAttachmentsPanel,
  IncidentCareRecordsPanel,
  IncidentRelatedPanel,
} from '@/features/incidents/components/IncidentCarePanels'
import { ServiceUserIncidentHistoryPanel } from '@/features/incidents/components/ServiceUserIncidentHistoryPanel'
import { IncidentCategoryDetailsView } from '@/features/incidents/components/IncidentCategoryDetailsView'
import { IncidentNextStepBar } from '@/features/incidents/components/IncidentNextStepBar'
import { externalBodyDisplayName } from '@/features/incidents/components/IncidentExternalBodiesCard'
import { IncidentCorrectionDialog } from '@/features/incidents/components/IncidentCorrectionDialog'
import {
  IncidentInjuriesSection,
  IncidentWitnessesSection,
} from '@/features/incidents/components/IncidentPeopleRecords'
import {
  ClarificationNotes,
  CorrectedBadge,
  CorrectionMarksProvider,
  LockedMark,
  REPORTER_ACCOUNT_LOCK,
  SYSTEM_FIELD_LOCK,
} from '@/features/incidents/components/IncidentCorrectionMarks'
import { CATEGORY_DETAILS_TITLE, NO_HOSPITAL_OUTCOME_CATEGORIES } from '@/features/incidents/category-details'
import { useEmployee } from '@/features/employees/hooks/useEmployees'
import { useVisitVoiceNotes } from '@/features/scheduling/hooks/useVisitVoiceNotes'
import { VoiceNoteList } from '@/features/scheduling/components/VoiceNoteList'
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
  incidentLocationLabel,
  isExternalBodyOpen,
} from '@/features/incidents/types'

const actionLabel = (code: string) =>
  IMMEDIATE_ACTION_OPTIONS.find((o) => o.value === code)?.label ?? code

/** Carer voice notes recorded with this incident in the carer app (visit-linked incidents). */
function IncidentCarerVoiceNotes({ jobId, incidentId }: { jobId: string; incidentId: string }) {
  const { groups } = useVisitVoiceNotes(jobId)
  const voiceNotes = groups
    .filter((g) => g.entryType === 'incident' && g.registerIncidentId === incidentId)
    .flatMap((g) => g.voiceNotes)
  return <VoiceNoteList voiceNotes={voiceNotes} label="Carer voice notes" className="mt-3" />
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
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
          state === 'complete' && 'border-success bg-success text-success-foreground',
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

function SubBlock({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
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

  const [correctOpen, setCorrectOpen] = React.useState(false)
  // Selected tab; null = follow the current workflow step (and jump there when the step changes).
  const [tab, setTab] = React.useState<string | null>(null)
  const completeInvestigationRef = React.useRef<(() => void) | null>(null)
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
  const canCorrect = can('incidents.correct')

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading incident…</div>
  }
  if (isError || !incident) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
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
  // Duty of Candour steps get their own tab once anyone's answer is Yes / Not known.
  const showCandourTab = candourStepsTabVisible(incident.candour)
  const canEditRecord = canEdit && !isClosed
  const canInvestigateRecord = canInvestigate && !isClosed
  const canReviewRecord = canReview && !isClosed
  const canManageActionsRecord = canManageActions && !isClosed
  const corrections = incident.corrections
  const clarifications = incident.clarifications
  /** Label with the "Corrected" badge for the given incident fields. */
  const corrected = (label: string, ...fieldKeys: string[]) => (
    <>
      {label}
      <CorrectedBadge corrections={corrections} fieldKeys={fieldKeys} />
    </>
  )
  const locked = (label: string, reason: string) => (
    <>
      {label}
      <LockedMark reason={reason} />
    </>
  )

  const hasFinalOutcome = Boolean(incident.outcome?.finalOutcome?.trim())
  const workflow = resolveIncidentDetailWorkflow(incident.status, hasFinalOutcome)
  // The Duty of Candour tab can disappear (decision changed to No); fall back to the current step.
  const activeTab = tab === 'candour' && !showCandourTab ? workflow.currentId : (tab ?? workflow.currentId)
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
    <CorrectionMarksProvider>
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
          <CorrectedBadge corrections={incident.corrections} fieldKeys={['categoryId', 'subtypeId']} />
        </span>
        <Badge variant={INCIDENT_SEVERITY_BADGE[incident.severity]}>{incident.severityLabel}</Badge>
        <CorrectedBadge corrections={incident.corrections} fieldKeys={['severity']} />
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
        investigationStatus={incident.investigation?.investigationStatus ?? null}
        undecidedSuspensions={
          (incident.carerSuspensions ?? []).filter((s) => s.status !== 'LIFTED' && !s.continuedAt)
            .length
        }
        openExternalBodies={(incident.externalBodies ?? [])
          .filter((b) => isExternalBodyOpen(b.status))
          .map(externalBodyDisplayName)}
        openMandatoryActions={openMandatoryActions}
        candourUndecided={(incident.candour?.records ?? [])
          .filter((r) => r.onIncident && (r.status === 'NOT_DECIDED' || r.status === 'NOT_KNOWN'))
          .map((r) => r.serviceUserName)}
        candourIncomplete={(incident.candour?.records ?? [])
          .filter((r) => r.onIncident && r.status === 'IN_PROGRESS')
          .map((r) => r.serviceUserName)}
        outcomeSharingUnanswered={
          (incident.outcome?.outcomeSharing ?? []).filter((r) => !r.shared && !r.notSharedReason).length
        }
        canReview={canReview}
        canClose={canClose}
        canReopen={canReopen}
        onGoToReview={() => setTab('review')}
        onReviewTab={activeTab === 'review'}
        onCompleteInvestigation={
          canInvestigateRecord
            ? () => {
                setTab('investigate')
                completeInvestigationRef.current?.()
              }
            : undefined
        }
      />

      <Tabs value={activeTab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList variant="underline" className="h-auto min-w-max justify-start">
            {workflow.steps.map((step, index) => (
              <TabsTrigger key={step.id} value={step.id} variant="underline">
                <StepTabLabel n={index + 1} label={step.label.replace(/^\d+\.\s*/, '')} state={step.state} />
              </TabsTrigger>
            ))}
            {showCandourTab && (
              <TabsTrigger value="candour" variant="underline">
                Duty of Candour
              </TabsTrigger>
            )}
            <TabsTrigger value="records" variant="underline">
              Supporting records
            </TabsTrigger>
            <TabsTrigger value="timeline" variant="underline">
              Timeline
            </TabsTrigger>
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
          nextAction={
            canCorrect ? (
              <span title={isClosed ? 'Reopen the incident to correct details.' : undefined}>
                <Button size="sm" variant="outline" disabled={isClosed} onClick={() => setCorrectOpen(true)}>
                  <PencilLine className="mr-1 h-4 w-4" /> Correct details
                </Button>
              </span>
            ) : undefined
          }
        >
          <dl className="grid grid-cols-2 gap-4">
            <Field
              label={corrected('Reported time (when it happened)', 'occurredAt')}
              value={formatOrganisationDateTime(incident.occurredAt)}
            />
            <Field
              label={locked('Recorded time', SYSTEM_FIELD_LOCK)}
              value={formatOrganisationDateTime(incident.createdAt ?? incident.reportedAt)}
            />
            <Field label={locked('Reported by', SYSTEM_FIELD_LOCK)} value={incident.reportedBy?.name} />
            <Field
              label={locked('Recorded by', SYSTEM_FIELD_LOCK)}
              value={
                incident.reportedBy?.source === 'CARER_APP'
                  ? 'Carer app (self-reported)'
                  : incident.reportedBy?.recordedByName
              }
            />
            <Field
              label={corrected('Who was affected', 'affectedPersonKinds')}
              value={incident.affectedPersonKinds
                .map((k) => INCIDENT_PERSON_KIND_OPTIONS.find((o) => o.value === k)?.label ?? k)
                .join(', ')}
            />
            {involvedServiceUsers.length > 0 && (
              <Field
                label={corrected(
                  involvedServiceUsers.length > 1 ? 'Service users' : 'Service user',
                  'primaryServiceUserId',
                  'involvedServiceUserIds',
                )}
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
                label={corrected('Staff involved', 'primaryEmployeeId', 'involvedEmployeeIds')}
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
            {incident.primaryPersonName && (
              <Field label={corrected('Other person', 'primaryPersonName')} value={incident.primaryPersonName} />
            )}
            <Field label={corrected('Branch', 'locationId')} value={incident.location?.name} />
            <Field
              label={corrected('Where it happened', 'locationKey', 'locationDetail')}
              value={incidentLocationLabel(incident.locationKey, incident.locationDetail)}
            />
            {incident.specificArea && (
              <Field label={locked('Specific area', REPORTER_ACCOUNT_LOCK)} value={incident.specificArea} />
            )}
            <Field label="Injury" value={incident.injuryOccurred ? 'Yes' : 'No'} />
            <Field
              label={corrected('Visit', 'scheduledJobId')}
              value={
                incident.scheduledJobId ? (
                  <Link
                    to="/scheduling/visits/$jobId"
                    params={{ jobId: incident.scheduledJobId }}
                    className="text-primary underline underline-offset-2 hover:no-underline"
                  >
                    {incident.visitRef ?? 'Open visit'}
                  </Link>
                ) : (
                  'Not during a visit'
                )
              }
            />
          </dl>
          <div className="mt-4 space-y-3">
            {(
              [
                ['DESCRIPTION', 'What happened', incident.description],
                ['CONTEXT_BEFORE', 'Immediately before', incident.contextBefore],
                ['CONTEXT_AFTER', 'Afterwards', incident.contextAfter],
                ['PEOPLE_INVOLVED', 'People involved', incident.peopleInvolved],
              ] as const
            )
              .filter(
                ([field, , text]) =>
                  field === 'DESCRIPTION' || text || clarifications?.some((n) => n.field === field),
              )
              .map(([field, label, text]) => (
                <div key={field}>
                  <Field
                    label={locked(label, REPORTER_ACCOUNT_LOCK)}
                    value={<p className="whitespace-pre-wrap">{text}</p>}
                  />
                  <ClarificationNotes
                    incidentId={incident.id}
                    field={field}
                    notes={clarifications}
                    canAdd={canCorrect}
                  />
                </div>
              ))}
          </div>

          {!NO_HOSPITAL_OUTCOME_CATEGORIES.has(incident.category.key) &&
            (incident.affectedPersonKinds.length > 0 ||
            incident.ambulanceAttended != null ||
            incident.takenToAe != null ||
            incident.admittedToHospital != null) && (
            <SubBlock title="Hospital outcome">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field
                  label={corrected('Ambulance attended', 'ambulanceAttended')}
                  value={yesNoUnknown(incident.ambulanceAttended)}
                />
                <Field label={corrected('Taken to A&E', 'takenToAe')} value={yesNoUnknown(incident.takenToAe)} />
                <Field
                  label={corrected('Admitted to hospital', 'admittedToHospital')}
                  value={yesNoUnknown(incident.admittedToHospital)}
                />
              </dl>
            </SubBlock>
          )}

          {incident.categoryDetails && Object.keys(incident.categoryDetails).length > 0 && (
            <SubBlock
              title={corrected(CATEGORY_DETAILS_TITLE[incident.category.key] ?? 'Category details', 'categoryDetails')}
            >
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
                      {corrected('What was done', 'immediateActionCodes')}
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
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {locked('Actions described by the reporter', REPORTER_ACCOUNT_LOCK)}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{incident.immediateActions}</p>
                    <ClarificationNotes
                      incidentId={incident.id}
                      field="IMMEDIATE_ACTIONS"
                      notes={clarifications}
                      canAdd={canCorrect}
                    />
                  </div>
                )}
                {incident.whoInformedKeys.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {corrected('Who was informed', 'whoInformedKeys')}
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
                      {locked('Emergency services', REPORTER_ACCOUNT_LOCK)}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {incident.emergencyServicesDetails}
                    </p>
                    <ClarificationNotes
                      incidentId={incident.id}
                      field="EMERGENCY_SERVICES"
                      notes={clarifications}
                      canAdd={canCorrect}
                    />
                  </div>
                )}
              </>
            )}
          </SubBlock>

          <SubBlock title="Injuries">
            {incident.injuryDetails && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {locked('Injury details from the reporter', REPORTER_ACCOUNT_LOCK)}
                </p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{incident.injuryDetails}</p>
              </div>
            )}
            <IncidentInjuriesSection incident={incident} canManage={canEditRecord} />
          </SubBlock>

          <SubBlock title="Witnesses">
            {incident.witnessDetails && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {locked('Witness details from the reporter', REPORTER_ACCOUNT_LOCK)}
                </p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{incident.witnessDetails}</p>
                <ClarificationNotes
                  incidentId={incident.id}
                  field="WITNESS_DETAILS"
                  notes={clarifications}
                  canAdd={canCorrect}
                />
              </div>
            )}
            <IncidentWitnessesSection incident={incident} canManage={canEditRecord} />
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
          {canReviewRecord || incident.review || (incident.reviewCycles?.length ?? 0) > 0 ? (
            <IncidentReviewSection
              // A new review cycle (after a reopen) starts from a fresh form.
              key={incident.review?.id ?? `new-review-${incident.reviewCycles?.length ?? 0}`}
              incidentId={incident.id}
              review={incident.review}
              canEdit={canReviewRecord}
              currentSeverity={incident.severity}
              reportedByName={incident.reportedBy?.name}
              corrections={incident.corrections}
              status={incident.status}
              severityDecision={incident.reviewSeverity}
              severityChanges={incident.severityChanges}
              reviewCycles={incident.reviewCycles}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No review recorded yet.</p>
          )}
          <div className="mt-4">
            <IncidentCandourDecisionSection
              incidentId={incident.id}
              panel={incident.candour}
              isClosed={isClosed}
              onOpenSteps={() => setTab('candour')}
            />
          </div>
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
              externalBodies={incident.externalBodies ?? []}
              canEdit={canInvestigateRecord}
              completeRef={completeInvestigationRef}
              primaryEmployeeId={incident.primaryEmployeeId}
              serviceUsers={involvedServiceUsers}
              involvedEmployees={involvedEmployees}
              suggestHigherLevel={
                incident.severity === 'HIGH' ||
                incident.severity === 'CRITICAL' ||
                incident.category.key === 'DEATH'
              }
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
            incidentReference={incident.referenceNumber}
            actions={incident.actions}
            canManage={canManageActionsRecord}
            findings={
              incident.investigation
                ? {
                    rootCause: incident.investigation.rootCause,
                    contributingFactors: incident.investigation.contributingFactors,
                  }
                : null
            }
            serviceUsers={involvedServiceUsers}
            involvedEmployees={involvedEmployees}
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
          <div className="mb-4">
            <IncidentCandourSummary
              panel={incident.candour}
              onOpen={() => setTab(showCandourTab ? 'candour' : 'review')}
            />
          </div>
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

        {showCandourTab && (
          <TabsContent value="candour" forceMount>
            <IncidentCandourStepsSection
              incidentId={incident.id}
              panel={incident.candour}
              isClosed={isClosed}
              onOpenReview={() => setTab('review')}
            />
          </TabsContent>
        )}

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
              {incident.scheduledJobId ? (
                <IncidentCarerVoiceNotes jobId={incident.scheduledJobId} incidentId={incident.id} />
              ) : null}
            </SubBlock>
          </div>
        </Section>
        </TabsContent>

        <TabsContent value="timeline" forceMount>
        <Section title="Timeline">
          <IncidentTimeline events={incident.history ?? []} />
        </Section>
        </TabsContent>

      </Tabs>
      <IncidentCorrectionDialog incident={incident} open={correctOpen} onOpenChange={setCorrectOpen} />
    </div>
    </CorrectionMarksProvider>
  )
}
