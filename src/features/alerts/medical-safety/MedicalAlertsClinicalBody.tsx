import * as React from 'react'
import { Check, Loader2, Sparkles } from 'lucide-react'
import {
  Accessibility,
  Activity,
  AlertTriangle,
  Bone,
  Brain,
  Footprints,
  HeartPulse,
  MessageSquare,
  Scale,
  Utensils,
  Wind,
} from 'lucide-react'
import type { InitialAssessmentRiskRecord } from '@/features/service-users/initial-assessment/types'
import type { MedicalSafetyItem } from '@/features/alerts/medical-safety/types'
import {
  ClinicalBand,
  YesNoToggle,
} from '@/features/alerts/medical-safety/ClinicalRecordPrimitives'
import {
  allergySuggestionDetail,
  findOpenIaRisks,
  findOpenIaRisksByText,
  hasViewableSuggestion,
  isActiveFlashMessageText,
  joinIaRiskEvidence,
  resolveSuggestion,
  type ClinicalGateSuggestion,
} from '@/features/alerts/medical-safety/medical-alert-suggestions'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import {
  MEDICAL_ALERT_GATE_CONFIG_KEYS,
  MEDICAL_ALERT_GATE_IDS,
  type MedicalAlertGateId,
} from '@/features/alerts/api/medical-clinical.types'
import {
  useMedicalClinicalPermissions,
  useMonitoringConfig,
  useMonitoringConfigMutations,
} from '@/features/alerts/hooks/useMedicalClinical'

export type { ClinicalGateSuggestion }

export type ClinicalGateRow = {
  id: MedicalAlertGateId
  title: string
  question: string
  /** Derived from existing CareFlow SoT — never written back. */
  suggestion: ClinicalGateSuggestion
  suggestionDetail?: string | null
  fields?: Array<{ label: string; value: string }>
  sourceLabel: string
  icon: React.ReactNode
}

type ManualAnswer = 'YES' | 'NO' | 'UNKNOWN'

/**
 * Care-plan-style mint suggestion card for Medical Alerts.
 * Inline evidence + optional Use suggested YES/NO (manual answer only; never writes sources).
 */
