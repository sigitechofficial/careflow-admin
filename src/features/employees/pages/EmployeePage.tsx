import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  Users, ShieldCheck, Star, Award, Activity, TrendingUp,
  PenLine, Plus, X, Filter, FileText, Globe,
  ChevronDown, ChevronUp, ChevronsUpDown,
} from 'lucide-react'
import { cn, formatDate } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import {
  type EmployeeChartSummary,
  type EmployeeListRow,
  type EmployeeLookupsBundle,
} from '@/features/employees/types'
import {
  useEmployeeChartSummary,
  useEmployees,
  useEmployeeLookups,
  useEmployeeListFacets,
} from '@/features/employees/hooks/useEmployees'
import { usePatchAnyEmployeeStatus } from '@/features/employees/hooks/useEmployeeMutations'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import { resolveEmployeeVisaTypes } from '@/features/settings/employee/employee-visa-defaults'
import { useEmployeeReviewsOverview } from '@/features/employees/hooks/useEmployeeReviews'
import { EmployeeSkillsTab } from '@/features/employees/components/EmployeeSkillsTab'
import { StaffListBranchesCell } from '@/features/employees/components/StaffListBranchesCell'
import { StaffListFilters } from '@/features/employees/components/StaffListFilters'
import { EmployeeNonCoreActivityTab } from '@/features/employees/components/EmployeeNonCoreActivityTab'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip'
import {
  describeEmployeeBranchScope,
  staffListBranchScopeLabel,
} from '@/features/scheduling/utils/employee-branch-scope.util'
import {
  type StaffListSearch,
  type StaffListSortKey,
  staffListFiltersToListParams,
  staffListFiltersToSearch,
  staffListFiltersToCohortParams,
  staffListSearchToFilters,
  staffListSearchToSort,
  hasStaffListFilters,
} from '@/features/employees/utils/staff-list-filter.util'
import { pruneStaffListFiltersToFacets } from '@/features/employees/utils/staff-list-facet.util'
import { Switch } from '@/shared/ui/toggle-controls'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/ui/dialog'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'

/* --- Types --------------------------------------------------- */
type TabId = 'staff-list' | 'compliance' | 'review-status' | 'skills' | 'non-core-activity' | 'reports'

interface EmployeePageProps {
  activeTab?: TabId
  onTabChange?: (tab: TabId) => void
}

/* --- Sample Data --------------------------------------------- */
const employeeReports = [
  { title: 'Carer Activity Summary Report',      desc: 'reports on the actions completed by Employee and the notes they left' },
  { title: 'Compliance Report',                 desc: 'shows certifications/skills that are nearing or past their expiry date' },
  { title: 'Employee Compliance Detail report', desc: 'Shows all employees compliance documentation, highlighting missing and expired compliance.' },
  { title: 'Staff Analysis Reports',            desc: 'this highlights all items that are overdue or nearing like Reviews, Skills, Work Certification and Compliance.' },
  { title: 'Employee Role Reports',             desc: 'provide role detail for each member of Employee' },
  { title: 'Employee Leaving Report',           desc: 'Provide Employee leaving details' },
  { title: 'Employee Detail Report',            desc: 'show detailed information about all non deleted Employee.' },
  { title: 'Holiday Reports',                   desc: 'Shows Holiday Records of all Employee' },
]

/* --- Tab config ----------------------------------------------- */
const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'staff-list',        label: 'Staff List',        icon: <Users className="h-5 w-5" /> },
  { id: 'compliance',        label: 'Compliance',        icon: <ShieldCheck className="h-5 w-5" /> },
  { id: 'review-status',     label: 'Review Status',     icon: <Star className="h-5 w-5" /> },
  { id: 'skills',            label: 'Skills',            icon: <Award className="h-5 w-5" /> },
  { id: 'non-core-activity', label: 'Non Core Activity', icon: <Activity className="h-5 w-5" /> },
  { id: 'reports',           label: 'Reports',           icon: <TrendingUp className="h-5 w-5" /> },
]

