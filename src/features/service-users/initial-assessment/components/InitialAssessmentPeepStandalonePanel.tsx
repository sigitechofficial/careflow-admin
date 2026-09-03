import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { InitialAssessmentYesNoCardField } from '@/features/service-users/initial-assessment/components/InitialAssessmentYesNoCardField'
import {
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_SECTION_BODY_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import type { PeepSnapshot } from '@/features/service-users/initial-assessment/utils/peep-snapshot'

type Props = {
  value: PeepSnapshot
  disabled?: boolean
  onChange: (next: PeepSnapshot) => void
}

function TextField({
  id,
  label,
  value,
  disabled,
  multiline,
  onChange,
}: {
  id: string
  label: string
  value: string
  disabled?: boolean
  multiline?: boolean
  onChange: (next: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className={IA_QUESTION_LABEL_CLASS}>
        {label}
      </Label>
      {multiline ? (
        <Textarea
          id={id}
          plain
          className={IA_FORM_TEXTAREA_COMPACT_CLASS}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          className="h-9 bg-background"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

/** Repeat/capture editor for the existing PEEP snapshot — not a second PEEP form. */
export function InitialAssessmentPeepStandalonePanel({ value, disabled, onChange }: Props) {
  const patch = (partial: Partial<PeepSnapshot>) => onChange({ ...value, ...partial })
  const assisted = value.canSelfEvacuate === false

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-peep-standalone-panel">
      <div className="space-y-4 p-4">
        <InitialAssessmentYesNoCardField
          name="peep-can-self-evacuate"
          label="Can the person self-evacuate in an emergency?"
          value={value.canSelfEvacuate ?? null}
          disabled={disabled}
          onChange={(canSelfEvacuate) =>
            patch({
              canSelfEvacuate,
              ...(canSelfEvacuate
                ? {
                    peepAssistanceRequired: undefined,
                    peepEquipmentRequired: undefined,
                    peepEvacuationProcedure: undefined,
                    peepAlarmWarningConsiderations: undefined,
                    peepRefugeLocation: undefined,
                    peepDiscussedWithPerson: undefined,
                    peepReviewDate: undefined,
                  }
                : {}),
            })
          }
        />

        {assisted ? (
          <>
            <TextField
              id="peep-assistance"
              label="Assistance required to evacuate"
              multiline
              disabled={disabled}
              value={value.peepAssistanceRequired ?? ''}
              onChange={(peepAssistanceRequired) => patch({ peepAssistanceRequired })}
            />
            <TextField
              id="peep-equipment"
              label="Equipment required to evacuate"
              multiline
              disabled={disabled}
              value={value.peepEquipmentRequired ?? ''}
              onChange={(peepEquipmentRequired) => patch({ peepEquipmentRequired })}
            />
            <TextField
              id="peep-procedure"
              label="Evacuation procedure"
              multiline
              disabled={disabled}
              value={value.peepEvacuationProcedure ?? ''}
              onChange={(peepEvacuationProcedure) => patch({ peepEvacuationProcedure })}
            />
            <TextField
              id="peep-alarm"
              label="Alarm and warning considerations"
              multiline
              disabled={disabled}
              value={value.peepAlarmWarningConsiderations ?? ''}
              onChange={(peepAlarmWarningConsiderations) =>
                patch({ peepAlarmWarningConsiderations })
              }
            />
            <TextField
              id="peep-refuge"
              label="Refuge or waiting location"
              disabled={disabled}
              value={value.peepRefugeLocation ?? ''}
              onChange={(peepRefugeLocation) => patch({ peepRefugeLocation })}
            />
            <InitialAssessmentYesNoCardField
              name="peep-discussed"
              label="Has this PEEP been discussed with the person?"
              value={value.peepDiscussedWithPerson ?? null}
              disabled={disabled}
              onChange={(peepDiscussedWithPerson) => patch({ peepDiscussedWithPerson })}
            />
            <div className="space-y-1">
              <Label htmlFor="peep-review-date" className={IA_QUESTION_LABEL_CLASS}>
                PEEP review date
              </Label>
              <Input
                id="peep-review-date"
                type="date"
                className="h-9 bg-background"
                disabled={disabled}
                value={value.peepReviewDate?.slice(0, 10) ?? ''}
                onChange={(e) => patch({ peepReviewDate: e.target.value })}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
