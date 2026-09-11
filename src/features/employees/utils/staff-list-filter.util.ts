import type { EmployeeLookupsBundle, ListEmployeesParams } from '@/features/employees/api'
import type { EmployeeBranchScopeKind } from '@/features/scheduling/utils/employee-branch-scope.util'

export type StaffListInCountryFilter = 'all' | 'in' | 'out'

export type StaffListComplianceFilter = 'all' | 'needs_attention' | 'up_to_date'

export type StaffListSearch = {
  q?: string
  status?: string
  branch?: string
  role?: string
  jobTitle?: string
  grade?: string
  contract?: string
  immigration?: string
  inCountry?: 'in' | 'out'
  branchScope?: string
  compliance?: 'needs_attention' | 'up_to_date'
  sortBy?: StaffListSortKey
  sortOrder?: 'asc' | 'desc'
}

export const STAFF_LIST_SORT_KEYS = [
  'name',
  'status',
  'immigration',
  'jobTitle',
  'role',
  'grade',
  'contractType',
  'createdAt',
  'updatedAt',
] as const

export type StaffListSortKey = (typeof STAFF_LIST_SORT_KEYS)[number]

export function parseStaffListSortBy(value?: string | null): StaffListSortKey | undefined {
  if (!value) return undefined
  return STAFF_LIST_SORT_KEYS.includes(value as StaffListSortKey)
    ? (value as StaffListSortKey)
    : undefined
}

export function staffListSearchToSort(search: StaffListSearch): {
  sortBy?: StaffListSortKey
  sortOrder?: 'asc' | 'desc'
} {
  const sortBy = parseStaffListSortBy(search.sortBy)
  const sortOrder =
    search.sortOrder === 'asc' || search.sortOrder === 'desc' ? search.sortOrder : undefined
  return { sortBy, sortOrder }
}

export type StaffListFiltersState = {
  search: string
  statusIds: string[]
  allStatuses: boolean
  locationIds: string[]
  roleIds: string[]
  jobTitleIds: string[]
  gradeIds: string[]
  contractTypeIds: string[]
  visaTypeIds: string[]
  inCountry: StaffListInCountryFilter
  branchScopeKinds: EmployeeBranchScopeKind[]
  compliance: StaffListComplianceFilter
}

export const DEFAULT_STAFF_LIST_FILTERS: StaffListFiltersState = {
  search: '',
  statusIds: [],
  allStatuses: true,
  locationIds: [],
  roleIds: [],
  jobTitleIds: [],
  gradeIds: [],
  contractTypeIds: [],
  visaTypeIds: [],
  inCountry: 'all',
  branchScopeKinds: [],
  compliance: 'all',
}

const BRANCH_SCOPE_KINDS: EmployeeBranchScopeKind[] = [
  'all-zones',
  'single',
  'multiple',
  'none',
]

const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function parseStaffListCommaIds(value?: string | null): string[] {
  if (!value?.trim()) return []
  return value.split(',').map((id) => id.trim()).filter(Boolean)
}

export function parseStaffListBranchScopeKinds(value?: string | null): EmployeeBranchScopeKind[] {
  const allowed = new Set(BRANCH_SCOPE_KINDS)
  return parseStaffListCommaIds(value).filter((kind): kind is EmployeeBranchScopeKind =>
    allowed.has(kind as EmployeeBranchScopeKind),
  )
}

export function staffListIdsToComma(ids: string[]): string | undefined {
  const unique = [...new Set(ids.filter(Boolean))]
  return unique.length ? unique.join(',') : undefined
}

export function staffListSearchToFilters(search: StaffListSearch): StaffListFiltersState {
  const rawStatus = search.status?.trim()
  let allStatuses = true
  let statusIds: string[] = []

  if (rawStatus?.toLowerCase() === 'all') {
    allStatuses = true
  } else if (rawStatus) {
    const parts = parseStaffListCommaIds(rawStatus)
    if (parts.every((part) => UUID_LIKE.test(part))) {
      statusIds = parts
      allStatuses = false
    }
  }

  const inCountry =
    search.inCountry === 'in' || search.inCountry === 'out' ? search.inCountry : 'all'
  const compliance =
    search.compliance === 'needs_attention' || search.compliance === 'up_to_date'
      ? search.compliance
      : 'all'

  return {
    search: search.q?.trim() ?? '',
    statusIds,
    allStatuses,
    locationIds: parseStaffListCommaIds(search.branch),
    roleIds: parseStaffListCommaIds(search.role),
    jobTitleIds: parseStaffListCommaIds(search.jobTitle),
    gradeIds: parseStaffListCommaIds(search.grade),
    contractTypeIds: parseStaffListCommaIds(search.contract),
    visaTypeIds: parseStaffListCommaIds(search.immigration),
    inCountry,
    branchScopeKinds: parseStaffListBranchScopeKinds(search.branchScope),
    compliance,
  }
}

