import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  MOVING_HANDLING_FOOTER_NOTES,
  MOVING_HANDLING_LOW_RISK_NOTE,
  MOVING_HANDLING_RISK_FILTER_QUESTIONS,
  MOVING_HANDLING_TASK_DEFINITIONS,
  movingHandlingRiskFilterValue,
  movingHandlingTaskRow,
  toggleMovingHandlingMethod,
  type BathType,
  type MovingHandlingCapability,
  type MovingHandlingOperationsMetadata,
  type MovingHandlingRiskFilter,
  type MovingHandlingTaskId,
  type MovingHandlingTaskRow,
} from '@/features/service-users/initial-assessment/utils/moving-handling-operations'
import {
  IA_HINT_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_RADIO_CLASS,
  IA_SECTION_BODY_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  value: MovingHandlingOperationsMetadata
  disabled?: boolean
  onChange: (next: MovingHandlingOperationsMetadata) => void
}

const CAPABILITY_OPTIONS: { id: MovingHandlingCapability; label: string }[] = [
  { id: 'independent', label: 'I do this myself' },
  { id: 'supervision', label: 'I need someone to supervise me' },
  { id: 'assistance', label: 'I need help with this' },
]

function YesNoTableCell({
  name,
  selected,
  column,
  disabled,
  ariaLabel,
  onSelect,
}: {
  name: string
  selected: boolean | null | undefined
  column: 'yes' | 'no'
  disabled?: boolean
  ariaLabel: string
  onSelect: (value: boolean) => void
}) {
  const checked = column === 'yes' ? selected === true : selected === false

  return (
    <HolisticAssessmentTableCell className="w-16 text-center align-middle">
      <label
        className={cn(
          'inline-flex cursor-pointer items-center justify-center',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <input
          type="radio"
          name={name}
          className={IA_RADIO_CLASS}
          checked={checked}
          disabled={disabled}
          aria-label={`${ariaLabel} — ${column === 'yes' ? 'Yes' : 'No'}`}
          onChange={() => onSelect(column === 'yes')}
        />
      </label>
    </HolisticAssessmentTableCell>
  )
}

export function InitialAssessmentMovingHandlingOperationsPanel({
  value,
  disabled,
  onChange,
}: Props) {
  const patchRisk = (partial: Partial<MovingHandlingRiskFilter>) => {
    onChange({ ...value, riskFilter: { ...value.riskFilter, ...partial } })
  }

  const patchTask = (taskId: MovingHandlingTaskId, partial: Partial<MovingHandlingTaskRow>) => {
    onChange({
      ...value,
      tasks: {
        ...value.tasks,
        [taskId]: { ...movingHandlingTaskRow(value, taskId), ...partial },
      },
    })
  }

  const lowRisk = value.riskFilter?.totallyIndependentLowRisk === true

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-moving-handling-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="Moving and handling operations — Client risk filter" />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          <section className="space-y-3">
            <p className={cn('text-sm font-medium text-foreground', IA_HINT_CLASS)}>
              Please circle/tick the appropriate score and wording
            </p>
            <HolisticAssessmentTable
              columns={[
                { key: 'question', header: 'Risk screening', className: 'w-[75%]' },
                { key: 'yes', header: 'Yes', className: 'w-[12.5%] text-center' },
                { key: 'no', header: 'No', className: 'w-[12.5%] text-center' },
              ]}
            >
              {MOVING_HANDLING_RISK_FILTER_QUESTIONS.map((q) => {
                const answer = movingHandlingRiskFilterValue(value, q.id)
                const name = `mh-risk-${q.id}`

                return (
                  <HolisticAssessmentTableRow key={q.id}>
                    <HolisticAssessmentTableCell className="align-top text-sm">
                      {q.label}
                    </HolisticAssessmentTableCell>
                    <YesNoTableCell
                      name={name}
                      selected={answer}
                      column="yes"
                      disabled={disabled}
                      ariaLabel={q.label}
                      onSelect={(v) => patchRisk({ [q.id]: v })}
                    />
                    <YesNoTableCell
                      name={name}
                      selected={answer}
                      column="no"
                      disabled={disabled}
                      ariaLabel={q.label}
                      onSelect={(v) => patchRisk({ [q.id]: v })}
                    />
                  </HolisticAssessmentTableRow>
                )
              })}
            </HolisticAssessmentTable>

            <label
              className={cn(
                'flex cursor-pointer items-start gap-2 rounded-sm border border-slate-300 p-3 text-sm dark:border-slate-600',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={lowRisk}
                disabled={disabled}
                onChange={(e) =>
                  patchRisk({
                    totallyIndependentLowRisk: e.target.checked ? true : null,
                  })
                }
              />
              <span>{MOVING_HANDLING_LOW_RISK_NOTE}</span>
            </label>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              Please tick <strong>one</strong> option only for what I can do and the method or
              handling aids below.
            </p>
            <HolisticAssessmentTable
              columns={[
                { key: 'task', header: 'Task', className: 'w-[22%]' },
                {
                  key: 'capability',
                  header: 'What I can do (tick as appropriate)',
                  className: 'w-[34%]',
                },
                {
                  key: 'methods',
                  header: 'Method/handling aids/additional information (tick as appropriate)',
                  className: 'w-[44%]',
                },
              ]}
            >
              {MOVING_HANDLING_TASK_DEFINITIONS.map((task) => {
                const row = movingHandlingTaskRow(value, task.id)
                const taskDisabled = disabled || lowRisk

                return (
                  <HolisticAssessmentTableRow key={task.id}>
                    <HolisticAssessmentTableCell className="align-top text-sm font-medium">
                      {task.label}
                    </HolisticAssessmentTableCell>
                    <HolisticAssessmentTableCell className="align-top text-sm">
                      <CapabilityCell
                        taskId={task.id}
                        capability={row.capability}
                        staffCount={row.staffCount}
                        disabled={taskDisabled}
                        onCapabilityChange={(capability) => patchTask(task.id, { capability })}
                        onStaffCountChange={(staffCount) => patchTask(task.id, { staffCount })}
                      />
                    </HolisticAssessmentTableCell>
                    <HolisticAssessmentTableCell className="align-top text-sm">
                      <MethodsCell
                        taskId={task.id}
                        methods={row.methods}
                        bathType={row.bathType}
                        methodOptions={task.methods}
                        showBathType={task.bathTypeOptions}
                        disabled={taskDisabled}
                        onMethodToggle={(methodId, checked) =>
                          patchTask(task.id, {
                            methods: toggleMovingHandlingMethod(row.methods, methodId, checked),
                          })
                        }
                        onBathTypeChange={(bathType) => patchTask(task.id, { bathType })}
                      />
                    </HolisticAssessmentTableCell>
                  </HolisticAssessmentTableRow>
                )
              })}
            </HolisticAssessmentTable>
          </section>

          <section className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            {MOVING_HANDLING_FOOTER_NOTES.map((note) => (
              <p key={note} className="text-sm font-semibold text-foreground">
                {note}
              </p>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}

function CapabilityCell({
  taskId,
  capability,
  staffCount,
  disabled,
  onCapabilityChange,
  onStaffCountChange,
}: {
  taskId: MovingHandlingTaskId
  capability?: MovingHandlingCapability | null
  staffCount?: number | null
  disabled?: boolean
  onCapabilityChange: (value: MovingHandlingCapability) => void
  onStaffCountChange: (value: number | null) => void
}) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label={`${taskId} client capability`}>
      {CAPABILITY_OPTIONS.map((opt) => (
        <label
          key={opt.id}
          className={cn(
            'flex cursor-pointer items-center gap-2',
            IA_OPTION_LABEL_CLASS,
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <input
            type="radio"
            name={`mh-capability-${taskId}`}
            className={IA_RADIO_CLASS}
            checked={capability === opt.id}
            disabled={disabled}
            onChange={() => onCapabilityChange(opt.id)}
          />
          {opt.label}
        </label>
      ))}
      <label className={cn('flex items-center gap-2', IA_OPTION_LABEL_CLASS)}>
        <span className="shrink-0">Number of Care Professionals I need</span>
        <Input
          type="number"
          min={0}
          max={9}
          step={1}
          inputMode="numeric"
          className="h-9 w-16 text-center font-mono text-sm tabular-nums"
          disabled={disabled}
          value={staffCount != null ? String(staffCount) : ''}
          onChange={(e) => {
            const raw = e.target.value.trim()
            if (!raw) {
              onStaffCountChange(null)
              return
            }
            const n = Number(raw)
            onStaffCountChange(Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null)
          }}
        />
      </label>
    </div>
  )
}

function MethodsCell({
  taskId,
  methods,
  bathType,
  methodOptions,
  showBathType,
  disabled,
  onMethodToggle,
  onBathTypeChange,
}: {
  taskId: MovingHandlingTaskId
  methods?: string[]
  bathType?: BathType | null
  methodOptions: ReadonlyArray<{ id: string; label: string }>
  showBathType?: boolean
  disabled?: boolean
  onMethodToggle: (methodId: string, checked: boolean) => void
  onBathTypeChange: (value: BathType) => void
}) {
  const selected = new Set(methods ?? [])

  return (
    <div className="space-y-2">
      {methodOptions.map((opt) => (
        <label
          key={opt.id}
          className={cn(
            'flex cursor-pointer items-center gap-2',
            IA_OPTION_LABEL_CLASS,
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <input
            type="checkbox"
            disabled={disabled}
            checked={selected.has(opt.id)}
            onChange={(e) => onMethodToggle(opt.id, e.target.checked)}
          />
          {opt.label}
        </label>
      ))}
      {showBathType ? (
        <div className="space-y-1 border-t border-border/60 pt-2">
          <p className="text-xs font-medium text-muted-foreground">Which bath do I use?</p>
          {(
            [
              { id: 'standard' as const, label: 'Standard' },
              { id: 'assisted' as const, label: 'Assisted' },
            ] as const
          ).map((opt) => (
            <label
              key={opt.id}
              className={cn(
                'flex cursor-pointer items-center gap-2',
                IA_OPTION_LABEL_CLASS,
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                type="radio"
                name={`mh-bath-type-${taskId}`}
                className={IA_RADIO_CLASS}
                disabled={disabled}
                checked={bathType === opt.id}
                onChange={() => onBathTypeChange(opt.id)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  )
}
