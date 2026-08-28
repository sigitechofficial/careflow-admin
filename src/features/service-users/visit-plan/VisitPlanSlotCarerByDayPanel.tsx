import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { MultiSelect } from '@/shared/ui/multi-select'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { UserPlus } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import {
  contentBodyClass,
  contentHelperClass,
  contentOverlineClass,
  contentTitleClass,
} from '@/shared/ui/content-section'
import type { VisitPlanSlot, VisitPlanSlotCarerAssignment } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import { normalizeTimeForInput } from '@/features/service-users/visit-plan/visit-plan-time.util'
import { VisitPlanCarersCountInput } from '@/features/service-users/visit-plan/VisitPlanCarersCountInput'
import {
  type CarerAssignmentGroup,
  type CarerAssignmentGroupCarer,
  ALL_WEEKDAYS_SELECT_LABEL,
  ALL_WEEKDAYS_SELECT_VALUE,
  carerAssignmentDisplayDurationMinutes,
  groupCarerAssignments,
  isAllWeekdaysSelected,
  normalizeCarerByDaySelection,
  parseCarerAssignmentDurationInput,
  removeCarer,
  removeGroup,
  replaceCarerField,
  replaceGroupDays,
  replaceGroupField,
  selectedDayValuesForGroup,
  slotDefaultDurationMinutes,
} from '@/features/service-users/visit-plan/visit-plan-carer-by-day.util'

const DAY_OPTIONS = [
  { value: ALL_WEEKDAYS_SELECT_VALUE, label: ALL_WEEKDAYS_SELECT_LABEL },
  ...VISIT_PLAN_DAY_LABELS.map((label, dayOfWeek) => ({
    value: String(dayOfWeek),
    label,
  })),
]

type Props = {
  slot: VisitPlanSlot
  disabled?: boolean
  onChange: (assignments: VisitPlanSlotCarerAssignment[]) => void
  onOpenAssign: (group: CarerAssignmentGroup | null) => void
}

