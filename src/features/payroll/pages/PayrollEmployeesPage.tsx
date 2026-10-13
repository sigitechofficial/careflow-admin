import * as React from 'react'
import {
  BadgeCheck,
  FilePenLine,
  IdCard,
  Pencil,
  Search,
  Shield,
  UserRound,
  Users,
} from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollStatusBadge } from '@/features/payroll/components/PayrollStatusBadge'
import { PayAgreementsPanel } from '@/features/payroll/components/PayAgreementsPanel'
import { PayrollInfoHeading } from '@/features/payroll/components/PayrollInfoHeading'
// Other deductions catalogue — hidden until Phase 4 engines calculate £ amounts.
// import { UkPayrollDeductionsCatalogPanel } from '@/features/payroll/components/UkPayrollDeductionsCatalogPanel'
import {
  electionsFromLegacyFlags,
  syncLoanFlagsFromElections,
} from '@/features/payroll/data/uk-payroll-2026-27.catalog'
import { PAYROLL_SECTION_GUIDANCE } from '@/features/payroll/data/payroll-section-guidance'
import {
  buildNiCategoryComboboxOptions,
  buildTaxCodeComboboxOptions,
  summariseNiCategoryRate,
  summariseTaxCodeRates,
  taxCodeSelectValue,
  UK_TAX_CODE_OTHER,
} from '@/features/payroll/data/uk-payroll-lookups'
import {
  usePayrollEmployees,
  usePayrollSchedules,
  usePayrollStatutoryRates,
  usePayrollTaxCodes,
  useUpsertEmployeePayrollProfile,
} from '@/features/payroll/hooks/usePayroll'
import {
  PAYROLL_HOURS_NORMALLY_WORKED_OPTIONS,
  type PayrollHoursNormallyWorked,
} from '@/features/payroll/utils/payroll-hours-normally-worked.util'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import type {
  EmployeePayrollProfileStatus,
  PayrollNiCategory,
  PayrollStarterDeclaration,
} from '@/features/payroll/types/payroll.types'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import { Input } from '@/shared/ui/input'
import { StatCard } from '@/shared/ui/card'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { TooltipProvider } from '@/shared/ui/tooltip'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'

const NI_OPTIONS = buildNiCategoryComboboxOptions()

