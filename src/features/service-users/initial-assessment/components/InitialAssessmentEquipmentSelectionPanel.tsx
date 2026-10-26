import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { InitialAssessmentYesNoCardField } from '@/features/service-users/initial-assessment/components/InitialAssessmentYesNoCardField'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import {
  EQUIPMENT_PRODUCT_GUIDE_ROWS,
  EQUIPMENT_SELECTION_ADVISORY_NOTES,
} from '@/features/service-users/initial-assessment/utils/equipment-selection-guide'
import {
  computeWaterlowScore,
  WATERLOW_EQUIPMENT_CATALOG,
  waterlowBand,
  type WaterlowMetadata,
} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'
import type { EquipmentSelectionMetadata } from '@/features/service-users/initial-assessment/utils/equipment-selection'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_HINT_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_SECTION_BODY_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { cn } from '@/shared/lib/utils'

type Props = {
  value: EquipmentSelectionMetadata
  waterlow?: WaterlowMetadata
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
    <InitialAssessmentYesNoCardField
      name={name}
      label={label}
      value={value ?? null}
      disabled={disabled}
      onChange={onChange}
    />
  )
}

export function InitialAssessmentEquipmentSelectionPanel({ value, waterlow, disabled, onChange }: Props) {
  const patch = (partial: Partial<EquipmentSelectionMetadata>) => onChange({ ...value, ...partial })
  // The Waterlow tab is the only master for the score and band — shown here read-only.
  const waterlowScore = computeWaterlowScore(waterlow)
  const band = waterlowBand(waterlowScore)
  const currentCatalogRow = WATERLOW_EQUIPMENT_CATALOG.find((row) => band.label.startsWith(row.riskLevel))

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-equipment-selection-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader
          title="Quick guide to equipment selection"
          subtitle="Pressure relieving / redistribution devices"
        />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2" data-testid="ia-equipment-waterlow-readonly">
              <p className={IA_QUESTION_LABEL_CLASS}>Waterlow score and risk band</p>
              {waterlowScore > 0 ? (
                <p className="text-sm">
                  <span className={cn('rounded px-2 py-0.5 font-medium', band.className)}>
                    {waterlowScore} — {band.label}
                  </span>
                  <span className={cn('ml-2', IA_HINT_CLASS)}>From the Waterlow tab (read-only)</span>
                </p>
              ) : (
                <p className={IA_HINT_CLASS}>
                  Not scored yet — complete the Waterlow tab; the score and band appear here automatically.
                </p>
              )}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="equipment-selection-equipment" className={IA_QUESTION_LABEL_CLASS}>
                Pressure-relieving equipment selected for me / that I use
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
              label="Is the equipment recommended for me already in place?"
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
                { key: 'risk', header: 'Waterlow band & score', className: 'w-[32%]' },
                { key: 'equipment', header: 'Equipment to consider', className: 'w-[68%]' },
              ]}
            >
              {WATERLOW_EQUIPMENT_CATALOG.map((row) => {
                const current = waterlowScore > 0 && row.riskLevel === currentCatalogRow?.riskLevel
                return (
                  <HolisticAssessmentTableRow
                    key={row.riskLevel}
                    className={current ? 'bg-amber-50/70 dark:bg-amber-950/30' : undefined}
                  >
                    <HolisticAssessmentTableCell className="align-top font-medium text-sm">
                      {row.riskLevel}
                      <span className="mt-0.5 block font-normal text-muted-foreground">
                        ({row.scoreRange}){current ? ' — this person' : ''}
                      </span>
                    </HolisticAssessmentTableCell>
                    <HolisticAssessmentTableCell className="align-top text-sm">
                      {row.products.join(' · ')}
                    </HolisticAssessmentTableCell>
                  </HolisticAssessmentTableRow>
                )
              })}
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
