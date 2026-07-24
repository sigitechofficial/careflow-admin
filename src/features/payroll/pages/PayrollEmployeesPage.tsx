import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
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
import { UkPayrollDeductionsCatalogPanel } from '@/features/payroll/components/UkPayrollDeductionsCatalogPanel'
import {
  electionsFromLegacyFlags,
  syncLoanFlagsFromElections,
} from '@/features/payroll/data/uk-payroll-2026-27.catalog'
import { PAYROLL_SECTION_GUIDANCE } from '@/features/payroll/data/payroll-section-guidance'
import {
  buildNiCategoryComboboxOptions,
  buildTaxCodeComboboxOptions,
  taxCodeSelectValue,
  UK_TAX_CODE_OTHER,
} from '@/features/payroll/data/uk-payroll-lookups'
import {
  useCreateEmployeePayAgreement,
  usePayrollEmployees,
  usePayrollSchedules,
  useUpsertEmployeePayrollProfile,
} from '@/features/payroll/hooks/usePayroll'
import { useAuthStore } from '@/features/auth/store'
import type {
  EmployeePayAgreementBasis,
  EmployeePayrollProfileStatus,
  PayrollNiCategory,
  PayrollStarterDeclaration,
} from '@/features/payroll/types/payroll.types'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import { Input } from '@/shared/ui/input'
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

const TAX_CODE_OPTIONS = buildTaxCodeComboboxOptions(true)
const NI_OPTIONS = buildNiCategoryComboboxOptions()

const STAT_TONES = {
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
} as const

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: LucideIcon
  tone: keyof typeof STAT_TONES
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            STAT_TONES[tone],
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

