import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { isExplicitNo, isYesAnswer } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { section12PanelTitle } from '@/features/service-users/initial-assessment/utils/section-12-panel-labels'
import {
  FINANCE_SUPPORT_TYPES,
  type FinanceSupportMetadata,
} from '@/features/service-users/initial-assessment/utils/mobility-metadata'
import {
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
} from '@/features/service-users/initial-assessment/types'

type Props = {
  financeRequired: boolean
  consentQuestion?: InitialAssessmentQuestion
  consentAnswer?: InitialAssessmentAnswerInput
  value: FinanceSupportMetadata
  disabled?: boolean
  onChange: (next: FinanceSupportMetadata) => void
  renderConsentField?: () => ReactNode
}

export function InitialAssessmentFinanceSupportPanel({
  financeRequired,
  consentQuestion,
  consentAnswer,
  value,
  disabled,
  onChange,
  renderConsentField,
}: Props) {
  if (!financeRequired) return null

  const consentMissing = consentQuestion && !isYesAnswer(consentAnswer) && !isExplicitNo(consentAnswer)
  const consentNo = consentQuestion && isExplicitNo(consentAnswer)
  const types = new Set(value.supportTypes ?? [])

  const toggleType = (t: string) => {
    const next = new Set(types)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    onChange({ ...value, supportTypes: [...next] })
  }

  const suggestManagerApproval = value.staffHandleCash === true

  return (
    <InitialAssessmentSection12PanelShell
      title={section12PanelTitle('12.12')}
      hint="Finance tasks require documented consent, cash limits, and manager approval where cash is handled."
      testId="ia-finance-support"
      bodyVariant="content"
    >
      {consentNo ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Finance consent is No — finance tasks cannot be set up until consent or appointee arrangement is recorded.
        </div>
      ) : consentMissing ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40">
          Record finance support consent below before care activation.
        </div>
      ) : null}

      {renderConsentField ? <div>{renderConsentField()}</div> : null}

      <div>
        <p className="mb-2 text-sm font-semibold text-muted-foreground">Type of finance support</p>
        <div className="flex flex-wrap gap-2">
          {FINANCE_SUPPORT_TYPES.map((t) => {
            const active = types.has(t.value)
            return (
              <button
                key={t.value}
                type="button"
                disabled={disabled}
                onClick={() => toggleType(t.value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-teal-600 bg-teal-50 text-teal-950 dark:border-teal-400 dark:bg-teal-950 dark:text-teal-100'
                    : 'border-border bg-background hover:bg-muted/50',
                )}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={cn('flex items-center gap-2.5', IA_OPTION_LABEL_CLASS)}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={value.staffHandleCash === true}
            onChange={(e) =>
              onChange({
                ...value,
                staffHandleCash: e.target.checked,
                managerApprovalRequired: e.target.checked ? true : value.managerApprovalRequired,
              })
            }
          />
          Staff allowed to handle cash
        </label>
        <label className={cn('flex items-center gap-2.5', IA_OPTION_LABEL_CLASS)}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={value.receiptRequired === true}
            onChange={(e) => onChange({ ...value, receiptRequired: e.target.checked })}
          />
          Receipt required for purchases
        </label>
        <label className={cn('flex items-center gap-2.5', IA_OPTION_LABEL_CLASS)}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={value.familyInvolved === true}
            onChange={(e) => onChange({ ...value, familyInvolved: e.target.checked })}
          />
          Family / appointee involved
        </label>
        <label className={cn('flex items-center gap-2.5', IA_OPTION_LABEL_CLASS)}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={value.financialRiskIdentified === true}
            onChange={(e) => onChange({ ...value, financialRiskIdentified: e.target.checked })}
          />
          Financial risk identified
        </label>
        <label className={cn('flex items-center gap-2.5', IA_OPTION_LABEL_CLASS)}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={value.managerApprovalRequired === true}
            onChange={(e) => onChange({ ...value, managerApprovalRequired: e.target.checked })}
          />
          Manager approval required
        </label>
        <label className={cn('flex items-center gap-2.5', IA_OPTION_LABEL_CLASS)}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={value.safeguardingConcern === true}
            onChange={(e) => onChange({ ...value, safeguardingConcern: e.target.checked })}
          />
          Safeguarding concern (finance)
        </label>
      </div>

      {suggestManagerApproval && !value.managerApprovalRequired ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          Cash handling selected — manager approval is required before care activation.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className={IA_QUESTION_LABEL_CLASS}>Maximum cash amount (£)</Label>
          <Input
            type="number"
            className="mt-1 max-w-xs"
            disabled={disabled || !value.staffHandleCash}
            value={value.maxCashAmount ?? ''}
            onChange={(e) => {
              const n = e.target.value === '' ? null : Number(e.target.value)
              onChange({ ...value, maxCashAmount: Number.isFinite(n) ? n : null })
            }}
          />
        </div>
        <div>
          <Label className={IA_QUESTION_LABEL_CLASS}>Finance support details</Label>
          <Input
            className="mt-1"
            disabled={disabled}
            placeholder="Pension collection, bill paying…"
            value={value.details ?? ''}
            onChange={(e) => onChange({ ...value, details: e.target.value })}
          />
        </div>
      </div>
    </InitialAssessmentSection12PanelShell>
  )
}
