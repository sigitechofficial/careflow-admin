import * as React from 'react'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'

export function EmployeeSkillTypePicker({
  types,
  assignedIds,
  value,
  onChange,
  disabled,
}: {
  types: { id: string; name: string }[]
  assignedIds: Set<string>
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}) {
  const options = React.useMemo<ComboboxOption[]>(
    () =>
      types.map(t => {
        const alreadyAdded = assignedIds.has(t.id)
        return {
          value: t.id,
          label: t.name,
          disabled: alreadyAdded,
          description: alreadyAdded ? 'Already added' : undefined,
        }
      }),
    [types, assignedIds],
  )

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">Skill type</label>
      <Combobox
        options={options}
        value={value}
        onChange={onChange}
        placeholder={types.length ? 'Select skill type' : 'No skill types configured'}
        searchPlaceholder="Search skills…"
        emptyText="No matching skills."
        allowDeselect
        disabled={disabled}
        aria-label="Skill type"
        data-testid="employee-skill-type-picker"
      />
      <p className="text-[11px] text-muted-foreground">
        Same list on every screen. Skills already on this record are marked “Already added” and cannot be
        selected again.
      </p>
    </div>
  )
}
