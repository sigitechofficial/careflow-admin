import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_SCHEDULE_FREQUENCIES } from '@/features/service-users/visit-plan/visit-plan-constants'
import { VisitPlanMonthlyDaySection } from '@/features/service-users/visit-plan/VisitPlanMonthlyDaySection'
import { VisitPlanWeeklyDaySection } from '@/features/service-users/visit-plan/VisitPlanWeeklyDaySection'
import type { VisitTaskSchedule } from '@/features/service-users/visit-tasks/visit-task-schedule.util'
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'

function repeatUnitForFrequency(
  freq: VisitTaskSchedule['scheduleFrequency'],
): VisitTaskSchedule['repeatUnit'] {
  if (freq === 'MONTHLY') return 'MONTHS'
  if (freq === 'WEEKLY') return 'WEEKS'
  return 'DAYS'
}

function repeatUnitLabel(freq: VisitTaskSchedule['scheduleFrequency']): string {
  if (freq === 'MONTHLY') return 'Months'
  if (freq === 'WEEKLY') return 'Weeks'
  return 'Days'
}

type Props = {
  /** Stable id for nested radio/button groups */
  scheduleKey: string
  schedule: VisitTaskSchedule
  disabled?: boolean
  /** Tighter spacing for add-task modal */
  compact?: boolean
  onChange: (patch: Partial<VisitTaskSchedule>) => void
}

/**
 * Shared frequency / repeat / weekday|monthly-day editor for visit tasks.
 * Used by Add Tasks modal and Tasks Planner (timeline + list).
 */
export function VisitTaskSchedulePanel({
  scheduleKey,
  schedule,
  disabled,
  compact = false,
  onChange,
}: Props) {
  const unitLabel = repeatUnitLabel(schedule.scheduleFrequency)

  const slotLike = {
    slotCode: scheduleKey,
    label: scheduleKey,
    daysOfWeek: schedule.daysOfWeek,
    plannedStartTime: '00:00',
    plannedEndTime: '00:00',
    requiredCarers: 1,
    isEnabled: true,
    medicationRoundCode: null,
    notes: '',
    sortOrder: 0,
    scheduleFrequency: schedule.scheduleFrequency,
    repeatEvery: schedule.repeatEvery,
    repeatUnit: schedule.repeatUnit,
    timeCritical: schedule.timeCritical,
    timeToleranceMinutes: schedule.timeToleranceMinutes,
    durationMinutes: null,
    notesRequired: false,
    photoAllowed: false,
    shareOutcomeWithFamily: false,
    analysisArea: null,
    monthlyDayMode: schedule.monthlyDayMode,
    monthlyDaysOfMonth: schedule.monthlyDaysOfMonth,
    monthlyPatternOrdinal: schedule.monthlyPatternOrdinal,
    monthlyPatternWeekday: schedule.monthlyPatternWeekday,
    linkedCarePlanFormIds: [],
    assignedEmployeeIds: [],
    slotKind: 'STANDARD' as const,
    nightDuty: 'NONE' as const,
    slotEffectiveFrom: null,
    slotEffectiveTo: null,
    oneOffDate: null,
    allowBackfillDays: 0,
    carerAssignments: [],
    exceptions: [],
  } satisfies VisitPlanSlot

  const patchFromSlot = (patch: Partial<VisitPlanSlot>) => {
    const next: Partial<VisitTaskSchedule> = {}
    if (patch.daysOfWeek !== undefined) next.daysOfWeek = patch.daysOfWeek
    if (patch.scheduleFrequency !== undefined) next.scheduleFrequency = patch.scheduleFrequency
    if (patch.repeatEvery !== undefined) next.repeatEvery = patch.repeatEvery
    if (patch.repeatUnit !== undefined) next.repeatUnit = patch.repeatUnit
    if (patch.monthlyDayMode !== undefined) next.monthlyDayMode = patch.monthlyDayMode
    if (patch.monthlyDaysOfMonth !== undefined) next.monthlyDaysOfMonth = patch.monthlyDaysOfMonth
    if (patch.monthlyPatternOrdinal !== undefined) {
      next.monthlyPatternOrdinal = patch.monthlyPatternOrdinal
    }
    if (patch.monthlyPatternWeekday !== undefined) {
      next.monthlyPatternWeekday = patch.monthlyPatternWeekday
    }
    if (Object.keys(next).length > 0) onChange(next)
  }

  return (
    <div className={cn('space-y-3', compact && 'space-y-2.5')}>
      <div className={cn('grid gap-3 sm:grid-cols-2', compact && 'gap-2.5')}>
        <div>
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            How often? <span className="text-red-600">*</span>
          </Label>
          <Select
            value={schedule.scheduleFrequency}
            disabled={disabled}
            onValueChange={(v) => {
              const scheduleFrequency = v as VisitTaskSchedule['scheduleFrequency']
              onChange({
                scheduleFrequency,
                repeatUnit: repeatUnitForFrequency(scheduleFrequency),
              })
            }}
          >
            <SelectTrigger className={cn('mt-1 w-full', compact && 'h-9 rounded-lg text-sm')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIT_PLAN_SCHEDULE_FREQUENCIES.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Repeat every <span className="text-red-600">*</span>
          </Label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={365}
              disabled={disabled}
              value={schedule.repeatEvery}
              onChange={(e) => onChange({ repeatEvery: Number(e.target.value) || 1 })}
              className={cn('w-20', compact && 'h-9 rounded-lg')}
            />
            <span className="text-xs text-muted-foreground sm:text-sm">{unitLabel}</span>
          </div>
        </div>
      </div>

      {schedule.scheduleFrequency === 'MONTHLY' ? (
        <VisitPlanMonthlyDaySection slot={slotLike} disabled={disabled} onChange={patchFromSlot} />
      ) : schedule.scheduleFrequency === 'WEEKLY' ? (
        <VisitPlanWeeklyDaySection
          slot={slotLike}
          variant="weekly"
          disabled={disabled}
          onChange={patchFromSlot}
        />
      ) : (
        <VisitPlanWeeklyDaySection
          slot={slotLike}
          variant="daily"
          disabled={disabled}
          onChange={patchFromSlot}
        />
      )}

      <div className={cn('grid gap-3 sm:grid-cols-2', compact && 'gap-2.5')}>
        <div>
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Time-sensitive task
          </Label>
          <p className="mb-1.5 text-[11px] text-muted-foreground">
            Must be done at the visit time. The rota flags early, delayed, or missed.
          </p>
          <NoYesToggle
            value={schedule.timeCritical}
            onChange={(timeCritical) => onChange({ timeCritical })}
            disabled={disabled}
            activeTone="success"
          />
        </div>
        {schedule.timeCritical ? (
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Time tolerance (minutes)
            </Label>
            <Input
              type="number"
              min={0}
              max={240}
              disabled={disabled}
              value={schedule.timeToleranceMinutes}
              onChange={(e) => onChange({ timeToleranceMinutes: Number(e.target.value) || 0 })}
              className={cn('mt-1 w-24', compact && 'h-9 rounded-lg')}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