export function staffListFiltersToSearch(filters: StaffListFiltersState): StaffListSearch {
  const out: StaffListSearch = {}
  const q = filters.search.trim()
  if (q) out.q = q
  // Default is all statuses — only persist status when narrowed.
  if (!filters.allStatuses && filters.statusIds.length) {
    out.status = staffListIdsToComma(filters.statusIds)
  }
  const branch = staffListIdsToComma(filters.locationIds)
  if (branch) out.branch = branch
  const role = staffListIdsToComma(filters.roleIds)
  if (role) out.role = role
  const jobTitle = staffListIdsToComma(filters.jobTitleIds)
  if (jobTitle) out.jobTitle = jobTitle
  const grade = staffListIdsToComma(filters.gradeIds)
  if (grade) out.grade = grade
  const contract = staffListIdsToComma(filters.contractTypeIds)
  if (contract) out.contract = contract
  const immigration = staffListIdsToComma(filters.visaTypeIds)
  if (immigration) out.immigration = immigration
  if (filters.inCountry === 'in') out.inCountry = 'in'
  if (filters.inCountry === 'out') out.inCountry = 'out'
  const branchScope = staffListIdsToComma(filters.branchScopeKinds)
  if (branchScope) out.branchScope = branchScope
  if (filters.compliance === 'needs_attention' || filters.compliance === 'up_to_date') {
    out.compliance = filters.compliance
  }
  return out
}

export function defaultActiveStatusId(lookups: EmployeeLookupsBundle | null): string | undefined {
  return lookups?.employeeStatuses.find((row) => row.name.toLowerCase() === 'active')?.id
}

export function staffListFiltersToListParams(
  filters: StaffListFiltersState,
  lookups: EmployeeLookupsBundle | null,
  sort?: { sortBy?: StaffListSortKey; sortOrder?: 'asc' | 'desc' },
): ListEmployeesParams {
  const params: ListEmployeesParams = {
    page: 1,
    limit: 100,
    sortOrder: sort?.sortOrder ?? 'desc',
  }

  if (sort?.sortBy) params.sortBy = sort.sortBy

  if (filters.allStatuses) {
    // no status filter — show active + inactive (and any other statuses)
  } else if (filters.statusIds.length === 1) {
    params.statusId = filters.statusIds[0]
  } else if (filters.statusIds.length > 1) {
    params.statusIds = filters.statusIds
  }
  // Empty statusIds without allStatuses: also unscoped (same as all)

  const search = filters.search.trim()
  if (search) params.search = search
  if (filters.locationIds.length) params.locationIds = filters.locationIds
  if (filters.roleIds.length) params.roleIds = filters.roleIds
  if (filters.jobTitleIds.length) params.jobTitleIds = filters.jobTitleIds
  if (filters.gradeIds.length) params.gradeIds = filters.gradeIds
  if (filters.contractTypeIds.length) params.contractTypeIds = filters.contractTypeIds
  if (filters.visaTypeIds.length) params.visaTypeIds = filters.visaTypeIds
  if (filters.inCountry === 'in') params.isInCountry = true
  if (filters.inCountry === 'out') params.isInCountry = false
  if (filters.branchScopeKinds.length) params.branchScopeKinds = filters.branchScopeKinds
  if (filters.compliance === 'needs_attention' || filters.compliance === 'up_to_date') {
    params.complianceFilter = filters.compliance
  }
  return params
}