/* --- Main Component ------------------------------------------- */
export default function EmployeePage({ activeTab: initialTab = 'staff-list', onTabChange }: EmployeePageProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>(initialTab)
  const [allEmployee, setAllEmployee] = React.useState(false)
  const [hideNoLonger, setHideNoLonger] = React.useState(true)
  const [complianceSelect, setComplianceSelect] = React.useState('Expired')

  React.useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  const routeSearch = useSearch({ strict: false }) as StaffListSearch
  const { data: lookups = null } = useEmployeeLookups(activeTab === 'staff-list')

  const chartCohortParams = React.useMemo(() => {
    if (activeTab !== 'staff-list') return undefined
    const filters = staffListSearchToFilters(routeSearch ?? {})
    return staffListFiltersToCohortParams(filters, lookups)
  }, [activeTab, routeSearch, lookups])

  const { data: chartSummary = null, isLoading: chartLoading, error: chartErrorObj } =
    useEmployeeChartSummary(chartCohortParams)
  const chartError = chartErrorObj
    ? (chartErrorObj instanceof ApiError ? chartErrorObj.message : 'Could not load chart summary.')
    : null

  const handleTab = (id: TabId) => {
    setActiveTab(id)
    onTabChange?.(id)
  }

  return (
    <div className="space-y-4" data-testid="employee-management-page">
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Employee Management
          </div>
          <p className="text-sm text-muted-foreground">
            Manage staff, compliance, reviews, and reports.
          </p>
        </div>
      </div>

      {/* -- Top Charts ------------------------------------------- */}
      {chartSummary?.meta?.scope === 'filtered' ? (
        <p className="text-xs text-muted-foreground">
          Charts reflect the same employees as the staff list
          ({chartSummary.meta.cohortTotal} in cohort).
        </p>
      ) : activeTab !== 'staff-list' ? (
        <p className="text-xs text-muted-foreground">Organisation-wide summary.</p>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StaffStatusCard loading={chartLoading} error={chartError} staff={chartSummary?.staff ?? null} />
        <ComplianceCard loading={chartLoading} error={chartError} compliance={chartSummary?.compliance ?? null} />
        <SkillsChartCard loading={chartLoading} error={chartError} skills={chartSummary?.skills ?? null} />
        <ReviewsCard loading={chartLoading} error={chartError} reviews={chartSummary?.reviews ?? null} />
      </div>

      {/* -- Tab Navigation + Content ----------------------------- */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        {/* Tab bar */}
        <div
          className="flex h-16 shrink-0 items-stretch overflow-x-auto overflow-y-hidden border-b border-border"
          role="tablist"
          aria-label="Employee sections"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              id={`employee-tab-${tab.id}`}
              data-testid={`employee-tab-${tab.id}`}
              onClick={() => handleTab(tab.id)}
              className={cn(
                'flex h-full min-w-[90px] flex-col items-center justify-center gap-1 px-5 text-xs font-medium whitespace-nowrap',
                'border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <span className={cn(activeTab === tab.id ? 'text-primary' : 'text-muted-foreground/70')}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="p-5" role="tabpanel" aria-labelledby={`employee-tab-${activeTab}`}>
          {activeTab === 'staff-list' && <StaffListTab />}
          {activeTab === 'compliance' && (
            <ComplianceTab
              allEmployee={allEmployee}
              setAllEmployee={setAllEmployee}
              hideNoLonger={hideNoLonger}
              setHideNoLonger={setHideNoLonger}
              complianceSelect={complianceSelect}
              setComplianceSelect={setComplianceSelect}
            />
          )}
          {activeTab === 'review-status' && <ReviewStatusTab />}
          {activeTab === 'skills' && <EmployeeSkillsTab />}
          {activeTab === 'non-core-activity' && <EmployeeNonCoreActivityTab />}
          {activeTab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </div>
  )
}

/* --- Staff Status Card --------------------------------------- */
function StaffStatusCard({
  loading,
  error,
  staff,
}: {
  loading: boolean
  error: string | null
  staff: EmployeeChartSummary['staff'] | null
}) {
  const inactive = staff?.inactive ?? 0
  const active = staff?.active ?? 0
  const total = staff?.total ?? 0
  const axisMax = Math.max(10, inactive, active, total)
  const step = Math.max(1, Math.ceil(axisMax / 4))
  const tickMax = step * 4
  const ticks = [0, step, step * 2, step * 3, tickMax]

  const bars = [
    { label: 'Inactive', val: inactive, max: tickMax },
    { label: 'Active', val: active, max: tickMax },
    { label: 'Total Staff', val: total, max: tickMax },
  ]

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <h3 className="text-center font-bold text-sm mb-4">Staff Status Chart</h3>
      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-6">Loading?</p>
      ) : error ? (
        <p className="text-xs text-amber-800 dark:text-amber-200 text-center">{error}</p>
      ) : (
        <div className="space-y-2">
          {bars.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <span className="w-[72px] text-right text-muted-foreground shrink-0">{item.label}</span>
              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                <div
                  className="h-full rounded bg-blue-400 transition-all"
                  style={{ width: `${item.max > 0 ? (item.val / item.max) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
          <div className="flex justify-between text-[10px] text-muted-foreground pl-[80px] pr-1 pt-1">
            {ticks.map(v => <span key={v}>{v}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

const COMPLIANCE_PIE_COLORS = { up: '#1e3a4a', near: '#4db6d4' }

/* --- Compliance Card ----------------------------------------- */
function ComplianceCard({
  loading,
  error,
  compliance,
}: {
  loading: boolean
  error: string | null
  compliance: EmployeeChartSummary['compliance'] | null
}) {
  const up = compliance?.upToDate ?? 0
  const near = compliance?.needsAttention ?? 0
  const pieData = [
    { name: 'Up to date', value: up, color: COMPLIANCE_PIE_COLORS.up },
    { name: 'Nearing completion', value: near, color: COMPLIANCE_PIE_COLORS.near },
  ]
  const hasData = up + near > 0

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col items-center">
      <h3 className="font-bold text-sm mb-1">Compliance</h3>
      {loading ? (
        <p className="text-xs text-muted-foreground py-12">Loading?</p>
      ) : error ? (
        <p className="text-xs text-amber-800 dark:text-amber-200 text-center px-2 py-6">{error}</p>
      ) : !hasData ? (
        <p className="text-xs text-muted-foreground py-12 text-center px-2">No compliance records yet.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={58} dataKey="value" startAngle={90} endAngle={-270}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-[10px] mt-1 flex-wrap justify-center">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="text-foreground font-medium">({d.value})</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* --- Skills Chart Card --------------------------------------- */
function SkillsChartCard({
  loading,
  error,
  skills,
}: {
  loading: boolean
  error: string | null
  skills: EmployeeChartSummary['skills'] | null
}) {
  const pieData = skills?.filter(s => s.value > 0) ?? []
  const hasData = pieData.length > 0
  const totalAssignments = pieData.reduce((acc, s) => acc + s.value, 0)

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex w-full min-w-0 flex-col items-center">
      <h3 className="font-bold text-sm mb-0.5">Skills Chart</h3>
      {loading || error ? null : hasData ? (
        <p className="mb-2 text-center text-[10px] text-muted-foreground">
          {totalAssignments} skill assignment{totalAssignments === 1 ? '' : 's'} ? from database
        </p>
      ) : (
        <p className="mb-2 text-center text-[10px] text-muted-foreground">From employee skill assignments</p>
      )}
      {loading ? (
        <p className="text-xs text-muted-foreground py-12">Loading?</p>
      ) : error ? (
        <p className="text-xs text-amber-800 dark:text-amber-200 text-center px-2 py-6">{error}</p>
      ) : !hasData ? (
        <p className="text-xs text-muted-foreground py-12 text-center px-2">No skill assignments yet.</p>
      ) : (
        <>
          <div className="h-[150px] w-full min-w-0 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value, name) => {
                    const n = typeof value === 'number' ? value : Number(value)
                    const label = typeof name === 'string' ? name : String(name ?? '')
                    return [`${Number.isFinite(n) ? n : 0} record${n === 1 ? '' : 's'}`, label]
                  }}
                  contentStyle={{
                    fontSize: '11px',
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                  }}
                />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={62}
                  innerRadius={0}
                  paddingAngle={1}
                  startAngle={90}
                  endAngle={-270}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={`${entry.name}-${i}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

const REVIEWS_PIE_COLORS = { reviewed: '#7ec8d8', outstanding: '#b8e8ee' }

/* --- Reviews Card -------------------------------------------- */
function ReviewsCard({
  loading,
  error,
  reviews,
}: {
  loading: boolean
  error: string | null
  reviews: EmployeeChartSummary['reviews'] | null
}) {
  const reviewed = reviews?.reviewed ?? 0
  const outstanding = reviews?.outstanding ?? 0
  const pieData = [
    { name: 'Reviewed', value: reviewed, color: REVIEWS_PIE_COLORS.reviewed },
    { name: 'Outstanding', value: outstanding, color: REVIEWS_PIE_COLORS.outstanding },
  ]
  const hasData = reviewed + outstanding > 0

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col items-center">
      <h3 className="font-bold text-sm mb-1">Reviews</h3>
      {loading ? (
        <p className="text-xs text-muted-foreground py-12">Loading?</p>
      ) : error ? (
        <p className="text-xs text-amber-800 dark:text-amber-200 text-center px-2 py-6">{error}</p>
      ) : !hasData ? (
        <p className="text-xs text-muted-foreground py-12 text-center px-2">No reviews yet.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={145}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={65} dataKey="value" startAngle={90} endAngle={-270}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-[10px] mt-1 flex-wrap justify-center">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="text-foreground font-medium">({d.value})</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const AVATAR_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4']

function staffRowInitials(row: EmployeeListRow) {
  if (row.firstName?.trim() && row.lastName?.trim()) {
    return `${row.firstName[0]}${row.lastName[0]}`.toUpperCase()
  }
  const full = row.fullName?.trim()
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean)
    const first = parts[0]
    const second = parts[1]
    if (first && second) return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase()
    if (first && first.length >= 2) return first.slice(0, 2).toUpperCase()
    if (first) return first.slice(0, 1).toUpperCase()
  }
  return '?'
}

function staffAvatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function activeInactiveLookups(L: EmployeeLookupsBundle | null) {
  if (!L) return { active: undefined, inactive: undefined } as const
  const active = L.employeeStatuses.find(s => s.name.toLowerCase() === 'active')
  const inactive = L.employeeStatuses.find(s => s.name.toLowerCase() === 'inactive')
  return { active, inactive } as const
}

function staffRowEffectiveStatus(emp: EmployeeListRow) {
  const label = emp.status?.name ?? (emp.isActive ? 'Active' : 'Inactive')
  return { label, norm: label.toLowerCase() }
}

function staffRowIsActive(emp: EmployeeListRow): boolean {
  return staffRowEffectiveStatus(emp).norm === 'active'
}

function staffStatusToggleable(emp: EmployeeListRow): boolean {
  const { norm } = staffRowEffectiveStatus(emp)
  return norm === 'active' || norm === 'inactive'
}

/* --- Staff List Tab ------------------------------------------- */
const STAFF_LIST_SORTABLE_COLUMNS: Array<{
  label: string
  sortKey?: StaffListSortKey
}> = [
  { label: 'Picture' },
  { label: 'Employee Name', sortKey: 'name' },
  { label: 'Status', sortKey: 'status' },
  { label: 'Branch scope' },
  { label: 'Branches' },
  { label: 'Role', sortKey: 'role' },
  { label: 'Employment Type', sortKey: 'contractType' },
  { label: 'Action' },
]

function StaffListTab() {
  const navigate = useNavigate()
  const urlSearch = useSearch({ strict: false }) as StaffListSearch
  const canCreateEmployee = useAuthStore(s => s.can('employees.create'))
  const canUpdateEmployee = useAuthStore(s => s.can('employees.update'))
  const canUpdateEmployeeStatus = useAuthStore(s => s.can('employees.status.update'))
  const patchStatus = usePatchAnyEmployeeStatus()

  const filters = React.useMemo(() => staffListSearchToFilters(urlSearch), [urlSearch])
  const sort = React.useMemo(() => staffListSearchToSort(urlSearch), [urlSearch])
  const [searchInput, setSearchInput] = React.useState(filters.search)
  const { locationIds: globalLocationIds, isScoped: globalLocationScoped } =
    useGlobalLocationScope()

  React.useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  const applyFilters = React.useCallback(
    (next: typeof filters) => {
      void navigate({
        to: '/employee/staff-list',
        search: staffListFiltersToSearch(next),
        replace: true,
      })
    },
    [navigate],
  )

  React.useEffect(() => {
    if (searchInput === filters.search) return
    const timer = window.setTimeout(() => {
      applyFilters({ ...filters, search: searchInput })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput, filters.search, filters, applyFilters])

  const [statusBusyId, setStatusBusyId] = React.useState<string | null>(null)
  const [statusUpdateError, setStatusUpdateError] = React.useState<string | null>(null)

  const { data: lookups = null, isLoading: lookupsLoading, error: lookupsError } = useEmployeeLookups()
  const { data: generalSettings } = useGeneralSettings()
  const visaTypes = React.useMemo(
    () => resolveEmployeeVisaTypes(generalSettings?.employeeVisaTypes),
    [generalSettings?.employeeVisaTypes],
  )
  const listParams = React.useMemo(() => {
    const params = staffListFiltersToListParams(filters, lookups, sort)
    if (globalLocationScoped && globalLocationIds?.length) {
      params.locationIds = globalLocationIds
    }
    return params
  }, [filters, lookups, sort, globalLocationScoped, globalLocationIds])
  const facetParams = React.useMemo(() => {
    const params = staffListFiltersToCohortParams(filters, lookups)
    if (globalLocationScoped && globalLocationIds?.length) {
      params.locationIds = globalLocationIds
    }
    return params
  }, [filters, lookups, globalLocationScoped, globalLocationIds])
  const { data: facets = null } = useEmployeeListFacets(facetParams, Boolean(lookups))
  const { data: listData, isLoading: listLoading, error: listError } = useEmployees(listParams)

  const displayFilters = React.useMemo(
    () =>
      globalLocationScoped && globalLocationIds?.length
        ? { ...filters, locationIds: globalLocationIds }
        : filters,
    [filters, globalLocationScoped, globalLocationIds],
  )

  const applyFiltersWithScope = React.useCallback(
    (next: typeof filters) => {
      applyFilters(
        globalLocationScoped && globalLocationIds?.length
          ? { ...next, locationIds: globalLocationIds }
          : next,
      )
    },
    [applyFilters, globalLocationScoped, globalLocationIds],
  )

  const locationFilterKey = filters.locationIds.join(',')
  React.useEffect(() => {
    if (!facets) return
    const pruned = pruneStaffListFiltersToFacets(filters, facets)
    const changed =
      pruned.roleIds.join(',') !== filters.roleIds.join(',') ||
      pruned.jobTitleIds.join(',') !== filters.jobTitleIds.join(',') ||
      pruned.gradeIds.join(',') !== filters.gradeIds.join(',') ||
      pruned.contractTypeIds.join(',') !== filters.contractTypeIds.join(',') ||
      pruned.visaTypeIds.join(',') !== filters.visaTypeIds.join(',') ||
      pruned.statusIds.join(',') !== filters.statusIds.join(',')
    if (!changed) return
    applyFilters({ ...filters, ...pruned })
  }, [facets, locationFilterKey, filters, applyFilters])

  const rows: EmployeeListRow[] = listData?.rows ?? []
  const meta = { total: listData?.meta.total ?? 0 }
  const loading = lookupsLoading || listLoading
  const error = lookupsError
    ? (lookupsError instanceof ApiError ? lookupsError.message : 'Could not load employee lookups.')
    : listError
      ? (listError instanceof ApiError ? listError.message : 'Could not load employees.')
      : null
  const filtersActive = hasStaffListFilters(filters)

  const handleSort = React.useCallback(
    (sortKey: StaffListSortKey) => {
      const nextOrder =
        sort.sortBy === sortKey && sort.sortOrder === 'asc' ? 'desc' : 'asc'
      void navigate({
        to: '/employee/staff-list',
        search: {
          ...staffListFiltersToSearch(filters),
          sortBy: sortKey,
          sortOrder: nextOrder,
        },
        replace: true,
      })
    },
    [navigate, filters, sort.sortBy, sort.sortOrder],
  )

  const handleStatusToggle = React.useCallback(
    async (emp: EmployeeListRow, checked: boolean) => {
      if (!lookups) return
      const { active: activeSt, inactive: inactiveSt } = activeInactiveLookups(lookups)
      if (!activeSt || !inactiveSt) return
      if (staffRowIsActive(emp) === checked) return
      const nextId = checked ? activeSt.id : inactiveSt.id
      setStatusBusyId(emp.id)
      setStatusUpdateError(null)
      try {
        await patchStatus.mutateAsync({ employeeId: emp.id, statusId: nextId })
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Could not update status.'
        setStatusUpdateError(msg)
      } finally {
        setStatusBusyId(null)
      }
    },
    [lookups, patchStatus],
  )

  const { active: activeStatusLookup, inactive: inactiveStatusLookup } = activeInactiveLookups(lookups)
  const showStatusSwitch = Boolean(canUpdateEmployeeStatus && activeStatusLookup && inactiveStatusLookup)
  const locationNames = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const location of lookups?.locations ?? []) {
      map.set(location.id, location.name)
    }
    return map
  }, [lookups?.locations])

  const tableColumnCount = 12

  return (
    <div data-testid="employee-staff-list-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Employee Management</span>
          {canCreateEmployee ? (
            <button
              type="button"
              title="Add employee"
              aria-label="Add employee"
              data-testid="employee-add-button"
              onClick={() => navigate({ to: '/employee/add' })}
              className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <StaffListFilters
        lookups={lookups}
        visaTypes={visaTypes}
        facets={facets}
        filters={displayFilters}
        onFiltersChange={applyFiltersWithScope}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        disabled={loading}
        locationFilterDisabled={globalLocationScoped}
      />

      {error ? (
        <p className="mb-3 text-sm text-amber-800 dark:text-amber-200">{error}</p>
      ) : null}
      {statusUpdateError ? (
        <p className="mb-3 text-sm text-destructive">{statusUpdateError}</p>
      ) : null}
      {!loading && !error ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Showing {rows.length} of {meta.total} employee{meta.total === 1 ? '' : 's'} (up to 100 per page).
          {filtersActive ? ' Filters applied.' : ''}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1100px] text-sm" data-testid="employee-staff-table">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {STAFF_LIST_SORTABLE_COLUMNS.map((col) => (
                <th
                  key={col.label}
                  className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap"
                >
                  {col.sortKey ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.sortKey!)}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      aria-label={`Sort by ${col.label}`}
                    >
                      <span>{col.label}</span>
                      {sort.sortBy === col.sortKey ? (
                        sort.sortOrder === 'asc' ? (
                          <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr data-testid="employee-staff-loading">
                <td colSpan={tableColumnCount} className="px-3 py-10 text-center text-muted-foreground">
                  Loading?
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr data-testid="employee-staff-empty">
                <td colSpan={tableColumnCount} className="px-3 py-10 text-center text-muted-foreground">
                  {error
                    ? 'Could not load employees.'
                    : filtersActive
                      ? 'No employees match these filters.'
                      : 'No employees match this filter.'}
                </td>
              </tr>
            ) : (
              rows.map(emp => {
                const name = emp.fullName?.trim() || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || '?'
                const { label: statusLabel, norm: statusNorm } = staffRowEffectiveStatus(emp)
                const photoSrc = resolveMediaUrl(emp.photoUrl)
                const rowStatusSwitch =
                  showStatusSwitch && staffStatusToggleable(emp) ? (
                    <Switch
                      size="sm"
                      checked={staffRowIsActive(emp)}
                      disabled={statusBusyId === emp.id}
                      title={staffRowIsActive(emp) ? 'Set inactive' : 'Set active'}
                      aria-label={`Set ${name} to ${staffRowIsActive(emp) ? 'inactive' : 'active'}`}
                      onCheckedChange={checked => void handleStatusToggle(emp, checked)}
                    />
                  ) : null
                const branchScope = describeEmployeeBranchScope(emp, locationNames)
                return (
                  <tr
                    key={emp.id}
                    data-testid={`employee-row-${emp.id}`}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-3 py-3">
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: staffAvatarColor(emp.id) }}
                        >
                          {staffRowInitials(emp)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {name}
                        {emp.isInCountry === false ? (
                          <TooltipProvider delayDuration={200}>
                            <UiTooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="inline-flex text-amber-600 dark:text-amber-400"
                                  aria-label="Out of country"
                                  data-testid={`employee-out-of-country-${emp.id}`}
                                >
                                  <Globe className="h-4 w-4" aria-hidden />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">Out of country</TooltipContent>
                            </UiTooltip>
                          </TooltipProvider>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={statusNorm === 'active' ? 'success' : statusNorm === 'inactive' ? 'secondary' : 'info'}
                          size="sm"
                        >
                          {statusLabel}
                        </Badge>
                        {rowStatusSwitch}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {staffListBranchScopeLabel(branchScope)}
                    </td>
                    <td className="px-3 py-3 align-top text-muted-foreground">
                      <StaffListBranchesCell scope={branchScope} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{emp.role?.name ?? '?'}</td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {emp.contractType?.name ?? '?'}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        data-testid={`employee-edit-${emp.id}`}
                        className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                        title="Edit employee"
                        aria-label={`Edit ${name}`}
                        disabled={!canUpdateEmployee}
                        onClick={() =>
                          navigate({
                            to: '/employee/$employeeId/edit',
                            params: { employeeId: emp.id },
                          })
                        }
                      >
                        <PenLine className="h-4 w-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* --- Compliance Tab ------------------------------------------- */
function ComplianceTab({ allEmployee, setAllEmployee, hideNoLonger, setHideNoLonger, complianceSelect, setComplianceSelect }: {
  allEmployee: boolean
  setAllEmployee: (v: boolean) => void
  hideNoLonger: boolean
  setHideNoLonger: (v: boolean) => void
  complianceSelect: string
  setComplianceSelect: (v: string) => void
}) {
  return (
    <div data-testid="employee-compliance-panel">
      <h2 className="font-bold text-base mb-5">Employee Compliance</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5">
        {/* Left column */}
        <div className="space-y-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="radio" checked={allEmployee} onChange={() => setAllEmployee(true)} className="h-4 w-4 accent-primary" />
            <span className="text-sm">All Employee</span>
          </label>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Select Type</label>
            <select className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option>All</option>
              <option>Certification</option>
              <option>Skill</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm">Hide No Longer Required Compliances</span>
            <button
              type="button"
              data-testid="employee-compliance-hide-no-longer-toggle"
              aria-pressed={hideNoLonger}
              aria-label={hideNoLonger ? 'Hide no longer required compliances: on' : 'Hide no longer required compliances: off'}
              onClick={() => setHideNoLonger(!hideNoLonger)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors shrink-0',
                hideNoLonger ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'
              )}
            >
              {hideNoLonger ? 'YES' : 'NO'}
              <span className="h-3.5 w-3.5 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-3 cursor-pointer shrink-0">
              <input type="radio" checked={!allEmployee} onChange={() => setAllEmployee(false)} className="h-4 w-4 accent-primary" />
              <span className="text-sm">Select Employee</span>
            </label>
            <input
              type="text"
              placeholder="Search Employee..."
              className="flex-1 min-w-[160px] border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Select</label>
            <select
              value={complianceSelect}
              onChange={e => setComplianceSelect(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {['Expired', 'Nearing', 'All'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div className="flex justify-end">
            <Button size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --- Review Status Tab ---------------------------------------- */
function ReviewStatusTab() {
  const apiConfigured = Boolean(getApiBaseUrl())
  const jwtPresent = Boolean(useAuthStore(s => s.accessToken)?.includes('.'))
  const canRead = useAuthStore(s => s.can('employees.read'))
  const overviewQuery = useEmployeeReviewsOverview(apiConfigured && jwtPresent && canRead)
  const rows = overviewQuery.data ?? []

  const formatReviewDate = (iso: string | null | undefined) => {
    if (!iso) return '?'
    const formatted = formatDate(iso)
    return formatted === '—' ? '?' : formatted
  }

  const employeeName = (row: (typeof rows)[number]) => {
    const p = row.employee?.personalDetail
    if (!p) return '?'
    return `${p.firstName} ${p.lastName}`.trim()
  }

  const isOverdue = (nextDue: string | null | undefined) => {
    if (!nextDue) return false
    return new Date(nextDue).getTime() < Date.now()
  }

  if (overviewQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading review status?</p>
  }

  if (overviewQuery.error) {
    return (
      <p className="text-sm text-destructive">
        {overviewQuery.error instanceof ApiError
          ? overviewQuery.error.message
          : 'Could not load review status.'}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border" data-testid="employee-review-status-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {[
              { label: 'Employee', filter: true },
              { label: 'Review Type', filter: true },
              { label: 'Status', filter: false },
              { label: 'Last Done', filter: true },
              { label: 'Next Due', filter: true },
            ].map(col => (
              <th key={col.label} className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.filter && <Filter className="h-3 w-3 opacity-60" />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-muted-foreground">
                No staff review records yet.
              </td>
            </tr>
          ) : (
            rows.map(row => {
              const overdue = isOverdue(row.nextDue)
              return (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{employeeName(row)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.reviewType?.name ?? '?'}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={overdue ? 'warning' : 'success'} size="sm">
                      {row.status ?? (overdue ? 'Overdue' : 'Scheduled')}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{formatReviewDate(row.lastDone)}</td>
                  <td className={cn('px-3 py-2.5 font-medium', overdue ? 'text-destructive' : 'text-muted-foreground')}>
                    {formatReviewDate(row.nextDue)}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

/* --- Reports Tab --------------------------------------------- */
function ReportsTab() {
  return (
    <div data-testid="employee-reports-panel">
      <h2 className="font-bold text-base mb-4">Employee Reports</h2>
      <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
        {employeeReports.map(report => (
          <div key={report.title} className="px-4 py-3 hover:bg-muted/30 transition-colors flex items-start gap-1.5 text-sm">
            <button
              type="button"
              className="text-primary hover:underline font-medium shrink-0 text-left"
              aria-label={`Open report: ${report.title}`}
            >
              {report.title}
            </button>
            <span className="text-muted-foreground">- {report.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
