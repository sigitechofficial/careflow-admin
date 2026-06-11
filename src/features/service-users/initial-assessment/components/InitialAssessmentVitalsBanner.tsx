import * as React from 'react'
import { AlertTriangle, Stethoscope } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import {
  competentToRecordVitals,
  hasAnyVitalSignEntered,
  resolveVitalFieldRules,
  type VitalAcceptedRangesMetadata,
  type VitalFieldKey,
} from '@/features/service-users/initial-assessment/utils/vitals-validation'
import {
  IA_CALLOUT_AMBER_CLASS,
  IA_CALLOUT_NEUTRAL_CLASS,
  IA_CALLOUT_SKY_CLASS,
  IA_CALLOUT_TITLE_CLASS,
  IA_HINT_CLASS,
  IA_SIMPLE_INPUT_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

type Props = {
  sections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  vitalAcceptedRanges: VitalAcceptedRangesMetadata
  disabled?: boolean
  onVitalAcceptedRangesChange: (next: VitalAcceptedRangesMetadata) => void
}

type RangeSide = 'min' | 'max'

function rangeDraftKey(fieldKey: VitalFieldKey, side: RangeSide): string {
  return `${fieldKey}:${side}`
}

function parseCommittedNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function isDraftInputValid(raw: string, decimal?: boolean): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return true
  return decimal ? /^-?\d*\.?\d*$/.test(trimmed) : /^-?\d*$/.test(trimmed)
}

