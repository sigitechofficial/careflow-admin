import * as React from 'react'
import { Button } from '@/shared/ui/button'
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
  type CarePlanEquipmentSource,
  type CarePlanObjectivesMetadata,
  type CarePlanProfessionalVisitBlock,
  type CarePlanTaskBlock,
  type CarePlanVisitId,
} from '@/features/service-users/initial-assessment/utils/care-plan-objectives'
import {
  IA_CHECKBOX_CLASS,
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_HINT_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_SECTION_BODY_CLASS,
  IA_SUBSECTION_PANEL_HEADER_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { holisticTabRef } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'

type Props = {
  value: CarePlanObjectivesMetadata
  disabled?: boolean
  onChange: (next: CarePlanObjectivesMetadata) => void
  /** Visits chosen in Tab 2 "Preferred visit times" (null / omitted = all). */
  visitIds?: CarePlanVisitId[] | null
  /** Equipment already recorded elsewhere in the assessment (see `detectCarePlanEquipmentInUse`). */
  detectedEquipment?: Partial<Record<CarePlanEquipmentId, CarePlanEquipmentSource[]>>
  /** Servicing answered on the equipment checklist (read-only here). */
  servicing?: { hoistServiced?: boolean | null; profilingBedServiced?: boolean | null }
  /** Agreed goals (final tab) a visit can be linked to. */
  goals?: CarePlanGoalOption[]
}

const EQUIPMENT_SOURCE_LABEL: Record<CarePlanEquipmentSource, string> = {
  movingHandling: `Moving & Handling (${holisticTabRef(9)})`,
  mobilityAids: `Mobility aids (${holisticTabRef(1)})`,
  dailyLivingAids: `Daily living aids (${holisticTabRef(1)})`,
}

function servicingText(v: boolean | null | undefined): string {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return 'Not recorded'
}

const hasText = (v?: string) => Boolean(v?.replace(/<[^>]*>/g, '').trim())
const blockHasText = (b?: CarePlanTaskBlock) => Boolean(b && (hasText(b.agreedTask) || hasText(b.objectives) || hasText(b.outcomes)))

export type CarePlanGoalOption = { id: string; label: string }

function TaskBlockFields({
  prefix,
  block,
  disabled,
  onChange,
  embedded,
  goals,
}: {
  prefix: string
  block: CarePlanTaskBlock
  disabled?: boolean
  onChange: (next: CarePlanTaskBlock) => void
  embedded?: boolean
  goals: CarePlanGoalOption[]
}) {
  const fields: { key: 'agreedTask' | 'objectives' | 'outcomes'; label: string; minHeight: string }[] = [
    { key: 'agreedTask', label: 'The support I need at this visit (step by step)', minHeight: 'min-h-[100px]' },
    { key: 'objectives', label: 'What I want this visit to achieve', minHeight: 'min-h-[80px]' },
    // Outcomes are the agreed goals now; old free text stays visible where it was written.
    ...(hasText(block.outcomes)
      ? [{ key: 'outcomes' as const, label: 'Outcomes (earlier notes)', minHeight: 'min-h-[80px]' }]
      : []),
  ]
  const linked = new Set(block.goalIds ?? [])
  const toggleGoal = (id: string, on: boolean) =>
    onChange({
      ...block,
      goalIds: goals.map((g) => g.id).filter((gid) => (gid === id ? on : linked.has(gid))),
    })

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
      <fieldset data-testid={`${prefix}-goals`}>
        <legend className={IA_QUESTION_LABEL_CLASS}>Which of my goals does this support?</legend>
        {goals.length ? (
          <div className="mt-1 space-y-1.5">
            {goals.map((goal) => (
              <label key={goal.id} className={cn('flex items-start gap-2.5 text-[13px]', IA_OPTION_LABEL_CLASS)}>
                <input
                  type="checkbox"
                  className={cn(IA_CHECKBOX_CLASS, 'mt-0.5')}
                  disabled={disabled}
                  checked={linked.has(goal.id)}
                  onChange={(e) => toggleGoal(goal.id, e.target.checked)}
                />
                {goal.label}
              </label>
            ))}
          </div>
        ) : (
          <p className={cn('mt-1 text-sm', IA_HINT_CLASS)}>Add the person&apos;s goals in Agreed goals above first.</p>
        )}
      </fieldset>
    </div>
  )
}

