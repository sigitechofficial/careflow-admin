import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { cn } from '@/shared/lib/utils'
import {
  InitialAssessmentSection12FieldRow,
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import {
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import type { PracticalCareTasksMetadata } from '@/features/service-users/initial-assessment/utils/mobility-metadata'

/** Paper practical care block — matches reference form wording. */
export const PAPER_PRACTICAL_CARE_TITLE =
  'Practical care Task Does the customer required assistance with:'

type Props = {
  value: PracticalCareTasksMetadata
  disabled?: boolean
  onChange: (next: PracticalCareTasksMetadata) => void
}

const TASK_FIELDS: { id: keyof PracticalCareTasksMetadata; label: string }[] = [
  { id: 'laundry', label: 'Laundry ?' },
  { id: 'cleaning', label: 'Cleaning ?' },
  { id: 'shopping', label: 'Shopping?' },
  {
    id: 'financeAssistance',
    label:
      'Finance , collecting pension or monies , paying bills ( if support required must be recorded ) state :',
  },
  { id: 'otherComment', label: 'Other comment :' },
]

export function InitialAssessmentPracticalCarePanel({ value, disabled, onChange }: Props) {
  const patch = (partial: Partial<PracticalCareTasksMetadata>) => onChange({ ...value, ...partial })

  return (
    <InitialAssessmentSection12PanelShell
      title={PAPER_PRACTICAL_CARE_TITLE}
      testId="ia-section-12-practical-care"
      bodyVariant="content"
    >
      {TASK_FIELDS.map(({ id, label }) => (
        <InitialAssessmentSection12FieldRow key={id}>
          <Label htmlFor={`practical-care-${id}`} className={IA_QUESTION_LABEL_CLASS}>
            {label}
          </Label>
          <Textarea
            id={`practical-care-${id}`}
            className={cn('mt-1.5', IA_FORM_TEXTAREA_COMPACT_CLASS)}
            disabled={disabled}
            rows={id === 'financeAssistance' ? 3 : 2}
            value={value[id] ?? ''}
            onChange={(e) => patch({ [id]: e.target.value })}
          />
        </InitialAssessmentSection12FieldRow>
      ))}
    </InitialAssessmentSection12PanelShell>
  )
}
