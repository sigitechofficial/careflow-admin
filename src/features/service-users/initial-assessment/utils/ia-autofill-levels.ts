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
}

export const IA_AUTOFILL_LEVELS: IaAutofillLevelUi[] = [
  {
    level: 'critical',
    label: IA_CONDITION_LEVEL_LABELS.critical,
    testId: 'ia-autofill-critical',
    title:
      'Very critical scenario — sections fill with safeguarding, falls, wounds, and high-risk scores.',
  },
  {
    level: 'normal',
    label: IA_CONDITION_LEVEL_LABELS.normal,
    testId: 'ia-autofill-normal',
    title: 'Moderate scenario — sections fill with routine risk flags and required fields.',
  },
  {
    level: 'low',
    label: IA_CONDITION_LEVEL_LABELS.low,
    testId: 'ia-autofill-low',
    title: 'Stable scenario — sections fill with low-risk, out-of-danger values.',
  },
]

/** Toolbar button that opens the QA Demo Data scenario selector (dev/QA only). */
export const IA_QA_DEMO_DATA_BUTTON_LABEL = 'QA Demo Data'

export const IA_QA_DEMO_DATA_BUTTON_TOOLTIP =
  'Pick a QA scenario (Very critical / Moderate / Stable), then use each section’s “Fill Demo Data” button to populate that section only.'

/** Shown per section after a successful section fill. */
export const IA_SECTION_DEMO_SUCCESS_TOAST = 'Demo data populated for this section'

export function iaAutofillLevelUi(level: IaAutofillLevel): IaAutofillLevelUi {
  const row = IA_AUTOFILL_LEVELS.find((x) => x.level === level)
  if (!row) throw new Error(`Unknown IA autofill level: ${level}`)
  return row
}