export function staffListFiltersToCohortParams(
  filters: StaffListFiltersState,
  lookups: EmployeeLookupsBundle | null,
): Omit<ListEmployeesParams, 'page' | 'limit' | 'sortBy' | 'sortOrder'> {
  const { page: _page, limit: _limit, sortBy: _sortBy, sortOrder: _sortOrder, ...cohort } =
    staffListFiltersToListParams(filters, lookups)
  return cohort
}

export type StaffListFilterChipKey =
  | 'locationIds'
  | 'branchScopeKinds'
  | 'roleIds'
  | 'jobTitleIds'
  | 'gradeIds'
  | 'contractTypeIds'
  | 'statusIds'
  | 'visaTypeIds'
  | 'inCountry'
  | 'compliance'

export type StaffListFilterGroupId = 'organisation' | 'job' | 'status' | 'immigration'

export type StaffListFilterChip = {
  key: StaffListFilterChipKey
  label: string
}

export type StaffListRemovableFilterChip = StaffListFilterChip & {
  onRemove: () => void
}

export const STAFF_LIST_FILTER_GROUPS = ['organisation', 'job', 'status', 'immigration'] as const

export const STAFF_LIST_FILTER_GROUP_CHIP_KEYS: Record<StaffListFilterGroupId, StaffListFilterChipKey[]> = {
  organisation: ['locationIds', 'branchScopeKinds'],
  job: ['roleIds', 'jobTitleIds', 'gradeIds', 'contractTypeIds'],
  status: ['statusIds', 'compliance'],
  immigration: ['visaTypeIds', 'inCountry'],
}

const BRANCH_SCOPE_CHIP_LABELS: Record<EmployeeBranchScopeKind, string> = {
  'all-zones': 'All branches scope',
  single: 'Single branch scope',
  multiple: 'Multiple branches scope',
  none: 'No branch assigned',
}

function lookupNameMap(rows?: { id: string; name: string }[]): Record<string, string> {
  return Object.fromEntries((rows ?? []).map((row) => [row.id, row.name]))
}

function formatNamedIdChipLabel(
  ids: string[],
  labels: Record<string, string>,
  empty: { one: string; many: (n: number) => string },
): string {
  const names = ids.map((id) => labels[id]?.trim()).filter((name): name is string => Boolean(name))
  if (names.length === 0) {
    return ids.length === 1 ? empty.one : empty.many(ids.length)
  }
  if (names.length <= 2) return names.join(', ')
  return `${names[0]}, ${names[1]} +${names.length - 2}`
}

function prefixedNamedChip(
  prefix: string,
  ids: string[],
  labels: Record<string, string>,
  empty: { one: string; many: (n: number) => string },
): string {
  return `${prefix}: ${formatNamedIdChipLabel(ids, labels, empty)}`
}

