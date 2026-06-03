import type { IaAutofillLevel } from '@/features/service-users/initial-assessment/utils/ia-autofill-dev'

/** Dev autofill levels — API/env still use `critical` | `normal` | `low`. */
export const IA_CONDITION_LEVEL_LABELS: Record<IaAutofillLevel, string> = {
  critical: 'Very critical',
  normal: 'Moderate',
  low: 'Stable',
}

export type IaAutofillLevelUi = {
  level: IaAutofillLevel
  label: string
  testId: string
  title: string
  completeToastTitle: string
  failedToastTitle: string
}

export const IA_AUTOFILL_LEVELS: IaAutofillLevelUi[] = [
  {
    level: 'critical',
    label: IA_CONDITION_LEVEL_LABELS.critical,
    testId: 'ia-autofill-critical',
    title:
      'Service user in very critical condition — full assessment with safeguarding, falls, wounds, and high-risk scores.',
    completeToastTitle: 'Very critical autofill complete',
    failedToastTitle: 'Very critical autofill failed',
  },
  {
    level: 'normal',
    label: IA_CONDITION_LEVEL_LABELS.normal,
    testId: 'ia-autofill-normal',
    title:
      'Not too critical — required fields and hubs filled with routine risk flags; may submit incomplete.',
    completeToastTitle: 'Moderate autofill complete',
    failedToastTitle: 'Moderate autofill failed',
  },
  {
    level: 'low',
    label: IA_CONDITION_LEVEL_LABELS.low,
    testId: 'ia-autofill-low',
    title:
      'Out of danger — condition is normal; required fields and low-risk flags; submits as incomplete where allowed.',
    completeToastTitle: 'Stable autofill complete',
    failedToastTitle: 'Stable autofill failed',
  },
]

export function iaAutofillLevelUi(level: IaAutofillLevel): IaAutofillLevelUi {
  const row = IA_AUTOFILL_LEVELS.find((x) => x.level === level)
  if (!row) throw new Error(`Unknown IA autofill level: ${level}`)
  return row
}
