import * as React from 'react'
import { MultiSelect, type MultiSelectOption } from '@/shared/ui/multi-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { useAllEmployees } from '@/features/employees/hooks/useEmployeeTabs'
import { SURVEY_TARGET_KIND_LABELS, type SurveyTargetKind } from '@/features/surveys/types'

/** Who a survey goes to. Empty lists mean everyone (in the branches you can reach). */
export type SurveyAudienceValue = {
  locationIds: string[]
  roleIds: string[]
  employeeIds: string[]
}

export const EMPTY_AUDIENCE: SurveyAudienceValue = { locationIds: [], roleIds: [], employeeIds: [] }

type Lookups = {
  branches: Map<string, string>
  zones: Array<{ name: string; locationIds: string[] }>
  jobTitles: Map<string, string>
  employees: Map<string, string>
}

/** Plain-English audience, e.g. "Leeds · Job titles: Carer" or "3 chosen employees". */
export function describeSurveyAudience(
  targetKind: SurveyTargetKind,
  audience: SurveyAudienceValue,
  lookups: Partial<Lookups>,
): string {
  const who = SURVEY_TARGET_KIND_LABELS[targetKind].toLowerCase()
  if (targetKind === 'EMPLOYEE' && audience.employeeIds.length) {
    const names = audience.employeeIds.map(id => lookups.employees?.get(id)).filter(Boolean) as string[]
    if (names.length && names.length <= 3) return names.join(', ')
    return `${audience.employeeIds.length} chosen employee${audience.employeeIds.length === 1 ? '' : 's'}`
  }
  const parts: string[] = []
  if (audience.locationIds.length) {
    const remaining = new Set(audience.locationIds)
    const labels: string[] = []
    for (const zone of lookups.zones ?? []) {
      if (zone.locationIds.length && zone.locationIds.every(id => remaining.has(id))) {
        labels.push(`${zone.name} (whole zone)`)
        zone.locationIds.forEach(id => remaining.delete(id))
      }
    }
    for (const id of remaining) labels.push(lookups.branches?.get(id) ?? 'Branch')
    parts.push(labels.join(', '))
  } else {
    parts.push(`All ${who}`)
  }
  if (targetKind === 'EMPLOYEE') {
    parts.push(
      audience.roleIds.length
        ? `Job titles: ${audience.roleIds.map(id => lookups.jobTitles?.get(id) ?? 'Job title').join(', ')}`
        : 'All job titles',
    )
  }
  return parts.join(' · ')
}

/** Location tree, job titles and employees as name lookups (only what the audience needs). */
export function useSurveyAudienceLookups(targetKind: SurveyTargetKind, enabled = true, withPeople = false) {
  const forEmployees = targetKind === 'EMPLOYEE'
  const { data: tree } = useLocationManagementTree(enabled && targetKind !== 'PUBLIC')
  const { data: employeeLookups } = useEmployeeLookups(enabled && forEmployees)
  const { data: employees } = useAllEmployees({}, enabled && forEmployees && withPeople)
  return React.useMemo(() => {
    const branches = new Map<string, string>()
    const zones: Lookups['zones'] = []
    const branchOptions: MultiSelectOption[] = []
    for (const zone of tree?.zones ?? []) {
      const ids: string[] = []
      for (const b of zone.branches) {
        if (!b.locationId) continue
        ids.push(b.locationId)
        branches.set(b.locationId, b.name)
        branchOptions.push({ value: b.locationId, label: `${zone.name} › ${b.name}` })
      }
      zones.push({ name: zone.name, locationIds: ids })
    }
    const jobTitles = new Map((employeeLookups?.jobTitles ?? []).map(j => [j.id, j.name] as const))
    const employeeMap = new Map(
      (employees ?? [])
        .filter(e => e.isActive)
        .map(e => [e.id, e.fullName || `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || 'Employee'] as const),
    )
    return {
      lookups: { branches, zones, jobTitles, employees: employeeMap } satisfies Lookups,
      branchOptions,
      zoneOptions: zones.filter(z => z.locationIds.length),
      jobTitleOptions: [...jobTitles].map(([value, label]) => ({ value, label })),
      employeeOptions: [...employeeMap].map(([value, label]) => ({ value, label })),
    }
  }, [tree, employeeLookups, employees])
}

/**
 * Branches (with a whole-zone shortcut), job titles and — for staff surveys — chosen people.
 * Clearing a list means "everyone"; the value is always sent as-is so clearing really clears.
 */
export function SurveyAudienceFields({
  targetKind,
  value,
  onChange,
  showPeople = false,
  enabled = true,
}: {
  targetKind: SurveyTargetKind
  value: SurveyAudienceValue
  onChange: (next: SurveyAudienceValue) => void
  showPeople?: boolean
  enabled?: boolean
}) {
  const forEmployees = targetKind === 'EMPLOYEE'
  const { branchOptions, zoneOptions, jobTitleOptions, employeeOptions } = useSurveyAudienceLookups(
    targetKind,
    enabled,
    showPeople,
  )
  const who = SURVEY_TARGET_KIND_LABELS[targetKind].toLowerCase()
  const peopleChosen = showPeople && forEmployees && value.employeeIds.length > 0

  if (targetKind === 'PUBLIC') return null

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-sm">
        <span className="font-medium">Branches</span>
        <MultiSelect
          options={branchOptions}
          value={value.locationIds}
          onChange={locationIds => onChange({ ...value, locationIds })}
          placeholder={`All ${who} in your branches`}
          searchPlaceholder="Search branches…"
          disabled={peopleChosen}
        />
        {zoneOptions.length > 1 ? (
          <Select
            value=""
            onValueChange={zoneName => {
              const zone = zoneOptions.find(z => z.name === zoneName)
              if (!zone) return
              onChange({ ...value, locationIds: [...new Set([...value.locationIds, ...zone.locationIds])] })
            }}
            disabled={peopleChosen}
          >
            <SelectTrigger className="mt-1.5 h-8 text-xs" aria-label="Add a whole zone">
              <SelectValue placeholder="Add a whole zone…" />
            </SelectTrigger>
            <SelectContent>
              {zoneOptions.map(z => (
                <SelectItem key={z.name} value={z.name}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <span className="block text-xs text-muted-foreground">Leave empty for all your branches.</span>
      </div>

      {forEmployees ? (
        <div className="space-y-1 text-sm">
          <span className="font-medium">Job titles</span>
          <MultiSelect
            options={jobTitleOptions}
            value={value.roleIds}
            onChange={roleIds => onChange({ ...value, roleIds })}
            placeholder="All job titles"
            searchPlaceholder="Search job titles…"
            disabled={peopleChosen}
          />
          <span className="block text-xs text-muted-foreground">
            Leave empty for all job titles. Otherwise only employees with the selected job titles receive it.
          </span>
        </div>
      ) : null}

      {showPeople && forEmployees ? (
        <div className="space-y-1 text-sm">
          <span className="font-medium">Specific people (optional)</span>
          <MultiSelect
            options={employeeOptions}
            value={value.employeeIds}
            onChange={employeeIds => onChange({ ...value, employeeIds })}
            placeholder="Everyone matching the branches and job titles"
            searchPlaceholder="Search employees…"
          />
          <span className="block text-xs text-muted-foreground">
            Choosing people sends only to them, instead of by branch and job title.
          </span>
        </div>
      ) : null}
    </div>
  )
}