export default function PayrollEmployeesPage() {
  const canManage = useAuthStore((s) => s.can('payroll.employees.manage'))
  const { locationId } = useGlobalLocationScope()
  const { data = [], isLoading } = usePayrollEmployees(locationId)
  const { data: schedules = [] } = usePayrollSchedules()
  const { data: taxCodes = [] } = usePayrollTaxCodes()
  const { data: statutoryRates = [] } = usePayrollStatutoryRates()
  const displayRates = React.useMemo(() => {
    const current =
      statutoryRates.find((r) => r.taxYear?.isCurrent) ?? statutoryRates[0] ?? null
    if (!current) return null
    return {
      basicRatePercent: current.basicRatePercent,
      higherRatePercent: current.higherRatePercent,
      additionalRatePercent: current.additionalRatePercent,
      personalAllowanceAnnual: current.personalAllowanceAnnual,
      niEmployeeRateMainPercent: current.niEmployeeRateMainPercent,
    }
  }, [statutoryRates])
  const [listSearch, setListSearch] = React.useState('')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = data.find((r) => r.employeeId === selectedId) ?? null
  const upsertMut = useUpsertEmployeePayrollProfile(selectedId ?? '')

  const TAX_CODE_OPTIONS = React.useMemo(
    () =>
      buildTaxCodeComboboxOptions(
        true,
        taxCodes.map((c) => ({
          code: c.code,
          label: c.label,
          description: c.description,
        })),
      ),
    [taxCodes],
  )
  const knownTaxCodes = React.useMemo(() => taxCodes.map((c) => c.code), [taxCodes])

  const [taxCodeSelect, setTaxCodeSelect] = React.useState('1257L')
  const [customTaxCode, setCustomTaxCode] = React.useState('')
  const [taxCodeWeek1Month1, setTaxCodeWeek1Month1] = React.useState(false)
  const [niCategory, setNiCategory] = React.useState<PayrollNiCategory>('A')
  const [status, setStatus] = React.useState<EmployeePayrollProfileStatus>('DRAFT')
  const [starter, setStarter] = React.useState<PayrollStarterDeclaration>('UNKNOWN')
  const [p45Received, setP45Received] = React.useState(false)
  const [hoursNormallyWorked, setHoursNormallyWorked] = React.useState<
    PayrollHoursNormallyWorked | ''
  >('')
  const [deductionElections, setDeductionElections] = React.useState<string[]>([])
  const [pensionSchemeRef, setPensionSchemeRef] = React.useState('')
  const [apprenticeshipStartDate, setApprenticeshipStartDate] = React.useState('')
  const [scheduleId, setScheduleId] = React.useState('')

  React.useEffect(() => {
    if (!selected) return
    const stored = selected.profile?.taxCode ?? '1257L'
    const selectValue = taxCodeSelectValue(stored, knownTaxCodes)
    setTaxCodeSelect(selectValue)
    setCustomTaxCode(selectValue === UK_TAX_CODE_OTHER ? stored.trim().toUpperCase() : '')
    setTaxCodeWeek1Month1(selected.profile?.taxCodeWeek1Month1 ?? false)
    setNiCategory(selected.profile?.niCategory ?? 'A')
    setStatus(selected.profile?.status ?? 'DRAFT')
    setStarter(selected.profile?.starterDeclaration ?? 'UNKNOWN')
    setP45Received(Boolean(selected.profile?.p45Received))
    setHoursNormallyWorked(selected.profile?.hoursNormallyWorked ?? '')
    setDeductionElections(
      electionsFromLegacyFlags({
        studentLoanPlan1: selected.profile?.studentLoanPlan1,
        studentLoanPlan2: selected.profile?.studentLoanPlan2,
        studentLoanPlan4: selected.profile?.studentLoanPlan4,
        studentLoanPlan5: selected.profile?.studentLoanPlan5,
        postgraduateLoan: selected.profile?.postgraduateLoan,
        pensionOptedIn: selected.profile?.pensionOptedIn,
        deductionElections: selected.profile?.deductionElections,
      }),
    )
    setPensionSchemeRef(selected.profile?.pensionSchemeRef ?? '')
    setApprenticeshipStartDate(selected.profile?.apprenticeshipStartDate ?? '')
    setScheduleId(selected.profile?.scheduleId ?? '')
  }, [selected, knownTaxCodes])

  const resolvedTaxCode =
    taxCodeSelect === UK_TAX_CODE_OTHER
      ? customTaxCode.trim().toUpperCase()
      : taxCodeSelect
  const taxRateSummary = summariseTaxCodeRates(resolvedTaxCode || '1257L', displayRates)
  const niRateSummary = summariseNiCategoryRate(niCategory, displayRates)

  const liveRtiIssues = React.useMemo(() => {
    const hrIssues = (selected?.rtiIdentity?.issues ?? []).filter(
      (issue) => !/tax code/i.test(issue) && !/NI category/i.test(issue),
    )
    const next = [...hrIssues]
    if (!resolvedTaxCode || resolvedTaxCode.length < 2) {
      next.push('UK tax code must be set on the payroll profile')
    }
    if (!niCategory) {
      next.push('NI category letter must be set on the payroll profile')
    }
    if (!hoursNormallyWorked) {
      next.push('Hours normally worked band (A–E) must be set on the payroll profile')
    }
    return next
  }, [selected?.rtiIdentity?.issues, resolvedTaxCode, niCategory, hoursNormallyWorked])

  const canSetReady = liveRtiIssues.length === 0

  const syncedLoanFlags = syncLoanFlagsFromElections(deductionElections)
  const showPensionRef =
    deductionElections.includes('PENSION_EMPLOYEE') ||
    deductionElections.includes('AVC_PENSION') ||
    deductionElections.includes('SS_PENSION')

  const filteredEmployees = React.useMemo(() => {
    const q = listSearch.trim().toLowerCase()
    if (!q) return data
    return data.filter((row) => {
      const hay = [
        row.displayName,
        row.payrollNumber ?? '',
        row.profile?.taxCode ?? '',
        row.profile?.niCategory ?? '',
        row.nationalInsuranceNo ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [data, listSearch])

  const summary = React.useMemo(() => {
    let ready = 0
    let draft = 0
    let notSet = 0
    for (const row of data) {
      if (!row.profile) {
        notSet += 1
      } else if (row.profile.status === 'READY') {
        ready += 1
      } else if (row.profile.status === 'DRAFT') {
        draft += 1
      }
    }
    return { total: data.length, ready, draft, notSet }
  }, [data])

  return (
    <PayrollSectionLayout
      title="Employee payroll setup"
      description="Search carers, then set tax code and NI. READY requires complete HMRC identity (name, DOB, gender, address, NINo, payroll number)."
      testId="payroll-employees-page"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/20 px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
            <IdCard className="h-3.5 w-3.5" aria-hidden />
            Tax codes
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            Employee NI
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            Ready to enrol
          </span>
        </div>

        {!isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Employees"
              value={summary.total}
              icon={<Users className="h-5 w-5" aria-hidden />}
              tone="sky"
            />
            <StatCard
              label="Ready"
              value={summary.ready}
              icon={<BadgeCheck className="h-5 w-5" aria-hidden />}
              tone="emerald"
            />
            <StatCard
              label="Draft"
              value={summary.draft}
              icon={<FilePenLine className="h-5 w-5" aria-hidden />}
              tone="amber"
            />
            <StatCard
              label="Not set"
              value={summary.notSet}
              icon={<UserRound className="h-5 w-5" aria-hidden />}
              tone="violet"
            />
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex flex-col gap-3 border-b border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
                <Users className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Payroll profiles</p>
                <p className="text-xs text-muted-foreground">
                  Set tax code and NI before enrolling on a UK payroll run
                </p>
              </div>
            </div>
            <label className="relative block w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Search by name, payroll no., tax code, NI…"
                aria-label="Search employees"
              />
            </label>
          </div>

          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-border bg-muted/10 text-muted-foreground">
                  <tr>
                    <th className="py-2.5 pl-4 pr-3 font-medium">Employee</th>
                    <th className="py-2.5 pr-3 font-medium">Payroll no.</th>
                    <th className="py-2.5 pr-3 font-medium">Profile</th>
                    <th className="py-2.5 pr-3 font-medium">Tax code</th>
                    <th className="py-2.5 pr-3 font-medium">Tax rate</th>
                    <th className="py-2.5 pr-3 font-medium">NI number</th>
                    <th className="py-2.5 pr-3 font-medium">NI category</th>
                    <th className="py-2.5 pr-3 font-medium">Agreement</th>
                    <th className="py-2.5 pr-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((row) => {
                    const rate = summariseTaxCodeRates(row.profile?.taxCode, displayRates)
                    return (
                    <tr
                      key={row.employeeId}
                      className="border-b border-border/70 transition-colors hover:bg-muted/20"
                    >
                      <td className="py-3 pl-4 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300">
                            <UserRound className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="font-medium text-foreground">{row.displayName}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{row.payrollNumber ?? '—'}</td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-1">
                          {row.profile ? (
                            <PayrollStatusBadge status={row.profile.status} />
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                          {row.profile?.status === 'READY' && row.rtiIdentity && !row.rtiIdentity.isComplete ? (
                            <span className="text-[11px] text-amber-700 dark:text-amber-300">
                              Identity incomplete
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 pr-3 font-medium tabular-nums">
                        {row.profile?.taxCode ?? '—'}
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">
                        {row.profile?.taxCode ? rate.headline : '—'}
                      </td>
                      <td className="py-3 pr-3 tabular-nums text-muted-foreground">
                        {row.nationalInsuranceNo ?? '—'}
                      </td>
                      <td className="py-3 pr-3">{row.profile?.niCategory ?? '—'}</td>
                      <td className="py-3 pr-3">
                        {row.activeAgreement ? (
                          <PayrollStatusBadge status={row.activeAgreement.status} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {canManage ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => setSelectedId(row.employeeId)}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Edit
                          </Button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                    )
                  })}
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                        <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" aria-hidden />
                        {data.length === 0
                          ? 'No employees found.'
                          : 'No employees match your search.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IdCard className="h-4 w-4" aria-hidden />
              </span>
              {selected ? `Payroll setup — ${selected.displayName}` : 'Payroll setup'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <TooltipProvider delayDuration={200}>
            <div className="space-y-3 rounded-lg border border-border p-3">
              <PayrollInfoHeading
                title={PAYROLL_SECTION_GUIDANCE.paye.title}
                purpose={PAYROLL_SECTION_GUIDANCE.paye.purpose}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm sm:col-span-2">
                  <span>UK tax code</span>
                  <Combobox
                    options={TAX_CODE_OPTIONS}
                    value={taxCodeSelect}
                    onChange={(v) => {
                      if (!v) return
                      setTaxCodeSelect(v)
                      if (v !== UK_TAX_CODE_OTHER) setCustomTaxCode('')
                    }}
                    placeholder="Search tax codes…"
                    searchPlaceholder="Search 1257L, BR, Scotland, Wales…"
                    emptyText="No tax code found."
                    allowDeselect={false}
                    aria-label="UK tax code"
                  />
                  <p className="text-xs text-muted-foreground">
                    Most carers use 1257L. Type to search England, Scotland, Wales, and special codes.
                  </p>
                </label>
                <div
                  className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2.5 sm:col-span-2"
                  data-testid="payroll-employee-tax-rate-summary"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-sky-800 dark:text-sky-200">
                    Tax rate (Month 1 · monthly)
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {taxRateSummary.headline}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{taxRateSummary.detail}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    NI: <span className="font-medium text-foreground">{niRateSummary}</span>
                  </p>
                </div>
                {taxCodeSelect === UK_TAX_CODE_OTHER ? (
                  <label className="block space-y-1 text-sm sm:col-span-2">
                    <span>Enter HMRC tax code</span>
                    <Input
                      value={customTaxCode}
                      onChange={(e) => setCustomTaxCode(e.target.value.toUpperCase())}
                      placeholder="e.g. 1100L"
                      maxLength={20}
                    />
                  </label>
                ) : null}
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Checkbox
                    checked={taxCodeWeek1Month1}
                    onCheckedChange={(v) => setTaxCodeWeek1Month1(v === true)}
                  />
                  <span>Month 1 / Week 1 tax code (non-cumulative)</span>
                </label>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Leave unticked for normal cumulative PAYE (uses YTD from closed runs). Tick only
                  when the HMRC code is Week 1 / Month 1.
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <PayrollInfoHeading
                title={PAYROLL_SECTION_GUIDANCE.employeeNi.title}
                purpose={PAYROLL_SECTION_GUIDANCE.employeeNi.purpose}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span>NI number (NINo)</span>
                  <Input
                    value={selected?.nationalInsuranceNo ?? ''}
                    readOnly
                    placeholder="Not set on employment record"
                    className="bg-muted/40"
                    aria-label="Employee National Insurance number"
                  />
                  <p className="text-xs text-muted-foreground">
                    From the employee Employment record (e.g. QQ123456C). Edit it under Employees →
                    Employment.
                  </p>
                </label>
                <label className="block space-y-1 text-sm">
                  <span>NI category letter</span>
                  <Combobox
                    options={NI_OPTIONS}
                    value={niCategory}
                    onChange={(v) => {
                      if (!v) return
                      setNiCategory(v as PayrollNiCategory)
                    }}
                    placeholder="Search NI categories…"
                    searchPlaceholder="Search A, under 21, apprentice…"
                    emptyText="No NI category found."
                    allowDeselect={false}
                    aria-label="Employee National Insurance category"
                  />
                  <p className="text-xs text-muted-foreground">
                    Controls how employee NI is calculated. Category A is standard for most carers.
                  </p>
                </label>
                <label className="block space-y-1 text-sm sm:col-span-2">
                  <span>Hours normally worked (FPS band)</span>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={hoursNormallyWorked}
                    onChange={(e) =>
                      setHoursNormallyWorked(
                        (e.target.value || '') as PayrollHoursNormallyWorked | '',
                      )
                    }
                    aria-label="Hours normally worked band"
                  >
                    <option value="">Select band A–E…</option>
                    {PAYROLL_HOURS_NORMALLY_WORKED_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {hoursNormallyWorked
                      ? PAYROLL_HOURS_NORMALLY_WORKED_OPTIONS.find(
                          (o) => o.code === hoursNormallyWorked,
                        )?.description
                      : 'Required for READY profiles and FPS. Choose the band that best matches usual weekly hours (or E if irregular).'}
                  </p>
                </label>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <PayrollInfoHeading
                title={PAYROLL_SECTION_GUIDANCE.rtiIdentity.title}
                purpose={PAYROLL_SECTION_GUIDANCE.rtiIdentity.purpose}
              />
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Date of birth</p>
                  <p className="font-medium tabular-nums">
                    {selected?.rtiIdentity?.dateOfBirth ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gender (HMRC)</p>
                  <p className="font-medium">
                    {selected?.rtiIdentity?.genderHmrc
                      ? selected.rtiIdentity.genderHmrc === 'M'
                        ? 'M — Male'
                        : 'F — Female'
                      : '—'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="font-medium">{selected?.rtiIdentity?.addressSummary ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payroll number</p>
                  <p className="font-medium tabular-nums">{selected?.payrollNumber ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">NI number</p>
                  <p className="font-medium tabular-nums">
                    {selected?.nationalInsuranceNo ?? '—'}
                  </p>
                </div>
              </div>
              {liveRtiIssues.length === 0 ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                  Identity checks passed — profile can be set to READY.
                </p>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  <p className="font-medium">Complete these before READY:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {liveRtiIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-muted-foreground dark:text-amber-200/80">
                    Edit personal/address/gender under Employees → Personal. Edit NI number and
                    payroll number under Employees → Employment.
                  </p>
                </div>
              )}
            </div>

            {selected?.ytd ? (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <h4 className="text-sm font-medium text-foreground">
                  Year to date
                  {selected.ytd.taxYearCode ? ` · ${selected.ytd.taxYearCode}` : ''}
                </h4>
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Gross YTD</p>
                    <p className="font-medium tabular-nums">
                      £{selected.ytd.grossPayYtd.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tax YTD</p>
                    <p className="font-medium tabular-nums">
                      £
                      {selected.ytd.incomeTaxYtd.toLocaleString('en-GB', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Employee NI YTD</p>
                    <p className="font-medium tabular-nums">
                      £
                      {selected.ytd.employeeNiYtd.toLocaleString('en-GB', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Updated when a UK payroll run is closed. Reactivating a closed run reverses that
                  run’s YTD.
                </p>
              </div>
            ) : null}

            {/* Other deductions (student loans, pension, AEOs, voluntary) — not required for
                current PAYE / NI runs. Re-enable UkPayrollDeductionsCatalogPanel when Phase 4
                deduction engines ship. Existing elections are still loaded/saved unchanged. */}
            {/* <UkPayrollDeductionsCatalogPanel
              selectedCodes={deductionElections}
              onChange={setDeductionElections}
            />

            {showPensionRef ? (
              <label className="block space-y-1 text-sm">
                <span>Pension scheme reference</span>
                <Input
                  value={pensionSchemeRef}
                  onChange={(e) => setPensionSchemeRef(e.target.value)}
                  placeholder="Optional scheme / AE reference"
                  maxLength={80}
                />
              </label>
            ) : null} */}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>Profile status</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={status}
                  onChange={(e) => {
                    const next = e.target.value as EmployeePayrollProfileStatus
                    if (next === 'READY' && !canSetReady) return
                    setStatus(next)
                  }}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="READY" disabled={!canSetReady}>
                    READY{canSetReady ? '' : ' (fix identity first)'}
                  </option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
                {!canSetReady && status === 'READY' ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Status will save as DRAFT until identity checks pass — switch to DRAFT or fix
                    gaps above.
                  </p>
                ) : null}
              </label>
              <label className="block space-y-1 text-sm">
                <PayrollInfoHeading
                  title={PAYROLL_SECTION_GUIDANCE.starterDeclaration.title}
                  purpose={PAYROLL_SECTION_GUIDANCE.starterDeclaration.purpose}
                  as="h5"
                />
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={starter}
                  onChange={(e) => setStarter(e.target.value as PayrollStarterDeclaration)}
                  disabled={p45Received}
                >
                  <option value="UNKNOWN">Unknown</option>
                  <option value="A_FIRST_JOB">A — first job</option>
                  <option value="B_ONLY_JOB_THIS_YEAR">B — only job this year</option>
                  <option value="C_HAS_ANOTHER_JOB_OR_PENSION">C — another job/pension</option>
                </select>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={p45Received}
                    onCheckedChange={(v) => setP45Received(v === true)}
                  />
                  <span>P45 received from previous employer</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Employment dates (from HR): start{' '}
                  <span className="font-medium text-foreground">
                    {selected?.employmentStartDate ?? '—'}
                  </span>
                  {' · '}leave{' '}
                  <span className="font-medium text-foreground">
                    {selected?.employmentEndDate ?? '—'}
                  </span>
                  . Edit under Employees → Employment. Leave date in a pay period marks last pay on
                  FPS.
                </p>
              </label>
              <label className="block space-y-1 text-sm sm:col-span-2">
                <span>Pay schedule</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={scheduleId}
                  onChange={(e) => setScheduleId(e.target.value)}
                >
                  <option value="">None</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span className="block text-xs text-muted-foreground">
                  The periods of this schedule are also the pay reference periods minimum wage is checked over.
                </span>
              </label>
              <label className="block space-y-1 text-sm sm:col-span-2">
                <span>Apprenticeship start date (apprentices only)</span>
                <Input
                  type="date"
                  value={apprenticeshipStartDate}
                  onChange={(e) => setApprenticeshipStartDate(e.target.value)}
                  aria-label="Apprenticeship start date"
                  className="sm:max-w-xs"
                />
                <span className="block text-xs text-muted-foreground">
                  The apprentice minimum wage rate applies under 19, or in the first year of the apprenticeship. With no
                  date recorded, an apprentice of 19 or over is checked against the rate for their age.
                </span>
              </label>
            </div>

            {selectedId ? (
              <PayAgreementsPanel
                employeeId={selectedId}
                scheduleId={scheduleId || null}
                defaultPayCardId={selected?.defaultPayCardId ?? null}
              />
            ) : null}
            </TooltipProvider>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedId(null)}>
              Close
            </Button>
            <Button
              disabled={
                !selectedId ||
                upsertMut.isPending ||
                !resolvedTaxCode ||
                (taxCodeSelect === UK_TAX_CODE_OTHER && customTaxCode.trim().length < 2) ||
                (status === 'READY' && !canSetReady)
              }
              onClick={() =>
                upsertMut.mutate({
                  taxCode: resolvedTaxCode || null,
                  taxCodeWeek1Month1,
                  niCategory,
                  status: status === 'READY' && !canSetReady ? 'DRAFT' : status,
                  starterDeclaration: starter,
                  p45Received,
                  hoursNormallyWorked: hoursNormallyWorked || null,
                  deductionElections,
                  ...syncedLoanFlags,
                  pensionSchemeRef: showPensionRef ? pensionSchemeRef.trim() || null : null,
                  apprenticeshipStartDate: apprenticeshipStartDate || null,
                  scheduleId: scheduleId || null,
                })
              }
            >
              Save profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PayrollSectionLayout>
  )
}