export function InitialAssessmentCarePlanObjectivesPanel({
  value,
  disabled,
  onChange,
  visitIds,
  detectedEquipment = {},
  servicing,
  goals = [],
}: Props) {
  const [addedVisits, setAddedVisits] = React.useState<CarePlanVisitId[]>([])
  const shownVisits = CARE_PLAN_VISIT_SECTIONS.filter(
    (section) => !visitIds || visitIds.includes(section.id) || addedVisits.includes(section.id),
  )
  const hiddenVisits = CARE_PLAN_VISIT_SECTIONS.filter((section) => !shownVisits.includes(section))
  // The old separate "Professional intervention outcome" block is kept only where it already holds data.
  const showLegacyProfessionalOutcome = blockHasText(value.professionalInterventionOutcome)
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

  // Only equipment found elsewhere in the IA, or already added here, is listed.
  const shownEquipment = CARE_PLAN_EQUIPMENT_ROWS.filter(
    (row) => Boolean(detectedEquipment[row.id]?.length) || Boolean(value.equipment && row.id in value.equipment),
  )
  const hiddenEquipment = CARE_PLAN_EQUIPMENT_ROWS.filter((row) => !shownEquipment.includes(row))
  const removeEquipment = (equipmentId: CarePlanEquipmentId) => {
    const next = { ...value.equipment }
    delete next[equipmentId]
    onChange({ ...value, equipment: next })
  }
  const servicingFor = (equipmentId: CarePlanEquipmentId) =>
    equipmentId === 'hoistSling'
      ? servicingText(servicing?.hoistServiced)
      : equipmentId === 'profilingBed'
        ? servicingText(servicing?.profilingBedServiced)
        : null

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
          title="My Care and Support Plan"
          subtitle={CARE_PLAN_PLAN_SUBTITLE}
        />

        <div className="space-y-4 border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          {visitIds ? (
            <p className="text-xs text-muted-foreground" data-testid="ia-care-plan-visits-hint">
              Showing the visits chosen in Preferred visit times (Personal Details). Add another visit below if
              needed.
            </p>
          ) : null}
          {shownVisits.map((section) => (
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
                goals={goals}
                onChange={(block) => patchVisit(section.id, block)}
              />
            </section>
          ))}
          {!disabled && hiddenVisits.length ? (
            <div className="flex flex-wrap gap-2" data-testid="ia-care-plan-add-visit">
              {hiddenVisits.map((section) => (
                <Button
                  key={section.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAddedVisits((prev) => [...prev, section.id])}
                >
                  + Add {section.title.toLowerCase()}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <div className="space-y-4 border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          <section className="overflow-hidden rounded-sm border border-slate-300 dark:border-slate-600">
            <div className={IA_SUBSECTION_PANEL_HEADER_CLASS}>
              <h4 className="text-sm font-semibold text-foreground">Professionals who visit me</h4>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <Label htmlFor="care-plan-which-professional-visit" className={IA_QUESTION_LABEL_CLASS}>
                  Which professionals visit me, and what for? (e.g. district nurse for dressings, OT)
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
                goals={goals}
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
            {showLegacyProfessionalOutcome ? (
              <div className="border-t border-border/60">
                <p className="px-4 pt-3 text-xs font-medium text-muted-foreground">
                  Professional intervention outcome (recorded earlier)
                </p>
                <TaskBlockFields
                  prefix="care-plan-professional-outcome"
                  block={value.professionalInterventionOutcome ?? {}}
                  disabled={disabled}
                  goals={goals}
                  onChange={(block) => onChange({ ...value, professionalInterventionOutcome: block })}
                />
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-sm border border-slate-300 dark:border-slate-600">
            <HolisticSectionHeader
              title="Handling equipment I use"
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
                  {shownEquipment.map((row) => {
                    const equipment = value.equipment?.[row.id] ?? {}
                    const sources = detectedEquipment[row.id] ?? []
                    const serviced = servicingFor(row.id)
                    return (
                      <tr key={row.id} data-testid={`ia-care-plan-equipment-${row.id}`}>
                        <td className={cn(HOLISTIC_TABLE_CELL_CLASS, 'text-sm')}>
                          <div className="font-medium">{row.label}</div>
                          {sources.length ? (
                            <div className="text-xs text-muted-foreground">
                              From {sources.map((src) => EQUIPMENT_SOURCE_LABEL[src]).join(', ')}
                            </div>
                          ) : !disabled ? (
                            <button
                              type="button"
                              className="text-xs text-muted-foreground underline hover:text-foreground"
                              onClick={() => removeEquipment(row.id)}
                            >
                              Remove
                            </button>
                          ) : null}
                          {serviced ? (
                            <div className="text-xs text-muted-foreground">
                              Serviced (equipment checklist, {holisticTabRef(6)}): {serviced}
                            </div>
                          ) : null}
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
                  {shownEquipment.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={cn(HOLISTIC_TABLE_CELL_CLASS, 'text-sm text-muted-foreground')}>
                        No equipment recorded in this assessment. Add any equipment in use below.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              {!disabled && hiddenEquipment.length ? (
                <div className="mt-3 flex flex-wrap gap-2" data-testid="ia-care-plan-add-equipment">
                  {hiddenEquipment.map((row) => (
                    <Button
                      key={row.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => patchEquipment(row.id, {})}
                    >
                      + {row.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-sm border border-slate-300 dark:border-slate-600">
            <HolisticSectionHeader
              title="Other equipment I need (if applicable)"
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
