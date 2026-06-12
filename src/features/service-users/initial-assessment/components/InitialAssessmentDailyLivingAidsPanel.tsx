import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { cn } from '@/shared/lib/utils'
import { InitialAssessmentYesNoCardField } from '@/features/service-users/initial-assessment/components/InitialAssessmentYesNoCardField'
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
  /** Omit outer §12 panel shell (paper Section 7 composite block). */
  embedded?: boolean
  /** Paper Section 7 wording for equipment-order questions. */
  paperSection7?: boolean
  /** Render only aids, equipment, or the full block (default `all`). */
  part?: 'all' | 'aids' | 'equipment'
  onChange: (next: DailyLivingAidsMetadata) => void
}

export function InitialAssessmentDailyLivingAidsPanel({
  value,
  disabled,
  embedded = false,
  paperSection7 = false,
  part = 'all',
  onChange,
}: Props) {
  const patch = (partial: Partial<DailyLivingAidsMetadata>) => onChange({ ...value, ...partial })

  const furtherEquipmentLabel = paperSection7
    ? 'Does the client require any further equipment to be ordered?'
    : 'Does the client require any further daily-living equipment to be ordered?'

  const showAids = part === 'all' || part === 'aids'
  const showEquipment = part === 'all' || part === 'equipment'

  const body = (
    <>
      {showAids ? (
        <>
      <InitialAssessmentYesNoCardField
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
        </>
      ) : null}

      {showEquipment ? (
        <>
      <InitialAssessmentYesNoCardField
        label={furtherEquipmentLabel}
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
              {paperSection7 ? 'If YES provide further details' : 'If yes, provide further details'}
            </Label>
            <Textarea
              id="daily-living-further-details"
              className={cn('mt-1.5', IA_FORM_TEXTAREA_COMPACT_CLASS)}
              disabled={disabled}
              value={value.furtherEquipmentDetails ?? ''}
              onChange={(e) => patch({ furtherEquipmentDetails: e.target.value })}
            />
          </InitialAssessmentSection12FieldRow>
          <InitialAssessmentYesNoCardField
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
        </>
      ) : null}
    </>
  )

  if (embedded) {
    return (
      <div data-testid="ia-section-12-daily-living-aids" className="space-y-3">
        {body}
      </div>
    )
  }

  return (
    <InitialAssessmentSection12PanelShell
      title={section12PanelTitle('12.9')}
      hint="Aids to support daily living activities — separate from mobility aids (§12.8)."
      testId="ia-section-12-daily-living-aids"
      bodyVariant="content"
    >
      {body}
    </InitialAssessmentSection12PanelShell>
  )
}