export function InitialAssessmentVitalsBanner({
  sections,
  draftAnswers,
  vitalAcceptedRanges,
  disabled = false,
  onVitalAcceptedRangesChange,
}: Props) {
  const competent = competentToRecordVitals(sections, draftAnswers)
  const vitalsEntered = hasAnyVitalSignEntered(sections, draftAnswers)
  const rules = resolveVitalFieldRules(vitalAcceptedRanges)

  const [drafts, setDrafts] = React.useState<Record<string, string>>({})
  const [rangeErrors, setRangeErrors] = React.useState<Record<string, string>>({})

  const displayValue = (fieldKey: VitalFieldKey, side: RangeSide): string => {
    const key = rangeDraftKey(fieldKey, side)
    if (key in drafts) return drafts[key]
    return String(vitalAcceptedRanges[fieldKey][side])
  }

  const setDraft = (fieldKey: VitalFieldKey, side: RangeSide, raw: string) => {
    const key = rangeDraftKey(fieldKey, side)
    setDrafts((prev) => ({ ...prev, [key]: raw }))
    setRangeErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const clearDraft = (fieldKey: VitalFieldKey, side: RangeSide) => {
    const key = rangeDraftKey(fieldKey, side)
    setDrafts((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const commitDraft = (fieldKey: VitalFieldKey, side: RangeSide, decimal?: boolean) => {
    const key = rangeDraftKey(fieldKey, side)
    const raw = key in drafts ? drafts[key] : String(vitalAcceptedRanges[fieldKey][side])

    if (!isDraftInputValid(raw, decimal)) {
      setRangeErrors((prev) => ({ ...prev, [key]: 'Enter a valid number' }))
      clearDraft(fieldKey, side)
      return
    }

    const parsed = parseCommittedNumber(raw)
    if (parsed === null) {
      clearDraft(fieldKey, side)
      setRangeErrors((prev) => {
        if (!(key in prev)) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
      return
    }

    const current = vitalAcceptedRanges[fieldKey]
    const nextMin = side === 'min' ? parsed : current.min
    const nextMax = side === 'max' ? parsed : current.max

    if (nextMin >= nextMax) {
      setRangeErrors((prev) => ({
        ...prev,
        [key]: 'Min must be lower than max',
      }))
      clearDraft(fieldKey, side)
      return
    }

    clearDraft(fieldKey, side)
    setRangeErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })

    if (nextMin === current.min && nextMax === current.max) return

    onVitalAcceptedRangesChange({
      ...vitalAcceptedRanges,
      [fieldKey]: { min: nextMin, max: nextMax },
    })
  }

  return (
    <div className="space-y-3">
      <div className={IA_CALLOUT_SKY_CLASS}>
        <div className="flex items-start gap-3">
          <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
          <div>
            <p className={cn(IA_CALLOUT_TITLE_CLASS, 'text-sky-950 dark:text-sky-100')}>
              Physical assessment — competent person only
            </p>
            <p className={cn('mt-1', IA_HINT_CLASS)}>
              Baseline vital signs must be recorded by a staff member who is competent to take clinical
              observations. Confirm competency in section 4.1 before entering values below.
            </p>
          </div>
        </div>
      </div>

      {competent === false ? (
        <div className={cn(IA_CALLOUT_AMBER_CLASS, 'flex items-start gap-3')} role="status">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
          <div>
            <p className={cn(IA_CALLOUT_TITLE_CLASS, 'text-amber-950 dark:text-amber-100')}>
              Assessor not competent — clinical fields locked
            </p>
            <p className={cn('mt-1', IA_HINT_CLASS)}>
              Change &ldquo;Assessor competent to record vital signs?&rdquo; to Yes, or ask a competent
              colleague to complete observations.
            </p>
          </div>
        </div>
      ) : competent === null && vitalsEntered ? (
        <div className={cn(IA_CALLOUT_AMBER_CLASS, 'flex items-start gap-3')} role="status">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
          <p className={cn('text-sm', 'text-amber-950 dark:text-amber-100')}>
            Confirm assessor competency before recording vital signs.
          </p>
        </div>
      ) : null}

      <div className={cn(IA_CALLOUT_NEUTRAL_CLASS, 'space-y-3')} data-testid="ia-vitals-accepted-ranges">
        <div>
          <p className="text-sm font-medium text-foreground">Accepted ranges</p>
          <p className={cn('mt-1', IA_HINT_CLASS)}>
            Set the acceptable min and max for each observation. Values are saved with this assessment.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Observation</th>
                <th className="pb-2 pr-3 font-medium">Min</th>
                <th className="pb-2 pr-3 font-medium">Max</th>
                <th className="pb-2 font-medium">Unit</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const range = vitalAcceptedRanges[rule.fieldKey]
                const minKey = rangeDraftKey(rule.fieldKey, 'min')
                const maxKey = rangeDraftKey(rule.fieldKey, 'max')
                const invalid = range.min >= range.max
                return (
                  <tr key={rule.fieldKey} className="border-b border-border/40 last:border-0">
                    <td className="py-2 pr-3 font-medium text-foreground">{rule.label}</td>
                    <td className="py-2 pr-3 align-top">
                      <Input
                        type="text"
                        inputMode={rule.decimal ? 'decimal' : 'numeric'}
                        className={cn(IA_SIMPLE_INPUT_CLASS, 'h-9 w-24')}
                        value={displayValue(rule.fieldKey, 'min')}
                        disabled={disabled}
                        aria-label={`${rule.label} minimum`}
                        aria-invalid={Boolean(rangeErrors[minKey])}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (!isDraftInputValid(raw, rule.decimal)) return
                          setDraft(rule.fieldKey, 'min', raw)
                        }}
                        onBlur={() => commitDraft(rule.fieldKey, 'min', rule.decimal)}
                      />
                      {rangeErrors[minKey] ? (
                        <p className="mt-1 text-xs text-destructive">{rangeErrors[minKey]}</p>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <Input
                        type="text"
                        inputMode={rule.decimal ? 'decimal' : 'numeric'}
                        className={cn(IA_SIMPLE_INPUT_CLASS, 'h-9 w-24')}
                        value={displayValue(rule.fieldKey, 'max')}
                        disabled={disabled}
                        aria-label={`${rule.label} maximum`}
                        aria-invalid={Boolean(rangeErrors[maxKey])}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (!isDraftInputValid(raw, rule.decimal)) return
                          setDraft(rule.fieldKey, 'max', raw)
                        }}
                        onBlur={() => commitDraft(rule.fieldKey, 'max', rule.decimal)}
                      />
                      {rangeErrors[maxKey] ? (
                        <p className="mt-1 text-xs text-destructive">{rangeErrors[maxKey]}</p>
                      ) : null}
                    </td>
                    <td className="py-2 text-muted-foreground">{rule.unit}</td>
                    {invalid ? (
                      <td colSpan={4} className="sr-only">
                        Min must be lower than max for {rule.label}
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
