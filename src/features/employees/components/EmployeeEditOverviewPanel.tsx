import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Award, CalendarDays, FileText, Pencil, ShieldCheck, UserCircle } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { AddExtraHoursButton } from '@/features/hours-approvals/components/CarerExtraHours'
import type { EmployeeDetail } from '@/features/employees/types'
import type { EditEmployeeTabId } from '@/features/employees/components/EditEmployeeTabBar'
import { matchesComplianceStatusFilter } from '@/features/employees/compliance/compliance-document-filters'
import { useEmployeeComplianceChecklist } from '@/features/employees/hooks/useEmployeeCompliance'
import { useEmployeeDocuments } from '@/features/employees/hooks/useEmployeeProfileExtras'
import { useEmployeeHolidays, useEmployeeSkills } from '@/features/employees/hooks/useEmployeeTabs'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { formatDate } from '@/shared/lib/utils'

type Value = string | number | null | undefined

function text(v: Value): string {
  if (v === null || v === undefined) return '—'
  const s = String(v).trim()
  return s ? s : '—'
}

function date(v: string | null | undefined): string {
  return v ? formatDate(v) : '—'
}

function yesNo(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v ? 'Yes' : 'No'
}

function money(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  return Number.isFinite(n) ? `£${n.toFixed(2)}` : text(v)
}

function hours(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  return `${v} h`
}

function Section({
  title,
  editTab,
  onEdit,
  rows,
  footer,
}: {
  title: string
  editTab?: EditEmployeeTabId
  onEdit: (tab: EditEmployeeTabId) => void
  rows: [label: string, value: string][]
  /** Shown under the rows (e.g. an action for this section). */
  footer?: ReactNode
}) {
  return (
    <section className="rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {editTab ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            onClick={() => onEdit(editTab)}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        ) : null}
      </div>
      <dl className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 break-words text-sm text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {footer ? <div className="border-t border-border px-4 py-2">{footer}</div> : null}
    </section>
  )
}

/** Local calendar day as YYYY-MM-DD, for comparing API date strings. */
function todayIso(): string {
  return new Date().toLocaleDateString('en-CA')
}

function dayOf(v: string | null | undefined): string {
  return v ? v.slice(0, 10) : ''
}

function SummaryCard({
  title,
  Icon,
  iconClassName,
  value,
  lines,
  tab,
  onOpen,
}: {
  title: string
  Icon: LucideIcon
  iconClassName: string
  value: string
  lines: string[]
  tab: EditEmployeeTabId
  onOpen: (tab: EditEmployeeTabId) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(tab)}
      className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
    >
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className={`h-4 w-4 ${iconClassName}`} aria-hidden />
        {title}
      </span>
      <span className="text-2xl font-semibold text-foreground">{value}</span>
      {lines.map(line => (
        <span key={line} className="text-xs text-muted-foreground">
          {line}
        </span>
      ))}
    </button>
  )
}

