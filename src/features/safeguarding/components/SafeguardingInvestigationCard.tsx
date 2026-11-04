import * as React from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { useAuthStore } from '@/features/auth/store'
import { useContributingFactorOptions } from '@/features/incidents/hooks/useContributingFactorOptions'
import {
  ContributingFactorDetailEditor,
  ContributingFactorsReadView,
} from '@/features/incidents/components/ContributingFactorDetail'
import {
  InvestigationEvidenceForm,
  InvestigationEvidenceReadView,
  type InvestigationEvidenceValues,
} from '@/features/incidents/components/IncidentInvestigationEvidence'
import {
  INCIDENT_CONTRIBUTING_FACTOR_DETAIL,
  INCIDENT_CONTRIBUTING_FACTOR_OPTIONS,
  INCIDENT_PREVENTABILITY_OPTIONS,
  type ContributingFactorDetail,
  type ContributingFactorDetails,
  type IncidentInvestigation,
  type IncidentPreventability,
} from '@/features/incidents/types'
import {
  useSafeguardingInvestigation,
  useSafeguardingInvestigators,
  useUpsertSafeguardingInvestigation,
} from '@/features/safeguarding/hooks/useSafeguarding'
import {
  InvestigationSetupForm,
  InvestigationSetupReadView,
  InvestigationSummaryLine,
  initialSetupValues,
  setupCompletionErrors,
  type InvestigationSetupValues,
} from '@/features/safeguarding/components/SafeguardingInvestigationSetup'
import { SectionCard } from '@/features/safeguarding/components/SafeguardingSections'
import type {
  SafeguardingCase,
  SafeguardingInvestigation,
  UpsertSafeguardingInvestigationInput,
} from '@/features/safeguarding/types/safeguarding.types'

const selectClass =
  'mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const factorLabel = (code: string) =>
  INCIDENT_CONTRIBUTING_FACTOR_OPTIONS.find((f) => f.value === code)?.label ?? code

const preventableLabel = (v: string) => INCIDENT_PREVENTABILITY_OPTIONS.find((o) => o.value === v)?.label ?? v

/** The shared evidence read view is typed for incidents; it only reads the evidence fields. */
function asIncidentShape(inv: SafeguardingInvestigation): IncidentInvestigation {
  return { ...inv, incidentId: inv.caseId, investigationScope: null, externalType: null }
}

/**
 * Investigation of a safeguarding case — the same set-up, findings, contributing factors, evidence and
 * completion rules as the incident investigation. Shown once the case is being investigated.
 */
export function SafeguardingInvestigationCard({ caseData }: { caseData: SafeguardingCase }) {
  const query = useSafeguardingInvestigation(caseData.id)
  const canManage = useAuthStore((s) => s.can)('safeguarding.manage')
  const investigation = query.data ?? null
  const started = ['INVESTIGATING', 'REFERRED', 'CLOSED'].includes(caseData.status)

  if (query.isLoading) return null
  if (!investigation && !started) return null

  const canEdit = canManage && caseData.status !== 'CLOSED'

  return (
    <SectionCard
      title="Investigation"
      icon={Search}
      tone="violet"
      section="investigation"
      action={
        investigation?.completedAt ? (
          <Badge variant="success" size="sm">
            Investigation complete
          </Badge>
        ) : null
      }
    >
      <div className="text-sm">
        {canEdit ? (
          <InvestigationForm
            key={investigation?.id ?? 'new'}
            caseData={caseData}
            investigation={investigation}
          />
        ) : (
          <InvestigationReadView caseId={caseData.id} investigation={investigation} />
        )}
      </div>
    </SectionCard>
  )
}

