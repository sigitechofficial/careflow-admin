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
import type { VisitPlanSlot, VisitPlanSlotCarerAssignment } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import {
  type CarerAssignmentGroup,
  ALL_WEEKDAYS_SELECT_LABEL,
  ALL_WEEKDAYS_SELECT_VALUE,
  allWeekdaySelectValues,
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
        plannedStartTime: null,
        plannedEndTime: null,
        sortOrder: slot.carerAssignments.length,
      },
    ])
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Carers by day</h4>
          <p className="text-xs text-muted-foreground">
            Pick one or more weekdays per carer (e.g. Mon + Wed + Fri). Duration defaults to the visit time for
            this slot{slotDefaultDuration > 0 ? ` (${slotDefaultDuration} min)` : ''} — change it for split visits
            (e.g. 60 + 30 min double-up).
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addRow}>
            Add carer row
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onOpenAssign(null)}>
            Smart assign
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No day-specific assignments — uses the carers assigned on the main row when generating rota.
        </p>
      ) : (
        <ul className="space-y-2">
          {groups.map((group) => (
            <li key={group.groupId} className="grid gap-2 rounded border border-border bg-card p-2 sm:grid-cols-6">
              <div>
                <Label className="text-[10px] text-muted-foreground">Days</Label>
                <MultiSelect
                  options={DAY_OPTIONS}
                  value={selectedDayValuesForGroup(group.days)}
                  disabled={disabled}
                  placeholder="Select days…"
                  searchPlaceholder="Search days…"
                  className="min-h-9 py-1.5"
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
                    option.value === ALL_WEEKDAYS_SELECT_VALUE ? [] : value.filter((item) => item !== option.value)
                  }
                  onChange={(values) => {
                    const prev = selectedDayValuesForGroup(group.days)
                    const normalized = normalizeCarerByDaySelection(prev, values)
                    onChange(replaceGroupDays(slot.carerAssignments, group, normalized))
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[10px] text-muted-foreground">Employee</Label>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="truncate text-sm">
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
              <div>
                <Label className="text-[10px] text-muted-foreground">Role</Label>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEAD">Lead</SelectItem>
                    <SelectItem value="SECONDARY">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">
                  Duration (min)
                  {group.template.durationMinutes == null && slotDefaultDuration > 0 ? (
                    <span className="font-normal text-muted-foreground/80"> · visit default</span>
                  ) : null}
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={480}
                  disabled={disabled}
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
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onChange(removeGroup(slot.carerAssignments, group))}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