function OverviewSummaries({
  employeeId,
  onOpen,
}: {
  employeeId: string
  onOpen: (tab: EditEmployeeTabId) => void
}) {
  const accessToken = useAuthStore(s => s.accessToken)
  const canReadDocs = useAuthStore(s => s.can('employees.documents.read'))
  const canReadCompliance = useAuthStore(s => s.can('employees.compliance.read'))
  const queryEnabled = Boolean(getApiBaseUrl()) && Boolean(accessToken?.includes('.'))

  const docsQuery = useEmployeeDocuments(employeeId, queryEnabled && canReadDocs)
  const complianceQuery = useEmployeeComplianceChecklist(employeeId, false, queryEnabled && canReadCompliance)
  const skillsQuery = useEmployeeSkills(employeeId, queryEnabled)
  const holidaysQuery = useEmployeeHolidays(employeeId, queryEnabled)

  const today = todayIso()
  const in30Days = new Date(Date.now() + 30 * 86_400_000).toLocaleDateString('en-CA')

  const docs = docsQuery.data ?? []
  const latestDoc = docs.reduce<string | null>(
    (latest, d) => (!latest || d.uploadedDate > latest ? d.uploadedDate : latest),
    null,
  )

  const items = complianceQuery.data?.items ?? []
  const count = (filter: Parameters<typeof matchesComplianceStatusFilter>[1]) =>
    items.filter(i => matchesComplianceStatusFilter(i, filter)).length
  const notRequired = count('not_required')
  const required = items.length - notRequired
  const provided = count('provided')

  const skills = skillsQuery.data ?? []
  const skillsExpired = skills.filter(s => s.expiryDate && dayOf(s.expiryDate) < today).length
  const skillsExpiring = skills.filter(
    s => s.expiryDate && dayOf(s.expiryDate) >= today && dayOf(s.expiryDate) <= in30Days,
  ).length

  const holidays = holidaysQuery.data ?? []
  const current = holidays.find(h => dayOf(h.startDate) <= today && dayOf(h.endDate) >= today)
  const upcoming = holidays
    .filter(h => dayOf(h.startDate) > today)
    .sort((a, b) => dayOf(a.startDate).localeCompare(dayOf(b.startDate)))

  const loadingText = (loading: boolean, fallback: string) => (loading ? '…' : fallback)

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Documents"
        Icon={FileText}
        iconClassName="text-slate-600 dark:text-slate-300"
        value={canReadDocs ? loadingText(docsQuery.isLoading, String(docs.length)) : '—'}
        lines={
          canReadDocs
            ? [latestDoc ? `Last upload ${formatDate(latestDoc)}` : 'No documents uploaded']
            : ['No permission to view']
        }
        tab="documents"
        onOpen={onOpen}
      />
      <SummaryCard
        title="Compliance"
        Icon={ShieldCheck}
        iconClassName="text-orange-600 dark:text-orange-400"
        value={canReadCompliance ? loadingText(complianceQuery.isLoading, String(provided)) : '—'}
        lines={
          canReadCompliance
            ? [
                `provided of ${required} required`,
                `${count('missing_pending')} missing or pending`,
                `${count('expired')} expired · ${count('near_expiry')} near expiry`,
              ]
            : ['No permission to view']
        }
        tab="employment-compliance"
        onOpen={onOpen}
      />
      <SummaryCard
        title="Skills"
        Icon={Award}
        iconClassName="text-amber-600 dark:text-amber-400"
        value={loadingText(skillsQuery.isLoading, String(skills.length))}
        lines={[`${skillsExpired} expired · ${skillsExpiring} expiring in 30 days`]}
        tab="skills"
        onOpen={onOpen}
      />
      <SummaryCard
        title="Upcoming holidays"
        Icon={CalendarDays}
        iconClassName="text-rose-600 dark:text-rose-400"
        value={loadingText(holidaysQuery.isLoading, String(upcoming.length))}
        lines={[
          current ? `On holiday until ${formatDate(current.endDate)}` : 'Not on holiday today',
          upcoming[0]
            ? `Next: ${formatDate(upcoming[0].startDate)} – ${formatDate(upcoming[0].endDate)}`
            : 'No upcoming holidays',
        ]}
        tab="holidays"
        onOpen={onOpen}
      />
    </div>
  )
}

