import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Users, ShieldCheck, Star, Award, Activity, TrendingUp,
  PenLine, Plus, X, Filter, FileText,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import {
  type EmployeeChartSummary,
  type EmployeeListRow,
  type EmployeeLookupsBundle,
} from '@/features/employees/types'
import {
  useEmployeeChartSummary,
  useEmployees,
  useEmployeeLookups,
} from '@/features/employees/hooks/useEmployees'
import { usePatchAnyEmployeeStatus } from '@/features/employees/hooks/useEmployeeMutations'
import { EmployeeSkillsTab } from '@/features/employees/components/EmployeeSkillsTab'
import { EmployeeNonCoreActivityTab } from '@/features/employees/components/EmployeeNonCoreActivityTab'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
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
const reviewData = [
  { employee: 'Kwamie Abubaka', reviewType: 'Carer Communication form', status: 'In Progress', lastDone: '31/03/2026', nextDue: '04/04/2026', overdue: true },
  { employee: 'Kwamie Abubaka', reviewType: 'PHONE USE AGREEMENT',      status: 'In Progress', lastDone: '23/11/2025', nextDue: '30/11/2025', overdue: true },
  { employee: 'Kwamie Abubaka', reviewType: 'Supervision',              status: 'In Progress', lastDone: '01/12/2025', nextDue: '01/01/2026', overdue: true },
  { employee: 'Briana adjei',   reviewType: 'Carer Communication form', status: 'Published',   lastDone: '04/02/2026', nextDue: '05/02/2026', overdue: true },
  { employee: 'Briana adjei',   reviewType: 'Supervision',              status: 'Published',   lastDone: '24/11/2025', nextDue: '26/01/2026', overdue: true },
  { employee: 'Saima Ahmad',    reviewType: 'Carer Communication form', status: 'Published',   lastDone: '25/03/2026', nextDue: '30/03/2026', overdue: true },
  { employee: 'Saima Ahmad',    reviewType: 'COMPLIMENT event form',    status: 'Published',   lastDone: '11/03/2026', nextDue: '15/04/2026', overdue: true },
  { employee: 'Saima Ahmad',    reviewType: 'PHONE USE AGREEMENT',      status: 'Published',   lastDone: '22/11/2025', nextDue: '20/11/2026', overdue: false },
  { employee: 'Saima Ahmad',    reviewType: 'Supervision',              status: 'Published',   lastDone: '24/11/2025', nextDue: '29/12/2025', overdue: true },
  { employee: 'Asiya Ahmed',    reviewType: 'Carer Communication form', status: 'Published',   lastDone: '10/10/2025', nextDue: '14/10/2025', overdue: true },
  { employee: 'Ahmad Alam',     reviewType: 'Carer Communication form', status: 'Published',   lastDone: '01/04/2026', nextDue: '27/04/2026', overdue: true },
]

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
  const [statusFilter, setStatusFilter] = React.useState('Active')
  const [allEmployee, setAllEmployee] = React.useState(false)
  const [hideNoLonger, setHideNoLonger] = React.useState(true)
  const [complianceSelect, setComplianceSelect] = React.useState('Expired')

  React.useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  const { data: chartSummary = null, isLoading: chartLoading, error: chartErrorObj } = useEmployeeChartSummary()
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
          {activeTab === 'staff-list' && (
            <StaffListTab statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
          )}
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
        <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>
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
        <p className="text-xs text-muted-foreground py-12">Loading…</p>
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
          {totalAssignments} skill assignment{totalAssignments === 1 ? '' : 's'} · from database
        </p>
      ) : (
        <p className="mb-2 text-center text-[10px] text-muted-foreground">From employee skill assignments</p>
      )}
      {loading ? (
        <p className="text-xs text-muted-foreground py-12">Loading…</p>
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
        <p className="text-xs text-muted-foreground py-12">Loading…</p>
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
  return '—'
}

function staffAvatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function statusIdForFilter(lookups: EmployeeLookupsBundle | null, filter: string): string | undefined {
  if (filter === 'All' || !lookups) return undefined
  const want = filter.toLowerCase()
  return lookups.employeeStatuses.find(s => s.name.toLowerCase() === want)?.id
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
function StaffListTab({ statusFilter, setStatusFilter }: {
  statusFilter: string
  setStatusFilter: (v: string) => void
}) {
  const navigate = useNavigate()
  const canCreateEmployee = useAuthStore(s => s.can('employees.create'))
  const canUpdateEmployee = useAuthStore(s => s.can('employees.update'))
  const canUpdateEmployeeStatus = useAuthStore(s => s.can('employees.status.update'))
  const patchStatus = usePatchAnyEmployeeStatus()

  const [statusBusyId, setStatusBusyId] = React.useState<string | null>(null)
  const [statusUpdateError, setStatusUpdateError] = React.useState<string | null>(null)

  const { data: lookups = null, isLoading: lookupsLoading, error: lookupsError } = useEmployeeLookups()
  const statusId = statusIdForFilter(lookups, statusFilter)
  const { data: listData, isLoading: listLoading, error: listError } = useEmployees({
    page: 1,
    limit: 100,
    statusId,
    sortOrder: 'desc',
  })

  const rows: EmployeeListRow[] = listData?.rows ?? []
  const meta = { total: listData?.meta.total ?? 0 }
  const loading = lookupsLoading || listLoading
  const error = lookupsError
    ? (lookupsError instanceof ApiError ? lookupsError.message : 'Could not load employee lookups.')
    : listError
      ? (listError instanceof ApiError ? listError.message : 'Could not load employees.')
      : null

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

  return (
    <div data-testid="employee-staff-list-panel">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
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
        <div className="flex items-center gap-2">
          <label htmlFor="employee-status-filter" className="text-sm text-muted-foreground">
            Status
          </label>
          <select
            id="employee-status-filter"
            data-testid="employee-status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {['Active', 'Inactive', 'All'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error ? (
        <p className="mb-3 text-sm text-amber-800 dark:text-amber-200">{error}</p>
      ) : null}
      {statusUpdateError ? (
        <p className="mb-3 text-sm text-destructive">{statusUpdateError}</p>
      ) : null}
      {!loading && !error ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Showing {rows.length} of {meta.total} employee{meta.total === 1 ? '' : 's'} (up to 100 per page).
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm" data-testid="employee-staff-table">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {[
                { label: 'Picture',         filter: false },
                { label: 'Employee Name',   filter: true },
                { label: 'Status',          filter: false },
                { label: 'Job Title',       filter: true },
                { label: 'Role',            filter: false },
                { label: 'Grade',           filter: false },
                { label: 'Employment Type', filter: true },
                { label: 'Action',          filter: false },
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
            {loading ? (
              <tr data-testid="employee-staff-loading">
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr data-testid="employee-staff-empty">
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                  {error ? '—' : 'No employees match this filter.'}
                </td>
              </tr>
            ) : (
              rows.map(emp => {
                const name = emp.fullName?.trim() || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || '—'
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
                    <td className="px-3 py-3 font-medium whitespace-nowrap">{name}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={statusNorm === 'active' ? 'success' : statusNorm === 'inactive' ? 'secondary' : 'info'}
                          size="sm"
                        >
                          {statusLabel}
                        </Badge>
                        {rowStatusSwitch}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{emp.jobTitle?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-muted-foreground">{emp.role?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-muted-foreground">{emp.grade?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {emp.contractType?.name ?? '—'}
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
  return (
    <div className="overflow-x-auto rounded-lg border border-border" data-testid="employee-review-status-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {[
              { label: 'Employee',    filter: true },
              { label: 'Review Type', filter: true },
              { label: 'Status',      filter: false },
              { label: 'Last Done',   filter: true },
              { label: 'Next Due',    filter: true },
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
          {reviewData.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2.5 font-medium whitespace-nowrap">{row.employee}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{row.reviewType}</td>
              <td className="px-3 py-2.5">
                <Badge variant={row.status === 'Published' ? 'success' : 'warning'} size="sm">
                  {row.status}
                </Badge>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{row.lastDone}</td>
              <td className={cn('px-3 py-2.5 font-medium', row.overdue ? 'text-destructive' : 'text-muted-foreground')}>
                {row.nextDue}
              </td>
            </tr>
          ))}
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