export function VisitPlanSlotCarerByDayPanel({
  slot,
  disabled,
  onChange,
  onOpenAssign,
}: Props) {
  const employeeIds = slot.carerAssignments.map((a) => a.employeeId)
  const nameById = useEmployeeNameMap(employeeIds)
  const groups = groupCarerAssignments(slot.carerAssignments)
  const slotDefaultDuration = slotDefaultDurationMinutes(slot)
  const slotStartHm = normalizeTimeForInput(slot.plannedStartTime)
  const slotEndHm = normalizeTimeForInput(slot.plannedEndTime)
  const [editingDurationKey, setEditingDurationKey] = React.useState<string | null>(null)
  const [draftDuration, setDraftDuration] = React.useState('')
  const [flashGroupId, setFlashGroupId] = React.useState<string | null>(null)
  const flashClearRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (flashClearRef.current != null) window.clearTimeout(flashClearRef.current)
    }
  }, [])

  const flashNewRow = React.useCallback((groupId: string) => {
    if (flashClearRef.current != null) window.clearTimeout(flashClearRef.current)
    setFlashGroupId(groupId)
    flashClearRef.current = window.setTimeout(() => {
      setFlashGroupId(null)
      flashClearRef.current = null
    }, 1600)
  }, [])

  React.useEffect(() => {
    if (!flashGroupId) return
    if (!groups.some((group) => group.groupId === flashGroupId)) return
    window.requestAnimationFrame(() => {
      document.querySelector('.visit-plan-carer-row-flash')?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    })
  }, [flashGroupId, groups])

  const addRow = () => {
    const newAssignment: VisitPlanSlotCarerAssignment = {
      dayOfWeek: null,
      employeeId: '',
      role: slot.carerAssignments.length === 0 ? 'LEAD' : 'SECONDARY',
      durationMinutes: null,
      plannedStartTime: slotStartHm || null,
      plannedEndTime: slotEndHm || null,
      sortOrder: 0,
    }
    const next = [newAssignment, ...slot.carerAssignments].map((assignment, index) => ({
      ...assignment,
      sortOrder: index,
    }))
    onChange(next)
    const newGroupId = groupCarerAssignments(next)[0]?.groupId
    if (newGroupId) flashNewRow(newGroupId)
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className={contentTitleClass}>Carers by day</h4>
          <p className={contentBodyClass}>
            Pick one or more weekdays per carer (e.g. Mon + Wed + Fri). Change duration for split visits
            (e.g. 60 + 30 min double-up).
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addRow}>
            Add carer row
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onOpenAssign(null)}>
            Smart assign
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className={contentHelperClass}>
          No day-specific assignments — uses the carers assigned on the main row when generating rota.
        </p>
      ) : (
        <ul className="space-y-3">
          {groups.map((group) => {
            const isFlashing = flashGroupId === group.groupId
            const rowRequired = group.requiredCarers ?? slot.requiredCarers
            const carers = group.carers.filter((carer) => carer.employeeId?.trim())
            return (
              <li
                key={group.groupId}
                className={cn(
                  'space-y-3 rounded-md border bg-card p-3 transition-[box-shadow,background-color,border-color,transform] duration-500',
                  isFlashing
                    ? 'visit-plan-carer-row-flash border-primary ring-2 ring-primary/35 bg-primary/5 shadow-md'
                    : 'border-border',
                )}
              >
                {/* Row header: which days this group covers + how many carers it needs. */}
                <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1.6fr)_8rem_auto]">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Label className={contentOverlineClass}>Days</Label>
                      {isFlashing ? (
                        <Badge variant="default" className="text-[10px] font-normal">
                          New
                        </Badge>
                      ) : null}
                    </div>
                    <MultiSelect
                      options={DAY_OPTIONS}
                      value={selectedDayValuesForGroup(group.days)}
                      disabled={disabled}
                      placeholder="Select days…"
                      searchPlaceholder="Search days…"
                      className="min-h-9 w-full py-1.5"
                      isOptionSelected={(option, value) =>
                        option.value === ALL_WEEKDAYS_SELECT_VALUE
                          ? isAllWeekdaysSelected(value)
                          : value.includes(option.value)
                      }
                      formatSelectedOptions={(selected) =>
                        isAllWeekdaysSelected(selected.map((option) => option.value))
                          ? [{ value: ALL_WEEKDAYS_SELECT_VALUE, label: ALL_WEEKDAYS_SELECT_LABEL }]
                          : selected.filter((option) => option.value !== ALL_WEEKDAYS_SELECT_VALUE)
                      }
                      onRemoveOption={(option, value) =>
                        option.value === ALL_WEEKDAYS_SELECT_VALUE
                          ? []
                          : value.filter((item) => item !== option.value)
                      }
                      onChange={(values) => {
                        const prev = selectedDayValuesForGroup(group.days)
                        const normalized = normalizeCarerByDaySelection(prev, values)
                        onChange(replaceGroupDays(slot.carerAssignments, group, normalized))
                      }}
                    />
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <Label className={contentOverlineClass}>No. of carers</Label>
                    <VisitPlanCarersCountInput
                      className="w-full"
                      disabled={disabled}
                      value={rowRequired}
                      aria-label="Carers required for this day-group"
                      onCommit={(requiredCarers) =>
                        onChange(
                          replaceGroupField(slot.carerAssignments, group, { requiredCarers }),
                        )
                      }
                    />
                  </div>

                  <div className="flex items-start justify-end sm:pt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={disabled}
                      onClick={() => onChange(removeGroup(slot.carerAssignments, group))}
                    >
                      Remove row
                    </Button>
                  </div>
                </div>

                {/* Carers assigned to this day-group (up to the required count). */}
                <div className="space-y-2 border-t border-border/70 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className={contentOverlineClass}>
                      Carers{carers.length ? ` (${carers.length} of ${rowRequired})` : ''}
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={disabled}
                      onClick={() => onOpenAssign(group)}
                    >
                      <UserPlus className="mr-1 h-3.5 w-3.5" />
                      {carers.length ? 'Change carers' : 'Assign carers'}
                    </Button>
                  </div>

                  {carers.length === 0 ? (
                    <p className={contentHelperClass}>
                      No carer selected — click “Assign carers” to add up to {rowRequired}.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {carers.map((carer) => {
                        const durationKey = `${group.groupId}::${carer.carerKey}`
                        const carerName = nameById.get(carer.employeeId) ?? 'Unknown employee'
                        return (
                          <CarerRow
                            key={carer.carerKey}
                            carer={carer}
                            carerName={carerName}
                            slot={slot}
                            disabled={disabled}
                            slotStartHm={slotStartHm}
                            slotEndHm={slotEndHm}
                            slotDefaultDuration={slotDefaultDuration}
                            durationKey={durationKey}
                            editingDurationKey={editingDurationKey}
                            setEditingDurationKey={setEditingDurationKey}
                            draftDuration={draftDuration}
                            setDraftDuration={setDraftDuration}
                            onChange={onChange}
                          />
                        )
                      })}
                    </ul>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

type CarerRowProps = {
  carer: CarerAssignmentGroupCarer
  carerName: string
  slot: VisitPlanSlot
  disabled?: boolean
  slotStartHm: string
  slotEndHm: string
  slotDefaultDuration: number
  durationKey: string
  editingDurationKey: string | null
  setEditingDurationKey: (key: string | null) => void
  draftDuration: string
  setDraftDuration: (value: string) => void
  onChange: (assignments: VisitPlanSlotCarerAssignment[]) => void
}

function CarerRow({
  carer,
  carerName,
  slot,
  disabled,
  slotStartHm,
  slotEndHm,
  slotDefaultDuration,
  durationKey,
  editingDurationKey,
  setEditingDurationKey,
  draftDuration,
  setDraftDuration,
  onChange,
}: CarerRowProps) {
  return (
    <li className="grid grid-cols-1 items-start gap-3 rounded-md border border-border/60 bg-muted/20 p-2.5 sm:grid-cols-[minmax(0,1.2fr)_7rem_6rem_6.5rem_6.5rem_auto]">
      <div className="min-w-0 space-y-1.5">
        <Label className={contentOverlineClass}>Carer</Label>
        <p className="truncate text-sm font-medium leading-snug">{carerName}</p>
      </div>

      <div className="min-w-0 space-y-1.5">
        <Label className={contentOverlineClass}>Role</Label>
        <Select
          value={carer.role}
          disabled={disabled}
          onValueChange={(v) =>
            onChange(
              replaceCarerField(slot.carerAssignments, carer, {
                role: v as VisitPlanSlotCarerAssignment['role'],
              }),
            )
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LEAD">Lead</SelectItem>
            <SelectItem value="SECONDARY">Secondary</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-0 space-y-1.5">
        <Label className={contentOverlineClass}>Duration (min)</Label>
        <Input
          type="number"
          min={1}
          max={480}
          disabled={disabled}
          className="w-full"
          value={
            editingDurationKey === durationKey
              ? draftDuration
              : String(carerAssignmentDisplayDurationMinutes(carer, slot) ?? '')
          }
          onFocus={() => {
            setEditingDurationKey(durationKey)
            setDraftDuration(String(carerAssignmentDisplayDurationMinutes(carer, slot) ?? ''))
          }}
          onChange={(e) => setDraftDuration(e.target.value)}
          onBlur={() => {
            onChange(
              replaceCarerField(slot.carerAssignments, carer, {
                durationMinutes: parseCarerAssignmentDurationInput(draftDuration, slotDefaultDuration),
              }),
            )
            setEditingDurationKey(null)
            setDraftDuration('')
          }}
        />
      </div>

      <div className="min-w-0 space-y-1.5">
        <Label className={contentOverlineClass}>Start time</Label>
        <Input
          type="time"
          disabled={disabled}
          className="w-full"
          value={normalizeTimeForInput(carer.plannedStartTime ?? '') || slotStartHm}
          onChange={(e) => {
            const plannedStartTime = e.target.value || null
            onChange(
              replaceCarerField(slot.carerAssignments, carer, {
                plannedStartTime,
                plannedEndTime: carer.plannedEndTime ?? (slotEndHm || null),
              }),
            )
          }}
        />
      </div>

      <div className="min-w-0 space-y-1.5">
        <Label className={contentOverlineClass}>End time</Label>
        <Input
          type="time"
          disabled={disabled}
          className="w-full"
          value={normalizeTimeForInput(carer.plannedEndTime ?? '') || slotEndHm}
          onChange={(e) => {
            const plannedEndTime = e.target.value || null
            const start = normalizeTimeForInput(carer.plannedStartTime ?? '') || slotStartHm
            if (plannedEndTime && start && plannedEndTime <= start) return
            onChange(
              replaceCarerField(slot.carerAssignments, carer, {
                plannedStartTime: carer.plannedStartTime ?? (start || null),
                plannedEndTime,
              }),
            )
          }}
        />
      </div>

      <div className="flex items-start justify-end sm:pt-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          disabled={disabled}
          onClick={() => onChange(removeCarer(slot.carerAssignments, carer))}
        >
          Remove
        </Button>
      </div>
    </li>
  )
}