export function EmployeeEditOverviewPanel({
  employee,
  loading,
  onEdit,
}: {
  employee: EmployeeDetail | undefined
  loading: boolean
  onEdit: (tab: EditEmployeeTabId) => void
}) {
  if (loading && !employee) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading employee…</p>
  }
  if (!employee) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Employee details are not available.</p>
  }

  const p = employee.personalDetail ?? {}
  const e = employee.employment ?? {}
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ')
  const photo = resolveMediaUrl(p.photoUrl ?? null)
  const address = [p.addressLine1, p.addressLine2, p.town, p.county, p.postcode, p.country]
    .map(s => s?.trim())
    .filter(Boolean)
    .join(', ')
  const extraBranches = (e.floorLocations ?? [])
    .map(f => f.location?.name)
    .filter(Boolean)
    .join(', ')
  const serviceUserAreas = (e.serviceUserAreas ?? [])
    .map(a => a.serviceUserArea?.name)
    .filter(Boolean)
    .join(', ')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/20 p-4">
        {photo ? (
          <img src={photo} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <UserCircle className="h-16 w-16 text-muted-foreground" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">{fullName || 'Unnamed employee'}</h2>
          <p className="text-sm text-muted-foreground">
            {[e.jobTitle?.name, e.role?.name].filter(Boolean).join(' · ') || 'No job title'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-border bg-card px-2.5 py-1">
            Status: {text(p.status?.name)}
          </span>
          <span className="rounded-full border border-border bg-card px-2.5 py-1">
            {employee.isActive === false ? 'Inactive' : 'Active'}
          </span>
          {e.employeeNumber ? (
            <span className="rounded-full border border-border bg-card px-2.5 py-1">No. {e.employeeNumber}</span>
          ) : null}
        </div>
      </div>

      <OverviewSummaries employeeId={employee.id} onOpen={onEdit} />

      <Section
        title="Personal details"
        editTab="personal"
        onEdit={onEdit}
        rows={[
          ['Title', text(p.title?.name)],
          ['First name', text(p.firstName)],
          ['Last name', text(p.lastName)],
          ['Gender', text(p.gender?.name)],
          ['Date of birth', date(p.dateOfBirth)],
          ['Nationality', text(p.nationality?.name)],
          ['Ethnicity', text(p.ethnicity?.name)],
          ['Username', text(p.username)],
        ]}
      />

      <Section
        title="Contact & address"
        editTab="personal"
        onEdit={onEdit}
        rows={[
          ['Email', text(p.email)],
          ['Mobile', text(p.mobileTelephone)],
          ['Home telephone', text(p.homeTelephone)],
          ['Address', text(address)],
        ]}
      />

      <Section
        title="Employment"
        editTab="employment"
        onEdit={onEdit}
        rows={[
          ['Employee number', text(e.employeeNumber)],
          ['Payroll number', text(e.payrollNumber)],
          ['Job title', text(e.jobTitle?.name)],
          ['Role', text(e.role?.name)],
          ['Work area', text(e.workArea?.name)],
          ['Grade', text(e.grade?.name)],
          ['Contract type', text(e.contractType?.name)],
          ['Access level', text(e.rbacLevel?.name)],
          ['Start date', date(e.startDate)],
          ['End date', date(e.endDate)],
          ['National Insurance no.', text(e.nationalInsuranceNo)],
          ['NMC PIN', text(e.nmcPinNumber)],
          ['Default pay card', text(e.defaultPayCard?.name)],
          ['Travel payment type', text(e.travelPaymentType?.name)],
          ['In country', yesNo(e.isInCountry)],
        ]}
      />

      <Section
        title="Branches & areas"
        editTab="personal"
        onEdit={onEdit}
        rows={[
          ['Main branch', text(e.location?.name ?? e.baseLocation?.name)],
          ['Additional branches', text(extraBranches)],
          ['Access all zones', yesNo(e.accessAllZones)],
          ['Service user areas', text(serviceUserAreas)],
        ]}
      />

      <Section
        title="Working hours"
        editTab="employment"
        onEdit={onEdit}
        rows={[
          ['Contracted weekly hours', hours(e.contractedWeeklyHours)],
          ['Minimum weekly hours', hours(e.minimumWeeklyHours)],
          ['Maximum weekly hours', hours(e.maximumWeeklyHours)],
          ['Opted out of 48 hours', yesNo(e.optedOutOf48Hours)],
          ['Weekly cap override', hours(e.weeklyHoursCapOverride)],
          ['Override reason', text(e.weeklyHoursCapOverrideReason)],
          ['Override expires', date(e.weeklyHoursCapOverrideExpiresAt)],
        ]}
        footer={
          e.contractedWeeklyHours != null ? (
            <AddExtraHoursButton
              employeeId={employee.id}
              employeeName={fullName || null}
              contractedHours={Number(e.contractedWeeklyHours)}
            />
          ) : null
        }
      />

      <Section
        title="Staff type & rates"
        editTab="employment"
        onEdit={onEdit}
        rows={[
          ['Agency staff', yesNo(e.isAgencyStaff)],
          ['Bank staff', yesNo(e.isBankStaff)],
          ['Agency name', text(e.agencyName)],
          ['Agency rating', text(e.agencyRating)],
          ['Preferred agency', yesNo(e.isPreferredAgency)],
          ['Blacklisted', yesNo(e.isBlacklisted)],
          ['Daily rate', money(e.dailyRate)],
          ['Hourly day rate', money(e.hourlyDayRate)],
          ['Hourly night rate', money(e.hourlyNightRate)],
        ]}
      />
    </div>
  )
}
