import { Checkbox } from '@/shared/ui/toggle-controls'
import type { PolicyAudienceInput } from '@/features/policies/types/policy.types'
import { summariseAudience } from '@/features/policies/policy-format'

type Lookup = { id: string; name: string }

type Props = {
  value: PolicyAudienceInput[]
  onChange: (value: PolicyAudienceInput[]) => void
  disabled?: boolean
  roles: Lookup[]
  jobTitles: Lookup[]
  workAreas: Lookup[]
  locations: Lookup[]
}

function selectedIds(value: PolicyAudienceInput[], key: keyof PolicyAudienceInput): string[] {
  return value.map(row => row[key]).filter((id): id is string => typeof id === 'string' && Boolean(id))
}

export function PolicyAudienceEditor({
  value,
  onChange,
  disabled,
  roles,
  jobTitles,
  workAreas,
  locations,
}: Props) {
  const allEmployees = value.length === 0 || value.some(row => row.targetType === 'ALL_EMPLOYEES')
  const roleIds = selectedIds(value, 'roleId')
  const jobTitleIds = selectedIds(value, 'jobTitleId')
  const workAreaIds = selectedIds(value, 'workAreaId')
  const locationIds = selectedIds(value, 'locationId')

  const emit = (next: {
    allEmployees?: boolean
    roleIds?: string[]
    jobTitleIds?: string[]
    workAreaIds?: string[]
    locationIds?: string[]
  }) => {
    const useAll = next.allEmployees ?? allEmployees
    if (useAll) {
      onChange([])
      return
    }
    const rows: PolicyAudienceInput[] = []
    for (const id of next.roleIds ?? roleIds) rows.push({ targetType: 'ROLE', roleId: id })
    for (const id of next.jobTitleIds ?? jobTitleIds) rows.push({ targetType: 'JOB_TITLE', jobTitleId: id })
    for (const id of next.workAreaIds ?? workAreaIds) rows.push({ targetType: 'WORK_AREA', workAreaId: id })
    for (const id of next.locationIds ?? locationIds) rows.push({ targetType: 'LOCATION', locationId: id })
    onChange(rows)
  }

  const toggle = (list: string[], id: string, key: 'roleIds' | 'jobTitleIds' | 'workAreaIds' | 'locationIds') => {
    const next = list.includes(id) ? list.filter(item => item !== id) : [...list, id]
    emit({ allEmployees: false, [key]: next })
  }

  const summary = summariseAudience(
    allEmployees
      ? []
      : value.map(row => ({
          targetType: row.targetType,
          roleId: row.roleId ?? null,
          jobTitleId: row.jobTitleId ?? null,
          workAreaId: row.workAreaId ?? null,
          locationId: row.locationId ?? null,
        })),
    {
      roles: Object.fromEntries(roles.map(r => [r.id, r.name])),
      jobTitles: Object.fromEntries(jobTitles.map(r => [r.id, r.name])),
      workAreas: Object.fromEntries(workAreas.map(r => [r.id, r.name])),
      locations: Object.fromEntries(locations.map(r => [r.id, r.name])),
    },
  )

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-sm font-medium">Audience</legend>
      <p className="text-sm text-muted-foreground">
        People in the same group match if they have any of the selected values. Different groups must
        all match.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={allEmployees}
          onCheckedChange={checked => emit({ allEmployees: checked === true })}
          disabled={disabled}
        />
        All employees
      </label>

      {!allEmployees ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CheckboxGroup
            title="Roles"
            items={roles}
            selected={roleIds}
            onToggle={id => toggle(roleIds, id, 'roleIds')}
            disabled={disabled}
          />
          <CheckboxGroup
            title="Job titles"
            items={jobTitles}
            selected={jobTitleIds}
            onToggle={id => toggle(jobTitleIds, id, 'jobTitleIds')}
            disabled={disabled}
          />
          <CheckboxGroup
            title="Work areas"
            items={workAreas}
            selected={workAreaIds}
            onToggle={id => toggle(workAreaIds, id, 'workAreaIds')}
            disabled={disabled}
          />
          <CheckboxGroup
            title="Locations"
            items={locations}
            selected={locationIds}
            onToggle={id => toggle(locationIds, id, 'locationIds')}
            disabled={disabled}
          />
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground" data-testid="policy-audience-summary">
        {summary}
      </p>
    </fieldset>
  )
}

function CheckboxGroup({
  title,
  items,
  selected,
  onToggle,
  disabled,
}: {
  title: string
  items: Lookup[]
  selected: string[]
  onToggle: (id: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No options available.</p>
      ) : (
        <ul className="max-h-44 space-y-1.5 overflow-y-auto">
          {items.map(item => (
            <li key={item.id}>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(item.id)}
                  onCheckedChange={() => onToggle(item.id)}
                  disabled={disabled}
                />
                {item.name}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
