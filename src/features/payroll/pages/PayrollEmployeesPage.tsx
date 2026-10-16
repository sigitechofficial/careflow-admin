import * as React from 'react'
import { Link } from '@tanstack/react-router'
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
                          <Button asChild size="sm" variant="outline" className="gap-1.5">
                            <Link to="/payroll/employees/$employeeId" params={{ employeeId: row.employeeId }}>
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                              Open
                            </Link>
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
    </PayrollSectionLayout>
  )
}
