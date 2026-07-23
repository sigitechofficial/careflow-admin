import * as React from 'react'
import { Search } from 'lucide-react'
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

const TAX_CODE_OPTIONS = buildTaxCodeComboboxOptions(true)
const NI_OPTIONS = buildNiCategoryComboboxOptions()

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

  return (
    <PayrollSectionLayout
      title="Employee payroll setup"
      description="Search carers, then set tax code, Employee National Insurance, and the full UK 2026/27 deductions catalogue. Only PAYE and Class 1 NI £ amounts are calculated on the run today."
      testId="payroll-employees-page"
    >
      <div className="mb-4">
        <label className="relative block max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="Search by name, payroll no., tax code, NI number, NI category…"
            aria-label="Search employees"
          />
        </label>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Employee</th>
                <th className="py-2 pr-3 font-medium">Payroll no.</th>
                <th className="py-2 pr-3 font-medium">Profile</th>
                <th className="py-2 pr-3 font-medium">Tax code</th>
                <th className="py-2 pr-3 font-medium">NI number</th>
                <th className="py-2 pr-3 font-medium">NI category</th>
                <th className="py-2 pr-3 font-medium">Agreement</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((row) => (
                <tr key={row.employeeId} className="border-b border-border/70">
                  <td className="py-2.5 pr-3 font-medium">{row.displayName}</td>
                  <td className="py-2.5 pr-3">{row.payrollNumber ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    {row.profile ? (
                      <PayrollStatusBadge status={row.profile.status} />
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">{row.profile?.taxCode ?? '—'}</td>
                  <td className="py-2.5 pr-3 tabular-nums">
                    {row.nationalInsuranceNo ?? '—'}
                  </td>
                  <td className="py-2.5 pr-3">{row.profile?.niCategory ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    {row.activeAgreement ? (
                      <PayrollStatusBadge status={row.activeAgreement.status} />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5">
                    {canManage ? (
                      <Button size="sm" variant="outline" onClick={() => setSelectedId(row.employeeId)}>
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
                  <td colSpan={8} className="py-6 text-muted-foreground">
                    {data.length === 0 ? 'No employees found.' : 'No employees match your search.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>
              {selected ? `Payroll setup — ${selected.displayName}` : 'Payroll setup'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <TooltipProvider delayDuration={200}>
            <div className="rounded-lg border border-border p-3 space-y-3">
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

            <div className="rounded-lg border border-border p-3 space-y-3">
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
              <h4 className="mb-2 text-sm font-medium">New pay agreement</h4>
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
