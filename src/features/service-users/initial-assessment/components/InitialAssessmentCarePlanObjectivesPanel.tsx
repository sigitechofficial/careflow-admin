import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import {
  HOLISTIC_SECTION_SHELL_CLASS,
  HOLISTIC_TABLE_CELL_CLASS,
  HOLISTIC_TABLE_CLASS,
  HOLISTIC_TABLE_HEAD_CLASS,
} from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  CARE_PLAN_EQUIPMENT_ROWS,
  CARE_PLAN_PLAN_SUBTITLE,
  CARE_PLAN_VISIT_SECTIONS,
  type CarePlanEquipmentId,
  type CarePlanEquipmentRow,
  type CarePlanObjectivesMetadata,
  type CarePlanProfessionalVisitBlock,
  type CarePlanTaskBlock,
  type CarePlanVisitId,
} from '@/features/service-users/initial-assessment/utils/care-plan-objectives'
import {
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_SECTION_BODY_CLASS,
  IA_SUBSECTION_PANEL_HEADER_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  value: CarePlanObjectivesMetadata
  disabled?: boolean
  onChange: (next: CarePlanObjectivesMetadata) => void
}

function TaskBlockFields({
  prefix,
  block,
  disabled,
  onChange,
  embedded,
}: {
  prefix: string
  block: CarePlanTaskBlock
  disabled?: boolean
  onChange: (next: CarePlanTaskBlock) => void
  embedded?: boolean
}) {
  const fields: { key: keyof CarePlanTaskBlock; label: string; minHeight: string }[] = [
    { key: 'agreedTask', label: 'Agreed Task', minHeight: 'min-h-[100px]' },
    { key: 'objectives', label: 'Objectives', minHeight: 'min-h-[80px]' },
    { key: 'outcomes', label: 'Outcomes', minHeight: 'min-h-[80px]' },
  ]

  return (
    <div className={cn('space-y-4', !embedded && 'p-4')}>
      {fields.map((field) => (
        <div key={field.key}>
          <Label htmlFor={`${prefix}-${field.key}`} className={IA_QUESTION_LABEL_CLASS}>
            {field.label}
          </Label>
          <Textarea
            id={`${prefix}-${field.key}`}
            className={cn('mt-1', field.minHeight, IA_FORM_TEXTAREA_COMPACT_CLASS)}
            disabled={disabled}
            value={block[field.key] ?? ''}
            onChange={(e) => onChange({ ...block, [field.key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  )
}

export function InitialAssessmentCarePlanObjectivesPanel({ value, disabled, onChange }: Props) {
  const patchVisit = (visitId: CarePlanVisitId, block: CarePlanTaskBlock) =>
    onChange({
      ...value,
      visits: { ...value.visits, [visitId]: block },
    })

  const patchEquipment = (equipmentId: CarePlanEquipmentId, row: CarePlanEquipmentRow) =>
    onChange({
      ...value,
      equipment: { ...value.equipment, [equipmentId]: row },
    })

  const dateValue = (iso?: string) => iso?.slice(0, 10) ?? ''
  const setEquipmentDate = (
    equipmentId: CarePlanEquipmentId,
    key: 'lastServiceDate' | 'nextServiceDate',
    raw: string,
  ) => {
    const existing = value.equipment?.[equipmentId] ?? {}
    patchEquipment(equipmentId, {
      ...existing,
      [key]: raw ? `${raw}T00:00:00.000Z` : undefined,
    })
  }

  return (
    <div className={cn(IA_SECTION_BODY_CLASS, 'space-y-6')} data-testid="ia-care-plan-objectives-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader
          title="Personalised Care/Support Plan"
          subtitle={CARE_PLAN_PLAN_SUBTITLE}
        />

        <div className="space-y-4 border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          {CARE_PLAN_VISIT_SECTIONS.map((section) => (
            <section
              key={section.id}
              className="overflow-hidden rounded-sm border border-slate-300 dark:border-slate-600"
            >
              <div className={IA_SUBSECTION_PANEL_HEADER_CLASS}>
                <h4 className="text-sm font-semibold text-foreground">
                  {section.title} {section.instruction}
                </h4>
              </div>
              <TaskBlockFields
                prefix={`care-plan-${section.id}`}
                block={value.visits?.[section.id] ?? {}}
                disabled={disabled}
                onChange={(block) => patchVisit(section.id, block)}
              />
            </section>
          ))}
        </div>
      </div>

      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <div className="space-y-4 border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          <section className="overflow-hidden rounded-sm border border-slate-300 dark:border-slate-600">
            <div className={IA_SUBSECTION_PANEL_HEADER_CLASS}>
              <h4 className="text-sm font-semibold text-foreground">
                Professional intervention outcome
              </h4>
            </div>
            <div className="divide-y divide-border/60">
              <TaskBlockFields
                prefix="care-plan-professional-outcome"
                block={value.professionalInterventionOutcome ?? {}}
                disabled={disabled}
                onChange={(block) =>
                  onChange({ ...value, professionalInterventionOutcome: block })
                }
              />
              <div className="space-y-4 p-4">
                <div>
                  <Label
                    htmlFor="care-plan-which-professional-visit"
                    className={IA_QUESTION_LABEL_CLASS}
                  >
                    Which professional visit?
                  </Label>
                  <Textarea
                    id="care-plan-which-professional-visit"
                    className={cn('mt-1 min-h-[64px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                    disabled={disabled}
                    value={value.professionalVisit?.whichProfessionalVisit ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        professionalVisit: {
                          ...value.professionalVisit,
                          whichProfessionalVisit: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <TaskBlockFields
                  prefix="care-plan-professional-visit"
                  block={value.professionalVisit ?? {}}
                  disabled={disabled}
                  embedded
                  onChange={(block: CarePlanProfessionalVisitBlock) =>
                    onChange({
                      ...value,
                      professionalVisit: {
                        ...value.professionalVisit,
                        ...block,
                      },
                    })
                  }
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-sm border border-slate-300 dark:border-slate-600">
            <HolisticSectionHeader
              title="Handling Equipment in uses"
              className="rounded-none border-0"
            />
            <div className="overflow-x-auto p-4 pt-0">
              <table className={cn(HOLISTIC_TABLE_CLASS, 'min-w-[48rem]')}>
                <thead>
                  <tr>
                    <th className={cn(HOLISTIC_TABLE_HEAD_CLASS, 'w-[34%]')}>Equipment in use</th>
                    <th className={HOLISTIC_TABLE_HEAD_CLASS}>Make/Model</th>
                    <th className={HOLISTIC_TABLE_HEAD_CLASS}>Last Service Date</th>
                    <th className={HOLISTIC_TABLE_HEAD_CLASS}>Next service Date</th>
                  </tr>
                </thead>
                <tbody>
                  {CARE_PLAN_EQUIPMENT_ROWS.map((row) => {
                    const equipment = value.equipment?.[row.id] ?? {}
                    return (
                      <tr key={row.id}>
                        <td className={cn(HOLISTIC_TABLE_CELL_CLASS, 'text-sm font-medium')}>
                          {row.label}
                        </td>
                        <td className={HOLISTIC_TABLE_CELL_CLASS}>
                          <Input
                            className="h-9 w-full text-sm"
                            disabled={disabled}
                            value={equipment.makeModel ?? ''}
                            onChange={(e) =>
                              patchEquipment(row.id, { ...equipment, makeModel: e.target.value })
                            }
                          />
                        </td>
                        <td className={HOLISTIC_TABLE_CELL_CLASS}>
                          <Input
                            type="date"
                            className="h-9 w-full min-w-[9rem] text-sm"
                            disabled={disabled}
                            value={dateValue(equipment.lastServiceDate)}
                            onChange={(e) =>
                              setEquipmentDate(row.id, 'lastServiceDate', e.target.value)
                            }
                          />
                        </td>
                        <td className={HOLISTIC_TABLE_CELL_CLASS}>
                          <Input
                            type="date"
                            className="h-9 w-full min-w-[9rem] text-sm"
                            disabled={disabled}
                            value={dateValue(equipment.nextServiceDate)}
                            onChange={(e) =>
                              setEquipmentDate(row.id, 'nextServiceDate', e.target.value)
                            }
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-sm border border-slate-300 dark:border-slate-600">
            <HolisticSectionHeader
              title="Other Equipment required (If applicable)"
              className="rounded-none border-0"
            />
            <div className="p-4 pt-0">
              <Textarea
                id="care-plan-other-equipment"
                className={cn('min-h-[160px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                disabled={disabled}
                value={value.otherEquipmentRequired ?? ''}
                onChange={(e) => onChange({ ...value, otherEquipmentRequired: e.target.value })}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
