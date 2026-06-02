import { Label, Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import {
  InitialAssessmentSection12FieldRow,
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import {
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { section12PanelTitle } from '@/features/service-users/initial-assessment/utils/section-12-panel-labels'
import type { PracticalCareTasksMetadata } from '@/features/service-users/initial-assessment/utils/mobility-metadata'

type Props = {
  value: PracticalCareTasksMetadata
  disabled?: boolean
  onChange: (next: PracticalCareTasksMetadata) => void
}

const TASK_FIELDS: { id: keyof PracticalCareTasksMetadata; label: string; placeholder: string }[] = [
  { id: 'laundry', label: 'Laundry', placeholder: 'Assistance required — describe routine and support level' },
  { id: 'cleaning', label: 'Cleaning', placeholder: 'Assistance required — describe areas and frequency' },
  { id: 'shopping', label: 'Shopping', placeholder: 'Assistance required — describe how shopping is managed' },
  {
    id: 'financeAssistance',
    label: 'Finance — collecting pension or monies, paying bills',
    placeholder: 'If support required it must be recorded here',
  },
  { id: 'otherComment', label: 'Other comment', placeholder: 'Any other practical care tasks' },
]

export function InitialAssessmentPracticalCarePanel({ value, disabled, onChange }: Props) {
  const patch = (partial: Partial<PracticalCareTasksMetadata>) => onChange({ ...value, ...partial })

  return (
    <InitialAssessmentSection12PanelShell
      title={section12PanelTitle('12.11')}
      hint="Record assistance required for each task. Finance support controls are in §12.12 when finance support is required."
      testId="ia-section-12-practical-care"
      bodyVariant="content"
    >
      {TASK_FIELDS.map(({ id, label, placeholder }) => (
        <InitialAssessmentSection12FieldRow key={id}>
          <Label htmlFor={`practical-care-${id}`} className={IA_QUESTION_LABEL_CLASS}>
            {label}
          </Label>
          <Textarea
            id={`practical-care-${id}`}
            className={cn('mt-1.5', IA_FORM_TEXTAREA_COMPACT_CLASS)}
            disabled={disabled}
            placeholder={placeholder}
            value={value[id] ?? ''}
            onChange={(e) => patch({ [id]: e.target.value })}
          />
        </InitialAssessmentSection12FieldRow>
      ))}
    </InitialAssessmentSection12PanelShell>
  )
}