export function describeStaffListFilterChips(
  filters: StaffListFiltersState,
  lookups?: EmployeeLookupsBundle | null,
  visaLabels?: Map<string, string>,
  options?: { omitLocation?: boolean },
): StaffListFilterChip[] {
  const chips: StaffListFilterChip[] = []

  if (!options?.omitLocation && filters.locationIds.length) {
    chips.push({
      key: 'locationIds',
      label: prefixedNamedChip('Branch', filters.locationIds, lookupNameMap(lookups?.locations), {
        one: '1 branch',
        many: (n) => `${n} branches`,
      }),
    })
  }

  if (filters.branchScopeKinds.length) {
    const labels = Object.fromEntries(
      filters.branchScopeKinds.map((kind) => [kind, BRANCH_SCOPE_CHIP_LABELS[kind]]),
    )
    chips.push({
      key: 'branchScopeKinds',
      label: formatNamedIdChipLabel(filters.branchScopeKinds, labels, {
        one: '1 branch scope',
        many: (n) => `${n} branch scopes`,
      }),
    })
  }

  if (filters.roleIds.length) {
    chips.push({
      key: 'roleIds',
      label: prefixedNamedChip('Role', filters.roleIds, lookupNameMap(lookups?.roles), {
        one: '1 role',
        many: (n) => `${n} roles`,
      }),
    })
  }

  if (filters.jobTitleIds.length) {
    chips.push({
      key: 'jobTitleIds',
      label: prefixedNamedChip('Job title', filters.jobTitleIds, lookupNameMap(lookups?.jobTitles), {
        one: '1 job title',
        many: (n) => `${n} job titles`,
      }),
    })
  }

  if (filters.gradeIds.length) {
    chips.push({
      key: 'gradeIds',
      label: prefixedNamedChip('Grade', filters.gradeIds, lookupNameMap(lookups?.grades), {
        one: '1 grade',
        many: (n) => `${n} grades`,
      }),
    })
  }

  if (filters.contractTypeIds.length) {
    chips.push({
      key: 'contractTypeIds',
      label: prefixedNamedChip(
        'Employment',
        filters.contractTypeIds,
        lookupNameMap(lookups?.contractTypes),
        { one: '1 type', many: (n) => `${n} types` },
      ),
    })
  }

  if (!filters.allStatuses && filters.statusIds.length) {
    chips.push({
      key: 'statusIds',
      label: prefixedNamedChip('Status', filters.statusIds, lookupNameMap(lookups?.employeeStatuses), {
        one: '1 status',
        many: (n) => `${n} statuses`,
      }),
    })
  }

  if (filters.visaTypeIds.length) {
    const labels = Object.fromEntries(
      filters.visaTypeIds.map((id) => [id, visaLabels?.get(id) ?? id]),
    )
    chips.push({
      key: 'visaTypeIds',
      label: prefixedNamedChip('Immigration', filters.visaTypeIds, labels, {
        one: '1 immigration type',
        many: (n) => `${n} immigration types`,
      }),
    })
  }

  if (filters.inCountry === 'in') {
    chips.push({ key: 'inCountry', label: 'In country' })
  }
  if (filters.inCountry === 'out') {
    chips.push({ key: 'inCountry', label: 'Out of country' })
  }

  if (filters.compliance === 'needs_attention') {
    chips.push({ key: 'compliance', label: 'Compliance: needs attention' })
  }
  if (filters.compliance === 'up_to_date') {
    chips.push({ key: 'compliance', label: 'Compliance: up to date' })
  }

  return chips
}

export function clearStaffListFilterChip(
  filters: StaffListFiltersState,
  key: StaffListFilterChipKey,
): StaffListFiltersState {
  switch (key) {
    case 'locationIds':
      return { ...filters, locationIds: [] }
    case 'branchScopeKinds':
      return { ...filters, branchScopeKinds: [] }
    case 'roleIds':
      return { ...filters, roleIds: [] }
    case 'jobTitleIds':
      return { ...filters, jobTitleIds: [] }
    case 'gradeIds':
      return { ...filters, gradeIds: [] }
    case 'contractTypeIds':
      return { ...filters, contractTypeIds: [] }
    case 'statusIds':
      return { ...filters, statusIds: [], allStatuses: true }
    case 'visaTypeIds':
      return { ...filters, visaTypeIds: [] }
    case 'inCountry':
      return { ...filters, inCountry: 'all' }
    case 'compliance':
      return { ...filters, compliance: 'all' }
  }
}

export function countActiveStaffListFilters(
  filters: StaffListFiltersState,
  options?: { omitLocation?: boolean },
): number {
  return describeStaffListFilterChips(filters, null, undefined, options).length
}

export function countStaffListFiltersInGroup(
  filters: StaffListFiltersState,
  group: StaffListFilterGroupId,
  options?: { omitLocation?: boolean },
): number {
  const keys = new Set<StaffListFilterChipKey>(STAFF_LIST_FILTER_GROUP_CHIP_KEYS[group])
  return describeStaffListFilterChips(filters, null, undefined, options).filter((chip) =>
    keys.has(chip.key),
  ).length
}

export function staffListFilterChips(
  filters: StaffListFiltersState,
  lookups: EmployeeLookupsBundle | null,
  onChange: (next: StaffListFiltersState) => void,
  visaLabels?: Map<string, string>,
  options?: { omitLocation?: boolean },
): StaffListRemovableFilterChip[] {
  return describeStaffListFilterChips(filters, lookups, visaLabels, options).map((chip) => ({
    ...chip,
    onRemove: () => onChange(clearStaffListFilterChip(filters, chip.key)),
  }))
}

export function hasStaffListFilters(filters: StaffListFiltersState): boolean {
  return Boolean(filters.search.trim()) || countActiveStaffListFilters(filters) > 0
}
