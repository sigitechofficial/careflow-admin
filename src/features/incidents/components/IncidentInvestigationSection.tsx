import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { useContributingFactorOptions } from '@/features/incidents/hooks/useContributingFactorOptions'
import {
  ContributingFactorDetailEditor,
  ContributingFactorsReadView,
} from '@/features/incidents/components/ContributingFactorDetail'
import {
  useIncidentInvestigators,
  usePauseIncidentInvestigation,
  useResumeIncidentInvestigation,
  useSuspendIncidentCarer,
  useUpsertIncidentInvestigation,
} from '@/features/incidents/hooks/useIncidents'
import {
  InvestigationEvidenceForm,
  InvestigationEvidenceReadView,
  initialEvidenceValues,
  type InvestigationEvidenceValues,
} from '@/features/incidents/components/IncidentInvestigationEvidence'
import { IncidentExternalBodiesCard } from '@/features/incidents/components/IncidentExternalBodiesCard'
import {
  IncidentSuspensionCard,
  type NewSuspensionHandle,
} from '@/features/incidents/components/IncidentSuspensionCard'
import {
  InvestigationSetupForm,
  InvestigationSetupReadView,
  InvestigationSummaryLine,
  initialSetupValues,
  setupCompletionErrors,
  type InvestigationPauseControls,
  type InvestigationSetupValues,
  type InvestigationSubject,
} from '@/features/incidents/components/IncidentInvestigationSetup'
import {
  INCIDENT_CONTRIBUTING_FACTOR_DETAIL,
  INCIDENT_CONTRIBUTING_FACTOR_OPTIONS,
  INCIDENT_EXTERNAL_INVESTIGATION_TYPE_OPTIONS,
  INCIDENT_INVESTIGATION_SCOPE_OPTIONS,
  INCIDENT_PREVENTABILITY_OPTIONS,
  type ContributingFactorDetail,
  type ContributingFactorDetails,
  type IncidentCarerSuspension,
  type IncidentExternalBody,
  type IncidentExternalInvestigationType,
  type IncidentInvestigation,
  type IncidentInvestigationScope,
  type IncidentInvestigatorOption,
  type IncidentPreventability,
  type InvestigationRecord,
  type UpsertIncidentInvestigationInput,
} from '@/features/incidents/types'

const selectClass =
  'mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const scopeLabel = (v: string) =>
  INCIDENT_INVESTIGATION_SCOPE_OPTIONS.find((o) => o.value === v)?.label ?? v

const externalTypeLabel = (v: string) =>
  INCIDENT_EXTERNAL_INVESTIGATION_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v

export const preventableLabel = (v: string) =>
  INCIDENT_PREVENTABILITY_OPTIONS.find((o) => o.value === v)?.label ?? v

/** Saving, lead investigator options and pause / resume for the record being investigated. */
export type InvestigationApi = {
  save: { mutateAsync: (input: UpsertIncidentInvestigationInput) => Promise<unknown>; isPending: boolean }
  investigators: { data?: IncidentInvestigatorOption[]; isLoading: boolean }
  pauseControls: InvestigationPauseControls
}

/** Incident-only parts: external bodies and interim carer suspension. */
type IncidentInvestigationExtras = {
  incidentId: string
  carerSuspensions: IncidentCarerSuspension[]
  externalBodies: IncidentExternalBody[]
  primaryEmployeeId?: string | null
  suspend: ReturnType<typeof useSuspendIncidentCarer>
}

type SharedInvestigationProps = {
  canEdit: boolean
  /** People involved — contributing factors and evidence can point at their records. */
  serviceUsers?: { id: string; name: string | null }[]
  involvedEmployees?: { id: string; name: string | null }[]
  /** Higher severity (or a death): suggest a deeper investigation level. */
  suggestHigherLevel?: boolean
  /** Filled with "complete the investigation" so the Next step bar can trigger it. */
  completeRef?: React.Ref<() => void>
}

