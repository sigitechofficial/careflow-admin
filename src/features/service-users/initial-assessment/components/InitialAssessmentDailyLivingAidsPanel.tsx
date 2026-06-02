import { Label, Textarea } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { InitialAssessmentPaperYesNoRow } from '@/features/service-users/initial-assessment/components/InitialAssessmentPaperYesNoRow'
import {
  InitialAssessmentSection12FieldRow,
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import {
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { section12PanelTitle } from '@/features/service-users/initial-assessment/utils/section-12-panel-labels'
import type { DailyLivingAidsMetadata } from '@/features/service-users/initial-assessment/utils/mobility-metadata'

type Props = {
  value: DailyLivingAidsMetadata
  disabled?: boolean
  onChange: (next: DailyLivingAidsMetadata) => void
}

export function InitialAssessmentDailyLivingAidsPanel({ value, disabled, onChange }: Props) {
  const patch = (partial: Partial<DailyLivingAidsMetadata>) => onChange({ ...value, ...partial })

  return (
    <InitialAssessmentSection12PanelShell
      title={section12PanelTitle('12.9')}
      hint="Aids to support daily living activities — separate from mobility aids (§12.8)."
      testId="ia-section-12-daily-living-aids"
      bodyVariant="content"
    >
      <InitialAssessmentPaperYesNoRow
        label="Are aids to support daily living activities in use or required?"
        name="daily-living-aids-required"
        value={value.aidsInUseOrRequired ?? null}
        disabled={disabled}
        showDivider={false}
        onChange={(v) =>
          patch({
            aidsInUseOrRequired: v,
            aidsList: v ? value.aidsList : '',
          })
        }
      />

      {value.aidsInUseOrRequired === true ? (
        <InitialAssessmentSection12FieldRow>
          <Label htmlFor="daily-living-aids-list" className={IA_QUESTION_LABEL_CLASS}>
            Please list
          </Label>
          <Textarea
            id="daily-living-aids-list"
            className={cn('mt-1.5', IA_FORM_TEXTAREA_COMPACT_CLASS)}
            disabled={disabled}
            placeholder="e.g. reacher, raised toilet seat, jar opener"
            value={value.aidsList ?? ''}
            onChange={(e) => patch({ aidsList: e.target.value })}
          />
        </InitialAssessmentSection12FieldRow>
      ) : null}

      <InitialAssessmentPaperYesNoRow
        label="Does the client require any further daily-living equipment to be ordered?"
        name="daily-living-further-equipment"
        value={value.furtherEquipmentRequired ?? null}
        disabled={disabled}
        onChange={(v) =>
          patch({
            furtherEquipmentRequired: v,
            furtherEquipmentDetails: v ? value.furtherEquipmentDetails : '',
            equipmentOrdered: v ? value.equipmentOrdered : null,
            equipmentOrderedDate: v ? value.equipmentOrderedDate : '',
          })
        }
      />

      {value.furtherEquipmentRequired === true ? (
        <>
          <InitialAssessmentSection12FieldRow>
            <Label htmlFor="daily-living-further-details" className={IA_QUESTION_LABEL_CLASS}>
              If yes, provide further details
            </Label>
            <Textarea
              id="daily-living-further-details"
              className={cn('mt-1.5', IA_FORM_TEXTAREA_COMPACT_CLASS)}
              disabled={disabled}
              value={value.furtherEquipmentDetails ?? ''}
              onChange={(e) => patch({ furtherEquipmentDetails: e.target.value })}
            />
          </InitialAssessmentSection12FieldRow>
          <InitialAssessmentPaperYesNoRow
            label="Equipment ordered"
            name="daily-living-equipment-ordered"
            value={value.equipmentOrdered ?? null}
            disabled={disabled}
            dateLabel="Date ordered"
            dateValue={value.equipmentOrderedDate ?? undefined}
            dateDisabled={value.equipmentOrdered !== true}
            onChange={(v) =>
              patch({
                equipmentOrdered: v,
                equipmentOrderedDate: v ? value.equipmentOrderedDate : '',
              })
            }
            onDateChange={(iso) => patch({ equipmentOrderedDate: iso })}
          />
        </>
      ) : null}

      <InitialAssessmentSection12FieldRow>
        <Label htmlFor="daily-living-additional-comments" className={IA_QUESTION_LABEL_CLASS}>
          Additional comments
        </Label>
        <Textarea
          id="daily-living-additional-comments"
          className={cn('mt-1.5', IA_FORM_TEXTAREA_COMPACT_CLASS)}
          disabled={disabled}
          value={value.additionalComments ?? ''}
          onChange={(e) => patch({ additionalComments: e.target.value })}
        />
      </InitialAssessmentSection12FieldRow>
    </InitialAssessmentSection12PanelShell>
  )
}