function InvestigationReadView({
  caseId,
  investigation,
}: {
  caseId: string
  investigation: SafeguardingInvestigation | null
}) {
  if (!investigation) return <p className="text-muted-foreground">No investigation recorded yet.</p>
  return (
    <div className="space-y-3">
      <InvestigationSummaryLine investigation={investigation} />
      <InvestigationSetupReadView caseId={caseId} investigation={investigation} />
      {investigation.whatHappened && <ReadField label="What happened" value={investigation.whatHappened} />}
      {investigation.whyHappened && <ReadField label="Why it happened" value={investigation.whyHappened} />}
      {investigation.rootCause && <ReadField label="Root cause" value={investigation.rootCause} />}
      {investigation.contributingFactors.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Contributing factors</p>
          <ContributingFactorsReadView
            factors={investigation.contributingFactors}
            details={investigation.contributingFactorDetails}
            labelFor={factorLabel}
          />
        </div>
      )}
      <InvestigationEvidenceReadView investigation={asIncidentShape(investigation)} />
      {investigation.preventable && (
        <ReadField label="Preventable" value={preventableLabel(investigation.preventable)} />
      )}
      {investigation.conclusion && <ReadField label="Conclusion" value={investigation.conclusion} />}
    </div>
  )
}

function InvestigationForm({
  caseData,
  investigation,
}: {
  caseData: SafeguardingCase
  investigation: SafeguardingInvestigation | null
}) {
  const mutation = useUpsertSafeguardingInvestigation(caseData.id)
  const investigatorsQuery = useSafeguardingInvestigators(true)
  const [whatHappened, setWhatHappened] = React.useState(investigation?.whatHappened ?? '')
  const [whyHappened, setWhyHappened] = React.useState(investigation?.whyHappened ?? '')
  const [rootCause, setRootCause] = React.useState(investigation?.rootCause ?? '')
  const [conclusion, setConclusion] = React.useState(investigation?.conclusion ?? '')
  const [preventable, setPreventable] = React.useState<string>(investigation?.preventable ?? '')
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const formRef = React.useRef<HTMLDivElement>(null)
  const [setup, setSetup] = React.useState<InvestigationSetupValues>(() => initialSetupValues(investigation))
  const patchSetup = (patch: Partial<InvestigationSetupValues>) => setSetup((prev) => ({ ...prev, ...patch }))
  const [factors, setFactors] = React.useState<string[]>(investigation?.contributingFactors ?? [])
  const [factorDetails, setFactorDetails] = React.useState<ContributingFactorDetails>(
    investigation?.contributingFactorDetails ?? {},
  )
  const [evidence, setEvidence] = React.useState<InvestigationEvidenceValues>(() => ({
    recordsReviewed: investigation?.recordsReviewed ?? [],
    recordsReviewedDetails: investigation?.recordsReviewedDetails ?? {},
    evidenceNotes: investigation?.evidenceNotes ?? '',
    outstandingEvidence: investigation?.outstandingEvidence ?? '',
  }))
  const patchEvidence = (patch: Partial<InvestigationEvidenceValues>) =>
    setEvidence((prev) => ({ ...prev, ...patch }))

  // Records (care plans, assessments, medications) can be linked for the person the concern is about.
  const serviceUsers = React.useMemo(
    () =>
      caseData.aboutServiceUserId ? [{ id: caseData.aboutServiceUserId, name: caseData.serviceUserName }] : [],
    [caseData.aboutServiceUserId, caseData.serviceUserName],
  )
  const factorOptions = useContributingFactorOptions(serviceUsers, {
    carePlans: factors.includes('CARE_PLAN') || evidence.recordsReviewed.includes('CARE_PLAN'),
    assessments: factors.includes('RISK_ASSESSMENT') || evidence.recordsReviewed.includes('RISK_ASSESSMENT'),
    medications: factors.includes('MEDICATION') || evidence.recordsReviewed.includes('MAR'),
  })
  const recordOptions = {
    carePlan: { options: factorOptions.carePlanOptions, loading: factorOptions.loading.carePlans },
    riskAssessment: { options: factorOptions.assessmentOptions, loading: factorOptions.loading.assessments },
    medication: { options: factorOptions.medicationOptions, loading: factorOptions.loading.medications },
  }
  const setFactorDetail = (code: string, detail: ContributingFactorDetail) =>
    setFactorDetails((prev) => ({ ...prev, [code]: detail }))
  const toggleFactor = (code: string) =>
    setFactors((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))

  const status = investigation?.investigationStatus ?? 'IN_PROGRESS'
  const paused = status === 'PAUSED'
  const completed = status === 'COMPLETED'

  async function save(markComplete: boolean) {
    // Completing needs the set-up and core findings; a draft can be saved with anything missing.
    const missing: Record<string, string> = {}
    if (markComplete) {
      Object.assign(missing, setupCompletionErrors(setup))
      if (!whatHappened.trim()) missing.whatHappened = 'Needed to complete'
      if (!whyHappened.trim()) missing.whyHappened = 'Needed to complete'
      if (!rootCause.trim()) missing.rootCause = 'Needed to complete'
      if (!preventable) missing.preventable = 'Needed to complete'
      if (!conclusion.trim()) missing.conclusion = 'Needed to complete'
    }
    setErrors(missing)
    if (Object.keys(missing).length) {
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector('[data-field-error]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )
      return
    }
    const input: UpsertSafeguardingInvestigationInput = {
      whatHappened: whatHappened.trim() || undefined,
      whyHappened: whyHappened.trim() || undefined,
      rootCause: rootCause.trim() || undefined,
      conclusion: conclusion.trim() || undefined,
      preventable: (preventable || undefined) as IncidentPreventability | undefined,
      contributingFactors: factors,
      // Only ticked factors are kept (the server drops the rest).
      contributingFactorDetails: factors.reduce<ContributingFactorDetails>((acc, f) => {
        if (factorDetails[f]) acc[f] = factorDetails[f]
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
      recordsReviewedDetails: evidence.recordsReviewed.reduce<ContributingFactorDetails>((acc, k) => {
        if (evidence.recordsReviewedDetails[k]) acc[k] = evidence.recordsReviewedDetails[k]
        return acc
      }, {}),
      evidenceNotes: evidence.evidenceNotes.trim() || null,
      outstandingEvidence: evidence.outstandingEvidence.trim() || null,
      markComplete,
    }
    try {
      await mutation.mutateAsync(input)
    } catch {
      // The hook already shows the error.
    }
  }

  const errorCount = Object.keys(errors).length

  return (
    <div ref={formRef} className="space-y-3">
      {investigation && <InvestigationSummaryLine investigation={investigation} />}
      <InvestigationSetupForm
        caseId={caseData.id}
        investigation={investigation}
        values={setup}
        onChange={patchSetup}
        errors={errors}
        investigators={investigatorsQuery.data ?? []}
        investigatorsLoading={investigatorsQuery.isLoading}
        suggestHigherLevel={caseData.riskLevel === 'HIGH'}
      />
      <TextField label="What happened?" value={whatHappened} onChange={setWhatHappened} required error={errors.whatHappened} />
      <TextField label="Why did it happen?" value={whyHappened} onChange={setWhyHappened} required error={errors.whyHappened} />
      <TextField label="Root cause" value={rootCause} onChange={setRootCause} required error={errors.rootCause} />
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Contributing factors</p>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {INCIDENT_CONTRIBUTING_FACTOR_OPTIONS.map((f) => (
            <label
              key={f.value}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted/40"
            >
              <input
                type="checkbox"
                checked={factors.includes(f.value)}
                onChange={() => toggleFactor(f.value)}
                className="h-3.5 w-3.5 rounded border-border"
              />
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
                involvedEmployees={[]}
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
        involvedEmployees={[]}
        hasServiceUser={serviceUsers.length > 0}
      />
      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Could this have been prevented?
          <Req />
        </label>
        <select className={selectClass} value={preventable} onChange={(e) => setPreventable(e.target.value)}>
          <option value="">Not set</option>
          {INCIDENT_PREVENTABILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {errors.preventable && (
          <p data-field-error className="mt-1 text-xs text-destructive dark:text-red-400">
            {errors.preventable}
          </p>
        )}
      </div>
      <TextField label="Conclusion" value={conclusion} onChange={setConclusion} required error={errors.conclusion} />
      <p className="text-xs text-muted-foreground">
        <span className="text-destructive dark:text-red-400">*</span> Needed for “Complete investigation”. “Save
        draft” keeps your progress without them. A started investigation must be completed before the case
        can be closed.
      </p>
      {paused && (
        <p className="text-xs text-muted-foreground">The investigation is paused — resume it before completing.</p>
      )}
      {errorCount > 0 && (
        <p role="alert" className="text-sm text-destructive dark:text-red-400">
          Fill the {errorCount} marked investigation field{errorCount === 1 ? '' : 's'} to complete the
          investigation.
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <Button size="sm" variant="outline" loading={mutation.isPending} onClick={() => void save(false)}>
          Save draft
        </Button>
        {!completed && (
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
