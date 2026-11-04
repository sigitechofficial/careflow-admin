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
  'Practical tasks – the support I need with:'

type Props = {
  value: PracticalCareTasksMetadata
  disabled?: boolean
  onChange: (next: PracticalCareTasksMetadata) => void
}

const TASK_FIELDS: { id: keyof PracticalCareTasksMetadata; label: string }[] = [
  { id: 'laundry', label: 'The support I need with my laundry:' },
  { id: 'cleaning', label: 'The support I need with cleaning and housework:' },
  { id: 'shopping', label: 'The support I need with my shopping:' },
  {
    id: 'financeAssistance',
    label:
      'The support I need with my money, collecting my pension and paying my bills (if I need support, please record how it is given):',
  },
  { id: 'otherComment', label: 'Anything else I would like help with around my home:' },
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