function GateSuggestionCard({
  row,
  answer,
  canEdit,
  onApply,
}: {
  row: ClinicalGateRow
  answer: ManualAnswer
  canEdit: boolean
  onApply?: (indication: 'YES' | 'NO') => void
}) {
  if (!hasViewableSuggestion(row)) return null
  if (row.suggestion !== 'YES' && row.suggestion !== 'NO') return null

  const indication = row.suggestion
  const applied = answer === indication

  return (
    <div
      className="mx-2 mb-2 rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 bg-[#f0faf5] dark:bg-emerald-950/30 p-3 shadow-sm"
      data-testid={`clinical-gate-suggestion-card-${row.id}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
        </span>
        <p className="text-xs font-semibold tracking-wide text-emerald-900 dark:text-emerald-200">
          Source suggestion · {indication}
        </p>
      </div>

      {row.suggestionDetail?.trim() ? (
        <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-[#0f2744] dark:text-emerald-100">
          {row.suggestionDetail}
        </p>
      ) : null}

      <div className="mt-2.5 space-y-0.5 border-t border-emerald-200/60 dark:border-emerald-900/40 pt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
        <p className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Source</p>
        <p>{row.sourceLabel}</p>
      </div>

      {applied ? (
        <div
          className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300"
          data-testid={`clinical-gate-suggestion-applied-${row.id}`}
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          Suggestion applied to YES / NO
        </div>
      ) : canEdit && onApply ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg bg-emerald-700 px-3 text-xs font-medium text-white shadow-sm hover:bg-emerald-800"
            data-testid={`clinical-gate-use-suggestion-${row.id}`}
            onClick={() => onApply(indication)}
          >
            Use suggested {indication}
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Reference only — set YES / NO manually when ready.
        </p>
      )}
    </div>
  )
}

function GateRow({
  row,
  answer,
  onChange,
  canEdit,
}: {
  row: ClinicalGateRow
  answer: ManualAnswer
  onChange?: (next: 'YES' | 'NO') => void
  canEdit: boolean
}) {
  const showSuggestion = hasViewableSuggestion(row)

  return (
    <div
      className="border-b border-slate-300 dark:border-border last:border-b-0"
      data-testid={`clinical-gate-${row.id}`}
    >
      <div className="flex flex-col gap-1.5 px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-slate-400 dark:border-border bg-white text-[#0f6b6b]">
            {row.icon}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900">{row.title}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{row.question}</p>
            {showSuggestion ? (
              <span
                className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300"
                data-testid={`clinical-gate-view-suggestion-${row.id}`}
              >
                <Sparkles className="h-3 w-3" aria-hidden />
                Suggestion available
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end">
          <YesNoToggle
            value={answer}
            name={row.id}
            disabled={!canEdit}
            onChange={canEdit ? onChange : undefined}
          />
        </div>
      </div>
      {showSuggestion ? (
        <GateSuggestionCard
          row={row}
          answer={answer}
          canEdit={canEdit}
          onApply={canEdit ? onChange : undefined}
        />
      ) : null}
    </div>
  )
}

export type BuildClinicalGatesInput = {
  serviceUserId: string
  /** Raw IA risk records (preferred). */
  iaRiskRecords?: InitialAssessmentRiskRecord[] | null
  iaRisksReady?: boolean
  conditionsReady?: boolean
  hasDiabetesCondition?: boolean
  hasCopdCondition?: boolean
  hasPalliativeCondition?: boolean
  flashReady?: boolean
  flashMessage?: string | null
  documentsReady?: boolean
  dolsSummaries?: string[]
  dnacprStatus?: 'IN_PLACE' | 'NOT_IN_PLACE' | 'UNKNOWN' | null
  dnacprSummary?: string | null
  allergySourceReady?: boolean
  allergyItems?: MedicalSafetyItem[]
  riskLevelName?: string | null
  isHighRisk?: boolean
}

function conditionSuggestion(
  ready: boolean | undefined,
  active: boolean | undefined,
  label: string,
): { suggestion: ClinicalGateSuggestion; suggestionDetail: string | null } {
  if (!ready || !active) return resolveSuggestion(null, null)
  return resolveSuggestion('YES', `Active medical condition: ${label}`)
}

export function buildClinicalGates(input: BuildClinicalGatesInput): ClinicalGateRow[] {
  const iaReady = Boolean(input.iaRisksReady)
  const iaRecords = input.iaRiskRecords ?? []

  const fallsEvidence = iaReady
    ? joinIaRiskEvidence(findOpenIaRisks(iaRecords, ['FALLS']))
    : null
  const chokingEvidence = iaReady
    ? joinIaRiskEvidence(findOpenIaRisks(iaRecords, ['CHOKING']))
    : null
  const dietaryEvidence = iaReady
    ? joinIaRiskEvidence(findOpenIaRisks(iaRecords, ['NUTRITION', 'HYDRATION']))
    : null
  const capabilitiesEvidence = iaReady
    ? joinIaRiskEvidence(findOpenIaRisks(iaRecords, ['MOVING_HANDLING']))
    : null
  const behaviourEvidence = iaReady
    ? joinIaRiskEvidence(
        findOpenIaRisksByText(iaRecords, /behav|aggress|challeng/i),
      )
    : null
  const communicationEvidence = iaReady
    ? joinIaRiskEvidence(
        findOpenIaRisksByText(iaRecords, /communicat|speech|non[-\s]?verbal|aphasia/i),
      )
    : null

  const falls = resolveSuggestion(fallsEvidence ? 'YES' : null, fallsEvidence)
  const choking = resolveSuggestion(chokingEvidence ? 'YES' : null, chokingEvidence)
  const dietary = resolveSuggestion(dietaryEvidence ? 'YES' : null, dietaryEvidence)
  const capabilities = resolveSuggestion(capabilitiesEvidence ? 'YES' : null, capabilitiesEvidence)
  const behaviour = resolveSuggestion(behaviourEvidence ? 'YES' : null, behaviourEvidence)
  const communication = resolveSuggestion(
    communicationEvidence ? 'YES' : null,
    communicationEvidence,
  )

  const flashMsg =
    input.flashReady === false
      ? null
      : isActiveFlashMessageText(input.flashMessage)
        ? input.flashMessage!.trim()
        : null
  const generalAlert = flashMsg
    ? resolveSuggestion('YES', flashMsg)
    : resolveSuggestion(null, null)

  const diabetes = conditionSuggestion(
    input.conditionsReady,
    input.hasDiabetesCondition,
    'Diabetes',
  )
  const palliative = conditionSuggestion(
    input.conditionsReady,
    input.hasPalliativeCondition,
    'Palliative Care',
  )
  const copd = conditionSuggestion(input.conditionsReady, input.hasCopdCondition, 'COPD')

  const dolsBits =
    input.documentsReady === false
      ? []
      : (input.dolsSummaries ?? []).map((s) => s.trim()).filter(Boolean)
  const dols = dolsBits.length
    ? resolveSuggestion('YES', dolsBits.join('\n'))
    : resolveSuggestion(null, null)

  const dnacprStatus =
    input.documentsReady === false ? 'UNKNOWN' : (input.dnacprStatus ?? 'UNKNOWN')
  const dnacprDetail =
    dnacprStatus === 'IN_PLACE'
      ? [
          'DNACPR status: in place',
          input.dnacprSummary?.trim() || null,
        ]
          .filter(Boolean)
          .join('\n')
      : dnacprStatus === 'NOT_IN_PLACE'
        ? 'DNACPR status confirmation: not in place'
        : null
  const dnacpr = resolveSuggestion(
    dnacprStatus === 'IN_PLACE' ? 'YES' : dnacprStatus === 'NOT_IN_PLACE' ? 'NO' : null,
    dnacprDetail,
  )

  const riskName = input.riskLevelName?.trim() || null
  const riskLevel = riskName
    ? resolveSuggestion(input.isHighRisk ? 'YES' : 'NO', `Risk level: ${riskName}`)
    : resolveSuggestion(null, null)

  const allergyItems = input.allergySourceReady === false ? [] : (input.allergyItems ?? [])
  const allergyDetail = allergySuggestionDetail(allergyItems)
  const allergies = allergyDetail
    ? resolveSuggestion('YES', allergyDetail)
    : resolveSuggestion(null, null)

  return [
    {
      id: 'capabilities',
      title: 'Capabilities',
      question: 'Does the service user have capability / independence concerns?',
      ...capabilities,
      sourceLabel: 'Initial assessment risk',
      icon: <Accessibility className="h-3.5 w-3.5" />,
    },
    {
      id: 'general-alert',
      title: 'General Alert',
      question: 'Is there an active flash / general safety alert?',
      ...generalAlert,
      sourceLabel: 'Flash message',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
    {
      id: 'communication',
      title: 'Communication',
      question: 'Does the service user have communication issues?',
      ...communication,
      sourceLabel: 'Initial assessment risk',
      icon: <MessageSquare className="h-3.5 w-3.5" />,
    },
    {
      id: 'diabetes',
      title: 'Diabetes',
      question: 'Is the service user diabetic?',
      ...diabetes,
      sourceLabel: 'Medical conditions',
      icon: <Activity className="h-3.5 w-3.5" />,
    },
    {
      id: 'dietary',
      title: 'Dietary',
      question: 'Does the service user have dietary requirements or risks?',
      ...dietary,
      sourceLabel: 'Initial assessment risk',
      icon: <Utensils className="h-3.5 w-3.5" />,
    },
    {
      id: 'palliative',
      title: 'Palliative Care',
      question: 'Is the service user receiving palliative care?',
      ...palliative,
      sourceLabel: 'Medical conditions',
      icon: <HeartPulse className="h-3.5 w-3.5" />,
    },
    {
      id: 'behaviour',
      title: 'Behaviour',
      question: 'Are there behaviour support needs or risks?',
      ...behaviour,
      sourceLabel: 'Initial assessment risk',
      icon: <Brain className="h-3.5 w-3.5" />,
    },
    {
      id: 'falls',
      title: 'Falls',
      question: 'Is the service user at risk of falling?',
      ...falls,
      sourceLabel: 'Initial assessment risk',
      icon: <Footprints className="h-3.5 w-3.5" />,
    },
    {
      id: 'dols',
      title: 'Deprivation of liberty',
      question: 'Is a deprivation of liberty authorisation (Court of Protection / DoLS) in place?',
      ...dols,
      sourceLabel: 'Legal documents',
      icon: <Scale className="h-3.5 w-3.5" />,
    },
    {
      id: 'choking',
      title: 'Choking',
      question: 'Is the service user at risk of choking?',
      ...choking,
      sourceLabel: 'Initial assessment risk',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
    {
      id: 'copd',
      title: 'COPD',
      question: 'Does the service user have COPD?',
      ...copd,
      sourceLabel: 'Medical conditions',
      icon: <Wind className="h-3.5 w-3.5" />,
    },
    {
      id: 'dnacpr',
      title: 'DNACPR',
      question: 'Is DNACPR in place?',
      ...dnacpr,
      sourceLabel: 'Legal documents',
      icon: <HeartPulse className="h-3.5 w-3.5" />,
    },
    {
      id: 'risk-level',
      title: 'Risk Level',
      question: 'Is the service user marked high / critical risk?',
      ...riskLevel,
      sourceLabel: 'Service user profile',
      icon: <Bone className="h-3.5 w-3.5" />,
    },
    {
      id: 'allergies',
      title: 'Allergies',
      question: 'Are allergies recorded for this service user?',
      ...allergies,
      sourceLabel: 'Allergies / medication allergies',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
  ]
}

function emptyAnswers(): Record<MedicalAlertGateId, ManualAnswer> {
  return Object.fromEntries(MEDICAL_ALERT_GATE_IDS.map((id) => [id, 'UNKNOWN'])) as Record<
    MedicalAlertGateId,
    ManualAnswer
  >
}

export function MedicalAlertsClinicalBody({
  serviceUserId,
  gates,
  className,
}: {
  serviceUserId: string
  gates: ClinicalGateRow[]
  className?: string
}) {
  const monPerms = useMedicalClinicalPermissions().monitoring
  const monQuery = useMonitoringConfig(serviceUserId, monPerms.read)
  const monMut = useMonitoringConfigMutations(serviceUserId)

  const [answers, setAnswers] = React.useState<Record<MedicalAlertGateId, ManualAnswer>>(emptyAnswers)
  const [baseline, setBaseline] = React.useState<Record<MedicalAlertGateId, ManualAnswer>>(emptyAnswers)
  const [hydrated, setHydrated] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setHydrated(false)
    setAnswers(emptyAnswers())
    setBaseline(emptyAnswers())
  }, [serviceUserId])

  React.useEffect(() => {
    if (!monPerms.read) {
      setHydrated(true)
      return
    }
    if (monQuery.isLoading || hydrated) return
    const next = emptyAnswers()
    for (const id of MEDICAL_ALERT_GATE_IDS) {
      const key = MEDICAL_ALERT_GATE_CONFIG_KEYS[id]
      const row = (monQuery.data ?? []).find((r) => r.configKey === key)
      if (row?.textValue === 'YES' || row?.textValue === 'NO') {
        next[id] = row.textValue
      }
    }
    setBaseline(next)
    setAnswers((prev) => {
      const userEdited = MEDICAL_ALERT_GATE_IDS.some((id) => prev[id] !== 'UNKNOWN')
      return userEdited ? prev : next
    })
    setHydrated(true)
  }, [monPerms.read, monQuery.data, monQuery.isLoading, hydrated])

  const dirty = MEDICAL_ALERT_GATE_IDS.some((id) => answers[id] !== baseline[id])
  const canEdit = monPerms.update

  async function saveAnswers() {
    if (!canEdit || !dirty) return
    setSaving(true)
    try {
      for (const id of MEDICAL_ALERT_GATE_IDS) {
        const value = answers[id]
        if (value === baseline[id]) continue
        if (value !== 'YES' && value !== 'NO') continue
        await monMut.upsert.mutateAsync({
          configKey: MEDICAL_ALERT_GATE_CONFIG_KEYS[id],
          textValue: value,
          enabled: true,
        })
      }
      setBaseline({ ...answers })
      toastSuccess('Medical alerts saved')
    } catch (err) {
      toastApiError(err, 'Could not save medical alerts')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ClinicalBand
      title="Medical Alerts"
      testId="su-alerts-medical"
      className={className}
      actions={
        canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 rounded-none bg-white text-[#0f6b6b] hover:bg-white"
            data-testid="medical-alerts-save"
            disabled={!dirty || saving}
            onClick={() => void saveAnswers()}
          >
            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            Save
          </Button>
        ) : null
      }
    >
      <div className={cn('border border-slate-300 dark:border-border bg-white dark:bg-card')}>
        {gates.map((row) => (
          <GateRow
            key={row.id}
            row={row}
            answer={answers[row.id] ?? 'UNKNOWN'}
            canEdit={canEdit}
            onChange={(next) =>
              setAnswers((prev) => ({
                ...prev,
                [row.id]: next,
              }))
            }
          />
        ))}
      </div>
    </ClinicalBand>
  )
}
