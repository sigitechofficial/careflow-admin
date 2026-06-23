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
  allStatuses: false,
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
  let allStatuses = false
  let statusIds: string[] = []

  if (rawStatus?.toLowerCase() === 'all') {
    allStatuses = true
  } else if (rawStatus) {
    const parts = parseStaffListCommaIds(rawStatus)
    if (parts.every((part) => UUID_LIKE.test(part))) {
      statusIds = parts
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
  if (filters.allStatuses) {
    out.status = 'all'
  } else if (filters.statusIds.length) {
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
    // no status filter
  } else if (filters.statusIds.length === 1) {
    params.statusId = filters.statusIds[0]
  } else if (filters.statusIds.length > 1) {
    params.statusIds = filters.statusIds
  } else {
    const activeId = defaultActiveStatusId(lookups)
    if (activeId) params.statusId = activeId
  }

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

export type StaffListFilterChip = {
  key: string
  label: string
  onRemove: () => void
}

export function staffListFilterChips(
  filters: StaffListFiltersState,
  lookups: EmployeeLookupsBundle | null,
  onChange: (next: StaffListFiltersState) => void,
  visaLabels?: Map<string, string>,
): StaffListFilterChip[] {
  const chips: StaffListFilterChip[] = []
  const nameFor = (rows: { id: string; name: string }[], id: string) =>
    rows.find((row) => row.id === id)?.name ?? id

  if (filters.search.trim()) {
    chips.push({
      key: 'search',
      label: `Search: ${filters.search.trim()}`,
      onRemove: () => onChange({ ...filters, search: '' }),
    })
  }

  if (filters.allStatuses) {
    chips.push({
      key: 'status-all',
      label: 'Status: all',
      onRemove: () =>
        onChange({
          ...filters,
          allStatuses: false,
          statusIds: defaultActiveStatusId(lookups) ? [defaultActiveStatusId(lookups)!] : [],
        }),
    })
  } else if (filters.statusIds.length) {
    const activeId = defaultActiveStatusId(lookups)
    const isDefaultActiveOnly =
      filters.statusIds.length === 1 && activeId && filters.statusIds[0] === activeId
    if (!isDefaultActiveOnly) {
      for (const id of filters.statusIds) {
        chips.push({
          key: `status-${id}`,
          label: `Status: ${nameFor(lookups?.employeeStatuses ?? [], id)}`,
          onRemove: () =>
            onChange({
              ...filters,
              statusIds: filters.statusIds.filter((value) => value !== id),
            }),
        })
      }
    }
  }

  for (const id of filters.locationIds) {
    chips.push({
      key: `branch-${id}`,
      label: `Branch: ${nameFor(lookups?.locations ?? [], id)}`,
      onRemove: () =>
        onChange({
          ...filters,
          locationIds: filters.locationIds.filter((value) => value !== id),
        }),
    })
  }

  for (const id of filters.roleIds) {
    chips.push({
      key: `role-${id}`,
      label: `Role: ${nameFor(lookups?.roles ?? [], id)}`,
      onRemove: () =>
        onChange({
          ...filters,
          roleIds: filters.roleIds.filter((value) => value !== id),
        }),
    })
  }

  for (const id of filters.jobTitleIds) {
    chips.push({
      key: `job-${id}`,
      label: `Job title: ${nameFor(lookups?.jobTitles ?? [], id)}`,
      onRemove: () =>
        onChange({
          ...filters,
          jobTitleIds: filters.jobTitleIds.filter((value) => value !== id),
        }),
    })
  }

  for (const id of filters.gradeIds) {
    chips.push({
      key: `grade-${id}`,
      label: `Grade: ${nameFor(lookups?.grades ?? [], id)}`,
      onRemove: () =>
        onChange({
          ...filters,
          gradeIds: filters.gradeIds.filter((value) => value !== id),
        }),
    })
  }

  for (const id of filters.contractTypeIds) {
    chips.push({
      key: `contract-${id}`,
      label: `Employment: ${nameFor(lookups?.contractTypes ?? [], id)}`,
      onRemove: () =>
        onChange({
          ...filters,
          contractTypeIds: filters.contractTypeIds.filter((value) => value !== id),
        }),
    })
  }

  for (const id of filters.visaTypeIds) {
    chips.push({
      key: `visa-${id}`,
      label: `Immigration: ${visaLabels?.get(id) ?? id}`,
      onRemove: () =>
        onChange({
          ...filters,
          visaTypeIds: filters.visaTypeIds.filter((value) => value !== id),
        }),
    })
  }

  if (filters.inCountry === 'in') {
    chips.push({
      key: 'in-country',
      label: 'In country',
      onRemove: () => onChange({ ...filters, inCountry: 'all' }),
    })
  }
  if (filters.inCountry === 'out') {
    chips.push({
      key: 'out-country',
      label: 'Out of country',
      onRemove: () => onChange({ ...filters, inCountry: 'all' }),
    })
  }

  const branchScopeLabels: Record<EmployeeBranchScopeKind, string> = {
    'all-zones': 'All branches scope',
    single: 'Single branch scope',
    multiple: 'Multiple branches scope',
    none: 'No branch assigned',
  }
  for (const kind of filters.branchScopeKinds) {
    chips.push({
      key: `scope-${kind}`,
      label: branchScopeLabels[kind],
      onRemove: () =>
        onChange({
          ...filters,
          branchScopeKinds: filters.branchScopeKinds.filter((value) => value !== kind),
        }),
    })
  }

  if (filters.compliance === 'needs_attention') {
    chips.push({
      key: 'compliance-attention',
      label: 'Compliance: needs attention',
      onRemove: () => onChange({ ...filters, compliance: 'all' }),
    })
  }
  if (filters.compliance === 'up_to_date') {
    chips.push({
      key: 'compliance-ok',
      label: 'Compliance: up to date',
      onRemove: () => onChange({ ...filters, compliance: 'all' }),
    })
  }

  return chips
}

export function hasStaffListFilters(filters: StaffListFiltersState): boolean {
  return staffListFilterChips(filters, null, () => {}).length > 0
}