export function IncidentInvestigationSection({
  incidentId,
  investigation,
  carerSuspensions,
  externalBodies = [],
  canEdit,
  primaryEmployeeId,
  ...shared
}: SharedInvestigationProps & {
  incidentId: string
  investigation: IncidentInvestigation | null
  carerSuspensions: IncidentCarerSuspension[]
  externalBodies?: IncidentExternalBody[]
  primaryEmployeeId?: string | null
}) {
  const save = useUpsertIncidentInvestigation(incidentId)
  const investigators = useIncidentInvestigators(incidentId, canEdit)
  const pause = usePauseIncidentInvestigation(incidentId)
  const resume = useResumeIncidentInvestigation(incidentId)
  const suspend = useSuspendIncidentCarer(incidentId)
  return (
    <InvestigationSection
      {...shared}
      investigation={investigation}
      canEdit={canEdit}
      api={{ save, investigators, pauseControls: { pause, resume } }}
      incident={{ incidentId, carerSuspensions, externalBodies, primaryEmployeeId, suspend }}
    />
  )
}

/**
 * The investigation form shared by incidents and complaints: set-up, findings, contributing
 * factors, evidence, preventability and conclusion (plus the incident-only cards when given).
 */
export function InvestigationSection({
  investigation,
  api,
  incident,
  subject = 'incident',
  canEdit,
  serviceUsers = [],
  involvedEmployees = [],
  suggestHigherLevel = false,
  completeRef,
}: SharedInvestigationProps & {
  investigation: InvestigationRecord | null
  api: InvestigationApi
  incident?: IncidentInvestigationExtras
  subject?: InvestigationSubject
}) {
  const mutation = api.save
  const suspend = incident?.suspend
  const carerSuspensions = incident?.carerSuspensions ?? []
  const externalBodies = incident?.externalBodies ?? []
  const suspensionFormRef = React.useRef<NewSuspensionHandle>(null)
  // "Investigation type" (internal / external) is replaced by "External bodies involved"; values
  // already saved on older investigations are sent back unchanged.
  const scope = investigation?.investigationScope ?? ''
  const externalType = investigation?.externalType ?? ''
  const [whatHappened, setWhatHappened] = React.useState(investigation?.whatHappened ?? '')
  const [whyHappened, setWhyHappened] = React.useState(investigation?.whyHappened ?? '')
  const [rootCause, setRootCause] = React.useState(investigation?.rootCause ?? '')
  const [conclusion, setConclusion] = React.useState(investigation?.conclusion ?? '')
  const [preventable, setPreventable] = React.useState<string>(investigation?.preventable ?? '')
  const [completeErrors, setCompleteErrors] = React.useState<Record<string, string>>({})
  const formRef = React.useRef<HTMLDivElement>(null)
  // Ticked = a new interim suspension is being added; it is saved (and validated) with the investigation.
  const [addSuspension, setAddSuspension] = React.useState(false)
  const [setup, setSetup] = React.useState<InvestigationSetupValues>(() =>
    initialSetupValues(investigation),
  )
  const patchSetup = (patch: Partial<InvestigationSetupValues>) =>
    setSetup((prev) => ({ ...prev, ...patch }))
  const investigatorsQuery = api.investigators
  const [factors, setFactors] = React.useState<string[]>(investigation?.contributingFactors ?? [])
  const [factorDetails, setFactorDetails] = React.useState<ContributingFactorDetails>(
    investigation?.contributingFactorDetails ?? {},
  )
  const [evidence, setEvidence] = React.useState<InvestigationEvidenceValues>(() =>
    initialEvidenceValues(investigation),
  )
  const patchEvidence = (patch: Partial<InvestigationEvidenceValues>) =>
    setEvidence((prev) => ({ ...prev, ...patch }))
  const factorOptions = useContributingFactorOptions(serviceUsers, {
    carePlans:
      canEdit && (factors.includes('CARE_PLAN') || evidence.recordsReviewed.includes('CARE_PLAN')),
    assessments:
      canEdit &&
      (factors.includes('RISK_ASSESSMENT') || evidence.recordsReviewed.includes('RISK_ASSESSMENT')),
    medications:
      canEdit && (factors.includes('MEDICATION') || evidence.recordsReviewed.includes('MAR')),
  })
  const recordOptions = {
    carePlan: { options: factorOptions.carePlanOptions, loading: factorOptions.loading.carePlans },
    riskAssessment: {
      options: factorOptions.assessmentOptions,
      loading: factorOptions.loading.assessments,
    },
    medication: {
      options: factorOptions.medicationOptions,
      loading: factorOptions.loading.medications,
    },
  }
  const setFactorDetail = (code: string, detail: ContributingFactorDetail) =>
    setFactorDetails((prev) => ({ ...prev, [code]: detail }))


  function toggleFactor(code: string) {
    setFactors((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  async function save(markComplete: boolean) {
    // Completing needs the core findings; a draft can be saved with anything missing.
    const missing: Record<string, string> = {}
    if (markComplete) {
      Object.assign(missing, setupCompletionErrors(setup))
      if (!whatHappened.trim()) missing.whatHappened = 'Needed to complete'
      if (!whyHappened.trim()) missing.whyHappened = 'Needed to complete'
      if (!rootCause.trim()) missing.rootCause = 'Needed to complete'
      if (!preventable) missing.preventable = 'Needed to complete'
      if (!conclusion.trim()) missing.conclusion = 'Needed to complete'
    }
    // A ticked suspension must be filled in before anything is saved.
    const newSuspension = addSuspension ? suspensionFormRef.current?.validate() : undefined
    if (addSuspension && !newSuspension) missing.suspension = 'Fill in the suspension'
    setCompleteErrors(missing)
    if (Object.keys(missing).length) {
      // Saving can start from the Next step bar at the top, so bring the first gap into view.
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector('[data-field-error]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )
      return
    }
    if (newSuspension && !window.confirm(newSuspension.confirmText)) return
    const input: UpsertIncidentInvestigationInput = {
      investigationScope: (scope || undefined) as IncidentInvestigationScope | undefined,
      externalType:
        scope === 'EXTERNAL'
          ? (externalType as IncidentExternalInvestigationType)
          : scope === 'INTERNAL'
            ? null
            : undefined,
      whatHappened: whatHappened.trim() || undefined,
      whyHappened: whyHappened.trim() || undefined,
      rootCause: rootCause.trim() || undefined,
      conclusion: conclusion.trim() || undefined,
      preventable: (preventable || undefined) as IncidentPreventability | undefined,
      contributingFactors: factors,
      // Only ticked factors are kept (the server drops the rest).
      contributingFactorDetails: factors.reduce<ContributingFactorDetails>((acc, f) => {
        const detail = factorDetails[f]
        if (detail) acc[f] = detail
        return acc
      }, {}),
      investigationLevel: setup.investigationLevel || null,
      leadInvestigatorEmployeeId: setup.leadInvestigatorEmployeeId || null,
      investigatorInvolved: setup.investigatorInvolved || null,
      investigatorInvolvedReason:
        setup.investigatorInvolved === 'YES' ? setup.investigatorInvolvedReason.trim() || null : null,
      targetDate: setup.targetDate || null,
      termsOfReference: setup.termsOfReference.trim() || null,
      recordsReviewed: evidence.recordsReviewed,
      // Only ticked kinds are kept (the server drops the rest).
      recordsReviewedDetails: evidence.recordsReviewed.reduce<ContributingFactorDetails>((acc, k) => {
        const detail = evidence.recordsReviewedDetails[k]
        if (detail) acc[k] = detail
        return acc
      }, {}),
      evidenceNotes: evidence.evidenceNotes.trim() || null,
      outstandingEvidence: evidence.outstandingEvidence.trim() || null,
      markComplete,
    }
    try {
      if (newSuspension && suspend) {
        // The API only suspends while an open investigation exists, so save a draft first if
        // there is none, and suspend before the investigation is marked complete.
        if (!investigation) await mutation.mutateAsync({ ...input, markComplete: false })
        await suspend.mutateAsync(newSuspension.input)
        suspensionFormRef.current?.reset()
        setAddSuspension(false)
        if (!investigation && !markComplete) return
      }
      await mutation.mutateAsync(input)
    } catch {
      // The hooks already show the error.
    }
  }

  React.useImperativeHandle(completeRef, () => () => void save(true))

  if (!canEdit) {
    if (!investigation && carerSuspensions.length === 0 && externalBodies.length === 0) {
      return <p className="text-sm text-muted-foreground">No investigation recorded yet.</p>
    }
    return (
      <div className="space-y-3 text-sm">
        {investigation && <InvestigationSummaryLine investigation={investigation} />}
        {investigation && (
          <InvestigationSetupReadView investigation={investigation} />
        )}
        {investigation?.investigationScope && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="info" size="sm">{scopeLabel(investigation.investigationScope)}</Badge>
            {investigation.investigationScope === 'EXTERNAL' && investigation.externalType && (
              <Badge variant="muted" size="sm">{externalTypeLabel(investigation.externalType)}</Badge>
            )}
          </div>
        )}
        {investigation?.whatHappened && <ReadField label="What happened" value={investigation.whatHappened} />}
        {investigation?.whyHappened && <ReadField label="Why it happened" value={investigation.whyHappened} />}
        {investigation?.rootCause && <ReadField label="Root cause" value={investigation.rootCause} />}
        {investigation && investigation.contributingFactors.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Contributing factors</p>
            <ContributingFactorsReadView
              factors={investigation.contributingFactors}
              details={investigation.contributingFactorDetails}
              labelFor={(code) =>
                INCIDENT_CONTRIBUTING_FACTOR_OPTIONS.find((f) => f.value === code)?.label ?? code
              }
            />
          </div>
        )}
        {investigation && <InvestigationEvidenceReadView investigation={investigation} />}
        {investigation?.preventable && (
          <ReadField label="Preventable" value={preventableLabel(investigation.preventable)} />
        )}
        {investigation?.conclusion && <ReadField label="Conclusion" value={investigation.conclusion} />}
        {incident && (
          <>
            <IncidentExternalBodiesCard incidentId={incident.incidentId} bodies={externalBodies} canEdit={false} />
            <IncidentSuspensionCard
              incidentId={incident.incidentId}
              suspensions={carerSuspensions}
              canEdit={false}
            />
          </>
        )}
        {investigation?.completedAt && <Badge variant="success" size="sm">Investigation complete</Badge>}
      </div>
    )
  }

  const paused = investigation?.investigationStatus === 'PAUSED'
  const canAddSuspension = !!incident && investigation?.investigationStatus !== 'COMPLETED'
  const investigationErrorCount = Object.keys(completeErrors).filter((k) => k !== 'suspension').length

  return (
    <div ref={formRef} className="space-y-3">
      {investigation && <InvestigationSummaryLine investigation={investigation} />}
      <InvestigationSetupForm
        pauseControls={api.pauseControls}
        subject={subject}
        investigation={investigation}
        values={setup}
        onChange={patchSetup}
        errors={completeErrors}
        investigators={investigatorsQuery.data ?? []}
        investigatorsLoading={investigatorsQuery.isLoading}
        suggestHigherLevel={suggestHigherLevel}
      />
      <TextField
        label="What happened?"
        value={whatHappened}
        onChange={setWhatHappened}
        required
        error={completeErrors.whatHappened}
      />
      <TextField
        label="Why did it happen?"
        value={whyHappened}
        onChange={setWhyHappened}
        required
        error={completeErrors.whyHappened}
      />
      <TextField label="Root cause" value={rootCause} onChange={setRootCause} required error={completeErrors.rootCause} />
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Contributing factors</p>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {INCIDENT_CONTRIBUTING_FACTOR_OPTIONS.map((f) => (
            <label key={f.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted/40">
              <input type="checkbox" checked={factors.includes(f.value)} onChange={() => toggleFactor(f.value)} className="h-3.5 w-3.5 rounded border-border" />
              {f.label}
            </label>
          ))}
        </div>
        {factors.length > 0 && (
          <div className="mt-2 space-y-2">
            {INCIDENT_CONTRIBUTING_FACTOR_OPTIONS.filter((f) => factors.includes(f.value)).map((f) => (
              <ContributingFactorDetailEditor
                key={f.value}
                label={f.label}
                config={INCIDENT_CONTRIBUTING_FACTOR_DETAIL[f.value] ?? { pick: 'note', question: '' }}
                detail={factorDetails[f.value] ?? {}}
                onChange={(d) => setFactorDetail(f.value, d)}
                recordOptions={recordOptions}
                involvedEmployees={involvedEmployees}
                hasServiceUser={serviceUsers.length > 0}
              />
            ))}
          </div>
        )}
      </div>
      <InvestigationEvidenceForm
        values={evidence}
        onChange={patchEvidence}
        recordOptions={recordOptions}
        involvedEmployees={involvedEmployees}
        hasServiceUser={serviceUsers.length > 0}
      />
      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Could this have been prevented?
          <Req />
        </label>
        <select
          className={selectClass}
          value={preventable}
          onChange={(e) => setPreventable(e.target.value)}
        >
          <option value="">Not set</option>
          {INCIDENT_PREVENTABILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {completeErrors.preventable && (
          <p data-field-error className="mt-1 text-xs text-destructive dark:text-red-400">{completeErrors.preventable}</p>
        )}
      </div>
      <TextField label="Conclusion" value={conclusion} onChange={setConclusion} required error={completeErrors.conclusion} />
      <p className="text-xs text-muted-foreground">
        <span className="text-destructive dark:text-red-400">*</span> Needed for “Complete investigation”
        {completeRef ? ' (Next step, at the top)' : ''}. “Save draft” keeps your progress without them.
      </p>
      {paused && (
        <p className="text-xs text-muted-foreground">
          The investigation is paused — resume it before completing.
        </p>
      )}

      {incident && (
        <IncidentExternalBodiesCard incidentId={incident.incidentId} bodies={externalBodies} canEdit={canEdit} />
      )}

      {canAddSuspension && (
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40">
          <input
            type="checkbox"
            checked={addSuspension}
            onChange={(e) => setAddSuspension(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          {carerSuspensions.length > 0
            ? 'Suspend another carer during the investigation'
            : 'Suspend a carer during the investigation'}
        </label>
      )}
      {incident && (
        <IncidentSuspensionCard
          incidentId={incident.incidentId}
          suspensions={carerSuspensions}
          canEdit={canEdit}
          showAddForm={canAddSuspension && addSuspension}
          primaryEmployeeId={incident.primaryEmployeeId}
          formRef={suspensionFormRef}
        />
      )}

      {Object.keys(completeErrors).length > 0 && (
        <div role="alert" className="space-y-0.5 text-sm text-destructive dark:text-red-400">
          {investigationErrorCount > 0 && (
            <p>
              Fill the {investigationErrorCount} marked investigation field
              {investigationErrorCount === 1 ? '' : 's'} to complete the investigation.
            </p>
          )}
          {completeErrors.suspension && (
            <p>Fill in the suspension (carer, dates and reason), or untick “Suspend a carer”.</p>
          )}
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <Button
          size="sm"
          variant="outline"
          loading={mutation.isPending || suspend?.isPending}
          onClick={() => void save(false)}
        >
          Save draft
        </Button>
        {/* Without a Next step bar (complaints), completing happens here. */}
        {!completeRef && investigation?.investigationStatus !== 'COMPLETED' && (
          <Button size="sm" loading={mutation.isPending} disabled={paused} onClick={() => void save(true)}>
            Complete investigation
          </Button>
        )}
      </div>
    </div>
  )
}

/** Red asterisk: needed to complete the investigation (a draft can still be saved without it). */
function Req() {
  return <span className="ml-0.5 text-destructive dark:text-red-400" aria-hidden>*</span>
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  error?: string
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <Req />}
      </label>
      <Textarea
        className="mt-1"
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
      />
      {error && <p data-field-error className="mt-1 text-xs text-destructive dark:text-red-400">{error}</p>}
    </div>
  )
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-foreground">{value}</p>
    </div>
  )
}
