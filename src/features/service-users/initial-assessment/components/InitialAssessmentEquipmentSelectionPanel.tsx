import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import {
  EQUIPMENT_PRODUCT_GUIDE_ROWS,
  EQUIPMENT_SELECTION_ADVISORY_NOTES,
  PRESSURE_RISK_EQUIPMENT_ROWS,
} from '@/features/service-users/initial-assessment/utils/equipment-selection-guide'
import type { EquipmentSelectionMetadata } from '@/features/service-users/initial-assessment/utils/equipment-selection'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_HINT_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_RADIO_CLASS,
  IA_SECTION_BODY_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { cn } from '@/shared/lib/utils'

type Props = {
  value: EquipmentSelectionMetadata
  disabled?: boolean
  onChange: (next: EquipmentSelectionMetadata) => void
}

function YesNoField({
  name,
  label,
  value,
  disabled,
  onChange,
}: {
  name: string
  label: string
  value: boolean | null | undefined
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="space-y-1">
      <span className={IA_QUESTION_LABEL_CLASS}>{label}</span>
      <div className="flex gap-4" role="radiogroup" aria-label={label}>
        {(
          [
            { v: true, text: 'Yes' },
            { v: false, text: 'No' },
          ] as const
        ).map(({ v, text }) => (
          <label
            key={text}
            className={cn(
              'flex cursor-pointer items-center gap-2',
              IA_OPTION_LABEL_CLASS,
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="radio"
              name={name}
              className={IA_RADIO_CLASS}
              checked={value === v}
              disabled={disabled}
              onChange={() => onChange(v)}
            />
            {text}
          </label>
        ))}
      </div>
    </div>
  )
}

export function InitialAssessmentEquipmentSelectionPanel({ value, disabled, onChange }: Props) {
  const patch = (partial: Partial<EquipmentSelectionMetadata>) => onChange({ ...value, ...partial })

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-equipment-selection-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader
          title="Quick guide to equipment selection"
          subtitle="Pressure relieving / redistribution devices"
        />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:border-slate-700">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="equipment-selection-waterlow" className={IA_QUESTION_LABEL_CLASS}>
                Waterlow score (if known)
              </Label>
              <Input
                id="equipment-selection-waterlow"
                className="h-9 bg-background"
                disabled={disabled}
                value={value.waterlowScore ?? ''}
                onChange={(e) => patch({ waterlowScore: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="equipment-selection-risk" className={IA_QUESTION_LABEL_CLASS}>
                Selected risk level
              </Label>
              <Input
                id="equipment-selection-risk"
                className="h-9 bg-background"
                disabled={disabled}
                list="equipment-risk-levels"
                value={value.selectedRiskLevel ?? ''}
                onChange={(e) => patch({ selectedRiskLevel: e.target.value })}
              />
              <datalist id="equipment-risk-levels">
                {PRESSURE_RISK_EQUIPMENT_ROWS.map((row) => (
                  <option key={row.riskLevel} value={row.riskLevel} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="equipment-selection-equipment" className={IA_QUESTION_LABEL_CLASS}>
                Equipment selected / in use
              </Label>
              <Input
                id="equipment-selection-equipment"
                className="h-9 bg-background"
                disabled={disabled}
                value={value.selectedEquipment ?? ''}
                onChange={(e) => patch({ selectedEquipment: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <YesNoField
              name="equipment-selection-in-place"
              label="Is the recommended equipment already in place?"
              value={value.equipmentInPlace}
              disabled={disabled}
              onChange={(equipmentInPlace) => patch({ equipmentInPlace })}
            />
            <YesNoField
              name="equipment-selection-ot"
              label="OT / equipment referral required?"
              value={value.otReferralRequired}
              disabled={disabled}
              onChange={(otReferralRequired) => patch({ otReferralRequired })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="equipment-selection-notes" className={IA_QUESTION_LABEL_CLASS}>
              Notes
            </Label>
            <Textarea
              id="equipment-selection-notes"
              className={cn('min-h-[72px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
              disabled={disabled}
              value={value.notes ?? ''}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">
              Pressure relieving / redistribution devices
            </p>
            <HolisticAssessmentTable
              columns={[
                { key: 'risk', header: 'Risk level & score', className: 'w-[32%]' },
                { key: 'equipment', header: 'Recommended equipment', className: 'w-[68%]' },
              ]}
            >
              {PRESSURE_RISK_EQUIPMENT_ROWS.map((row) => (
                <HolisticAssessmentTableRow key={row.riskLevel}>
                  <HolisticAssessmentTableCell className="align-top font-medium text-sm">
                    {row.riskLevel}
                    <span className="mt-0.5 block font-normal text-muted-foreground">
                      ({row.scoreRange})
                    </span>
                  </HolisticAssessmentTableCell>
                  <HolisticAssessmentTableCell className="align-top text-sm">
                    {row.recommendedEquipment}
                  </HolisticAssessmentTableCell>
                </HolisticAssessmentTableRow>
              ))}
            </HolisticAssessmentTable>
          </div>

          <ul className={cn('list-disc space-y-2 pl-5 text-sm', IA_HINT_CLASS)}>
            {EQUIPMENT_SELECTION_ADVISORY_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>

          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Product guide</p>
            <HolisticAssessmentTable
              columns={[
                { key: 'product', header: 'Product', className: 'w-[24%]' },
                { key: 'information', header: 'Information', className: 'w-[38%]' },
                { key: 'indications', header: 'Indications for use', className: 'w-[38%]' },
              ]}
            >
              {EQUIPMENT_PRODUCT_GUIDE_ROWS.map((row) => (
                <HolisticAssessmentTableRow key={row.product}>
                  <HolisticAssessmentTableCell className="align-top font-medium text-sm">
                    {row.product}
                  </HolisticAssessmentTableCell>
                  <HolisticAssessmentTableCell className="align-top text-sm">
                    {row.information}
                  </HolisticAssessmentTableCell>
                  <HolisticAssessmentTableCell className="align-top text-sm">
                    {row.indicationsForUse}
                  </HolisticAssessmentTableCell>
                </HolisticAssessmentTableRow>
              ))}
            </HolisticAssessmentTable>
          </div>
        </div>
      </div>
    </div>
  )
}
