import type { EmployeeListRow } from '@/features/employees/api/employees.api'
import { formatServiceUserBranchLabel } from '@/features/settings/location-management/format-service-user-branch-label'

export type EmployeeBranchScopeKind = 'all-zones' | 'multiple' | 'single' | 'none'

export type EmployeeBranchScope = {
  kind: EmployeeBranchScopeKind
  summary: string
  branches: string[]
}

export function listEmployeeBranchLabels(
  catalog: Pick<EmployeeListRow, 'locationId' | 'location' | 'baseLocationIds'> | null | undefined,
  locationNames: Map<string, string>,
): string[] {
  if (!catalog) return []

  const labels: string[] = []
  const seen = new Set<string>()

  const pushLabel = (locationId: string | null | undefined, locationName: string | null | undefined) => {
    if (!locationId || seen.has(locationId)) return
    seen.add(locationId)
    const label = formatServiceUserBranchLabel({
      locationId,
      locationName: locationName ?? locationNames.get(locationId),
    })
    if (label && label !== '—' && label !== 'Not assigned') labels.push(label)
  }

  pushLabel(catalog.locationId, catalog.location?.name)
  for (const locationId of catalog.baseLocationIds ?? []) {
    pushLabel(locationId, locationNames.get(locationId))
  }

  return labels
}

export function describeEmployeeBranchScope(
  catalog: Pick<
    EmployeeListRow,
    'locationId' | 'location' | 'baseLocationIds' | 'accessAllZones'
  > | null | undefined,
  locationNames: Map<string, string>,
): EmployeeBranchScope {
  if (!catalog) {
    return { kind: 'none', summary: 'Branch assignment unknown', branches: [] }
  }

  if (catalog.accessAllZones) {
    return {
      kind: 'all-zones',
      summary: 'All zones — can work at every branch',
      branches: [],
    }
  }

  const branches = listEmployeeBranchLabels(catalog, locationNames)
  if (!branches.length) {
    return { kind: 'none', summary: 'No branch assigned', branches: [] }
  }
  if (branches.length === 1) {
    return { kind: 'single', summary: 'Single branch', branches }
  }
  return {
    kind: 'multiple',
    summary: `Multiple branches (${branches.length})`,
    branches,
  }
}

export function staffListBranchScopeLabel(scope: EmployeeBranchScope): string {
  switch (scope.kind) {
    case 'all-zones':
      return 'All branches'
    case 'multiple':
      return `Multiple (${scope.branches.length})`
    case 'single':
      return 'Single branch'
    default:
      return '—'
  }
}