export default function PayrollEmployeesPage() {
  const canManage = useAuthStore((s) => s.can('payroll.employees.manage'))
  const { data = [], isLoading } = usePayrollEmployees()
  const { data: schedules = [] } = usePayrollSchedules()
  const [listSearch, setListSearch] = React.useState('')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = data.find((r) => r.employeeId === selectedId) ?? null
  const upsertMut = useUpsertEmployeePayrollProfile(selectedId ?? '')
  const agreementMut = useCreateEmployeePayAgreement(selectedId ?? '')

  const [taxCodeSelect, setTaxCodeSelect] = React.useState('1257L')
  const [customTaxCode, setCustomTaxCode] = React.useState('')
  const [taxCodeWeek1Month1, setTaxCodeWeek1Month1] = React.useState(false)
  const [niCategory, setNiCategory] = React.useState<PayrollNiCategory>('A')
  const [status, setStatus] = React.useState<EmployeePayrollProfileStatus>('DRAFT')
  const [starter, setStarter] = React.useState<PayrollStarterDeclaration>('UNKNOWN')
  const [deductionElections, setDeductionElections] = React.useState<string[]>([])
  const [pensionSchemeRef, setPensionSchemeRef] = React.useState('')
  const [scheduleId, setScheduleId] = React.useState('')
  const [basis, setBasis] = React.useState<EmployeePayAgreementBasis>('HOURLY_CARE')
  const [effectiveFrom, setEffectiveFrom] = React.useState(
    new Date().toISOString().slice(0, 10),
  )

  React.useEffect(() => {
    if (!selected) return
    const stored = selected.profile?.taxCode ?? '1257L'
    const selectValue = taxCodeSelectValue(stored)
    setTaxCodeSelect(selectValue)
    setCustomTaxCode(selectValue === UK_TAX_CODE_OTHER ? stored.trim().toUpperCase() : '')
    setTaxCodeWeek1Month1(selected.profile?.taxCodeWeek1Month1 ?? false)
    setNiCategory(selected.profile?.niCategory ?? 'A')
    setStatus(selected.profile?.status ?? 'DRAFT')
    setStarter(selected.profile?.starterDeclaration ?? 'UNKNOWN')
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
    setScheduleId(selected.profile?.scheduleId ?? '')
  }, [selected])

  const resolvedTaxCode =
    taxCodeSelect === UK_TAX_CODE_OTHER
      ? customTaxCode.trim().toUpperCase()
      : taxCodeSelect

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
      description="Search carers, then set tax code, Employee National Insurance, and the full UK 2026/27 deductions catalogue. Only PAYE and Class 1 NI £ amounts are calculated on the run today."
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
            <SummaryCard label="Employees" value={summary.total} icon={Users} tone="sky" />
            <SummaryCard label="Ready" value={summary.ready} icon={BadgeCheck} tone="emerald" />
            <SummaryCard label="Draft" value={summary.draft} icon={FilePenLine} tone="amber" />
            <SummaryCard label="Not set" value={summary.notSet} icon={UserRound} tone="violet" />
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
                    <th className="py-2.5 pr-3 font-medium">NI number</th>
                    <th className="py-2.5 pr-3 font-medium">NI category</th>
                    <th className="py-2.5 pr-3 font-medium">Agreement</th>
                    <th className="py-2.5 pr-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((row) => (
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
                        {row.profile ? (
                          <PayrollStatusBadge status={row.profile.status} />
                        ) : (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 font-medium tabular-nums">
                        {row.profile?.taxCode ?? '—'}
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
                  ))}
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
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
                  <span>Week 1 / Month 1 tax code (non-cumulative)</span>
                </label>
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
              </div>
            </div>

            <UkPayrollDeductionsCatalogPanel
              selectedCodes={deductionElections}
              onChange={setDeductionElections}
            />
            </TooltipProvider>

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
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>Profile status</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EmployeePayrollProfileStatus)}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="READY">READY</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span>Starter declaration</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={starter}
                  onChange={(e) => setStarter(e.target.value as PayrollStarterDeclaration)}
                >
                  <option value="UNKNOWN">Unknown</option>
                  <option value="A_FIRST_JOB">A — first job</option>
                  <option value="B_ONLY_JOB_THIS_YEAR">B — only job this year</option>
                  <option value="C_HAS_ANOTHER_JOB_OR_PENSION">C — another job/pension</option>
                </select>
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
              </label>
            </div>

            <div className="rounded-lg border border-border p-3">
              <h4 className="mb-2 inline-flex items-center gap-2 text-sm font-medium">
                <FilePenLine className="h-4 w-4 text-muted-foreground" aria-hidden />
                New pay agreement
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span>Basis</span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={basis}
                    onChange={(e) => setBasis(e.target.value as EmployeePayAgreementBasis)}
                  >
                    <option value="HOURLY_CARE">Hourly care</option>
                    <option value="SALARIED">Salaried</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Effective from</span>
                  <Input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Creating an ACTIVE agreement supersedes any previous active agreement. Optional pay
                card link uses the employee default pay card when present.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedId(null)}>
              Close
            </Button>
            <Button
              variant="outline"
              disabled={!selectedId || agreementMut.isPending}
              onClick={() =>
                agreementMut.mutate({
                  basis,
                  effectiveFrom,
                  scheduleId: scheduleId || null,
                  payCardId: selected?.defaultPayCardId ?? null,
                  status: 'ACTIVE',
                })
              }
            >
              Add agreement
            </Button>
            <Button
              disabled={
                !selectedId ||
                upsertMut.isPending ||
                !resolvedTaxCode ||
                (taxCodeSelect === UK_TAX_CODE_OTHER && customTaxCode.trim().length < 2)
              }
              onClick={() =>
                upsertMut.mutate({
                  taxCode: resolvedTaxCode || null,
                  taxCodeWeek1Month1,
                  niCategory,
                  status,
                  starterDeclaration: starter,
                  deductionElections,
                  ...syncedLoanFlags,
                  pensionSchemeRef: showPensionRef ? pensionSchemeRef.trim() || null : null,
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
