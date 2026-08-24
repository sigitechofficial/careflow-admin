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
import { UserPlus } from 'lucide-react'
import * as React from 'react'
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
import {
  type CarerAssignmentGroup,
  ALL_WEEKDAYS_SELECT_LABEL,
  ALL_WEEKDAYS_SELECT_VALUE,
  carerAssignmentDisplayDurationMinutes,
  groupCarerAssignments,
  isAllWeekdaysSelected,
  normalizeCarerByDaySelection,
  parseCarerAssignmentDurationInput,
  removeGroup,
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

export function VisitPlanSlotCarerByDayPanel({ slot, disabled, onChange, onOpenAssign }: Props) {
  const employeeIds = slot.carerAssignments.map((a) => a.employeeId)
  const nameById = useEmployeeNameMap(employeeIds)
  const groups = groupCarerAssignments(slot.carerAssignments)
  const slotDefaultDuration = slotDefaultDurationMinutes(slot)
  const showPerCarerTiming = slot.requiredCarers > 1 || groups.length > 1
  const slotStartHm = normalizeTimeForInput(slot.plannedStartTime)
  const slotEndHm = normalizeTimeForInput(slot.plannedEndTime)
  const [editingDurationGroupId, setEditingDurationGroupId] = React.useState<string | null>(null)
  const [draftDuration, setDraftDuration] = React.useState('')

  const addRow = () => {
    onChange([
      ...slot.carerAssignments,
      {
        dayOfWeek: null,
        employeeId: '',
        role: slot.carerAssignments.length === 0 ? 'LEAD' : 'SECONDARY',
        durationMinutes: null,
        plannedStartTime: showPerCarerTiming ? slotStartHm || null : null,
        plannedEndTime: showPerCarerTiming ? slotEndHm || null : null,
        sortOrder: slot.carerAssignments.length,
      },
    ])
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className={contentTitleClass}>Carers by day</h4>
          <p className={contentBodyClass}>
            Pick one or more weekdays per carer (e.g. Mon + Wed + Fri). Duration defaults to the visit time for
            this slot{slotDefaultDuration > 0 ? ` (${slotDefaultDuration} min)` : ''} — change it for split visits
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
          {groups.map((group) => (
            <li
              key={group.groupId}
              className="space-y-3 rounded-md border border-border bg-card p-3"
            >
              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_8rem_7rem_auto]">
                <div className="min-w-0 space-y-1.5">
                  <Label className={contentOverlineClass}>Days</Label>
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
                  <Label className={contentOverlineClass}>Employee</Label>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="truncate text-sm font-medium leading-snug">
                      {nameById.get(group.template.employeeId) ??
                        (group.template.employeeId ? 'Unknown employee' : 'No carer selected')}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 w-fit px-2 text-xs"
                      disabled={disabled}
                      onClick={() => onOpenAssign(group)}
                    >
                      <UserPlus className="mr-1 h-3.5 w-3.5" />
                      {group.template.employeeId ? 'Change carer' : 'Assign carer'}
                    </Button>
                  </div>
                </div>

                <div className="min-w-0 space-y-1.5">
                  <Label className={contentOverlineClass}>Role</Label>
                  <Select
                    value={group.template.role}
                    disabled={disabled}
                    onValueChange={(v) =>
                      onChange(
                        replaceGroupField(slot.carerAssignments, group, {
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
                      editingDurationGroupId === group.groupId
                        ? draftDuration
                        : String(carerAssignmentDisplayDurationMinutes(group.template, slot) ?? '')
                    }
                    onFocus={() => {
                      setEditingDurationGroupId(group.groupId)
                      setDraftDuration(
                        String(carerAssignmentDisplayDurationMinutes(group.template, slot) ?? ''),
                      )
                    }}
                    onChange={(e) => setDraftDuration(e.target.value)}
                    onBlur={() => {
                      onChange(
                        replaceGroupField(slot.carerAssignments, group, {
                          durationMinutes: parseCarerAssignmentDurationInput(
                            draftDuration,
                            slotDefaultDuration,
                          ),
                        }),
                      )
                      setEditingDurationGroupId(null)
                      setDraftDuration('')
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
                    onClick={() => onChange(removeGroup(slot.carerAssignments, group))}
                  >
                    Remove
                  </Button>
                </div>
              </div>

              {showPerCarerTiming ? (
                <div className="grid max-w-md grid-cols-1 gap-3 border-t border-border/70 pt-3 sm:grid-cols-2">
                  <div className="min-w-0 space-y-1.5">
                    <Label className={contentOverlineClass}>Start time</Label>
                    <Input
                      type="time"
                      disabled={disabled}
                      className="w-full"
                      value={
                        normalizeTimeForInput(group.template.plannedStartTime ?? '') || slotStartHm
                      }
                      onChange={(e) => {
                        const plannedStartTime = e.target.value || null
                        onChange(
                          replaceGroupField(slot.carerAssignments, group, {
                            plannedStartTime,
                            plannedEndTime:
                              group.template.plannedEndTime ?? (slotEndHm || null),
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
                      value={
                        normalizeTimeForInput(group.template.plannedEndTime ?? '') || slotEndHm
                      }
                      onChange={(e) => {
                        const plannedEndTime = e.target.value || null
                        const start =
                          normalizeTimeForInput(group.template.plannedStartTime ?? '') ||
                          slotStartHm
                        if (plannedEndTime && start && plannedEndTime <= start) {
                          return
                        }
                        onChange(
                          replaceGroupField(slot.carerAssignments, group, {
                            plannedStartTime: group.template.plannedStartTime ?? (start || null),
                            plannedEndTime,
                          }),
                        )
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
