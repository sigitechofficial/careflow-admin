import type { MultiSelectOption } from '@/shared/ui/multi-select'
import type { EmployeeListFacets } from '@/features/employees/api'
import { formatBranchFilterLabel } from '@/features/settings/location-management/build-service-user-branch-filter-options'

export function formatStaffListFacetLabel(name: string, count: number): string {
  return `${name} (${count})`
}

export function staffListFacetOptions(
  lookupRows: { id: string; name: string }[],
  facetRows: { id: string; count: number }[] | undefined,
  selectedIds: string[],
): MultiSelectOption[] {
  const countById = new Map((facetRows ?? []).map((row) => [row.id, row.count]))

  const options = lookupRows.map((row) => ({
    value: row.id,
    label: formatStaffListFacetLabel(row.name, countById.get(row.id) ?? 0),
  }))

  for (const selectedId of selectedIds) {
    if (lookupRows.some((row) => row.id === selectedId)) continue
    options.push({
      value: selectedId,
      label: formatStaffListFacetLabel(selectedId, countById.get(selectedId) ?? 0),
    })
  }

  return options.sort((a, b) => {
    const countA = countById.get(a.value) ?? 0
    const countB = countById.get(b.value) ?? 0
    if (countA > 0 && countB === 0) return -1
    if (countB > 0 && countA === 0) return 1
    if (countA !== countB) return countB - countA
    return a.label.localeCompare(b.label)
  })
}

export function staffListBranchFacetOptions(
  lookups: { id: string; name: string }[],
  facets: EmployeeListFacets | null | undefined,
): MultiSelectOption[] {
  const countById = new Map((facets?.branches ?? []).map((row) => [row.id, row.count]))
  const sortedBranches = facets?.branches?.length
    ? facets.branches
    : lookups.map((row) => ({ id: row.id, count: 0 }))

  const seen = new Set<string>()
  const options: MultiSelectOption[] = []

  for (const branch of sortedBranches) {
    if (seen.has(branch.id)) continue
    seen.add(branch.id)
    const location = lookups.find((row) => row.id === branch.id)
    if (!location) continue
    options.push({
      value: branch.id,
      label: formatBranchFilterLabel(
        { locationId: location.id, locationName: location.name },
        branch.count,
      ),
    })
  }

  for (const location of lookups) {
    if (seen.has(location.id)) continue
    const count = countById.get(location.id) ?? 0
    options.push({
      value: location.id,
      label: formatBranchFilterLabel(
        { locationId: location.id, locationName: location.name },
        count,
      ),
    })
  }

  return options.sort((a, b) => {
    const countA = countById.get(a.value) ?? 0
    const countB = countById.get(b.value) ?? 0
    if (countA !== countB) return countB - countA
    return a.label.localeCompare(b.label)
  })
}

export function staffListVisaFacetOptions(
  visaTypes: { id: string; label: string }[],
  facetRows: { id: string; count: number }[] | undefined,
  selectedIds: string[],
): MultiSelectOption[] {
  if (!facetRows?.length) {
    return visaTypes
      .map((row) => ({ value: row.id, label: row.label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  const countById = new Map(facetRows.map((row) => [row.id, row.count]))
  const facetIds = new Set(facetRows.map((row) => row.id))
  const labelById = new Map(visaTypes.map((row) => [row.id, row.label]))

  const options: MultiSelectOption[] = facetRows.map((row) => ({
    value: row.id,
    label: formatStaffListFacetLabel(labelById.get(row.id) ?? row.id, row.count),
  }))

  for (const selectedId of selectedIds) {
    if (facetIds.has(selectedId)) continue
    const label = labelById.get(selectedId)
    if (!label) continue
    options.push({
      value: selectedId,
      label: formatStaffListFacetLabel(label, countById.get(selectedId) ?? 0),
    })
  }

  return options
}

export function pruneStaffListFiltersToFacets(
  filters: {
    roleIds: string[]
    jobTitleIds: string[]
    gradeIds: string[]
    contractTypeIds: string[]
    visaTypeIds: string[]
    statusIds: string[]
  },
  facets: EmployeeListFacets,
) {
  const roleIds = new Set(facets.roles.map((row) => row.id))
  const jobTitleIds = new Set(facets.jobTitles.map((row) => row.id))
  const gradeIds = new Set(facets.grades.map((row) => row.id))
  const contractTypeIds = new Set(facets.contractTypes.map((row) => row.id))
  const visaTypeIds = new Set(facets.visaTypes.map((row) => row.id))
  const statusIds = new Set(facets.statuses.map((row) => row.id))

  return {
    roleIds: filters.roleIds.filter((id) => roleIds.has(id)),
    jobTitleIds: filters.jobTitleIds.filter((id) => jobTitleIds.has(id)),
    gradeIds: filters.gradeIds.filter((id) => gradeIds.has(id)),
    contractTypeIds: filters.contractTypeIds.filter((id) => contractTypeIds.has(id)),
    visaTypeIds: filters.visaTypeIds.filter((id) => visaTypeIds.has(id)),
    statusIds: filters.statusIds.filter((id) => statusIds.has(id)),
  }
}
