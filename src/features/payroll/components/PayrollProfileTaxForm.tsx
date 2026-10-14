import * as React from 'react'
import { PayrollInfoHeading } from '@/features/payroll/components/PayrollInfoHeading'
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
  usePayrollSchedules,
  usePayrollStatutoryRates,
  usePayrollTaxCodes,
  useUpsertEmployeePayrollProfile,
} from '@/features/payroll/hooks/usePayroll'
import {
  PAYROLL_HOURS_NORMALLY_WORKED_OPTIONS,
  type PayrollHoursNormallyWorked,
} from '@/features/payroll/utils/payroll-hours-normally-worked.util'
import type {
  EmployeePayrollProfileStatus,
  EmployeePayrollSetupRow,
  PayrollNiCategory,
  PayrollStarterDeclaration,
} from '@/features/payroll/types/payroll.types'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import { Input } from '@/shared/ui/input'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { TooltipProvider } from '@/shared/ui/tooltip'

const NI_OPTIONS = buildNiCategoryComboboxOptions()

/**
 * The tax and NI part of an employee's payroll profile (tax code, NI category, HMRC identity,
 * status, starter declaration, schedule, apprenticeship), with its own Save. Moved unchanged out
 * of the old profile dialog onto the employee payroll page.
 */
export function PayrollProfileTaxForm({ row, canManage }: { row: EmployeePayrollSetupRow; canManage: boolean }) {
  const upsertMut = useUpsertEmployeePayrollProfile(row.employeeId)
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
  // Gate C9: no category is assumed. '' = not set; it is never saved as A without a choice.
  const [niCategory, setNiCategory] = React.useState<PayrollNiCategory | ''>('')
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
        const stored = row.profile?.taxCode ?? '1257L'
    const selectValue = taxCodeSelectValue(stored, knownTaxCodes)
    setTaxCodeSelect(selectValue)
    setCustomTaxCode(selectValue === UK_TAX_CODE_OTHER ? stored.trim().toUpperCase() : '')
    setTaxCodeWeek1Month1(row.profile?.taxCodeWeek1Month1 ?? false)
    setNiCategory(row.profile?.niCategory ?? '')
    setStatus(row.profile?.status ?? 'DRAFT')
    setStarter(row.profile?.starterDeclaration ?? 'UNKNOWN')
    setP45Received(Boolean(row.profile?.p45Received))
    setHoursNormallyWorked(row.profile?.hoursNormallyWorked ?? '')
    setDeductionElections(
      electionsFromLegacyFlags({
        studentLoanPlan1: row.profile?.studentLoanPlan1,
        studentLoanPlan2: row.profile?.studentLoanPlan2,
        studentLoanPlan4: row.profile?.studentLoanPlan4,
        studentLoanPlan5: row.profile?.studentLoanPlan5,
        postgraduateLoan: row.profile?.postgraduateLoan,
        pensionOptedIn: row.profile?.pensionOptedIn,
        deductionElections: row.profile?.deductionElections,
      }),
    )
    setPensionSchemeRef(row.profile?.pensionSchemeRef ?? '')
    setApprenticeshipStartDate(row.profile?.apprenticeshipStartDate ?? '')
    setScheduleId(row.profile?.scheduleId ?? '')
  }, [row, knownTaxCodes])

  const resolvedTaxCode =
    taxCodeSelect === UK_TAX_CODE_OTHER
      ? customTaxCode.trim().toUpperCase()
      : taxCodeSelect
  const taxRateSummary = summariseTaxCodeRates(resolvedTaxCode || '1257L', displayRates)
  const niRateSummary = niCategory ? summariseNiCategoryRate(niCategory, displayRates) : 'Not set'

  const liveRtiIssues = React.useMemo(() => {
    const hrIssues = (row.rtiIdentity?.issues ?? []).filter(
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
  }, [row.rtiIdentity?.issues, resolvedTaxCode, niCategory, hoursNormallyWorked])

  const canSetReady = liveRtiIssues.length === 0

  const syncedLoanFlags = syncLoanFlagsFromElections(deductionElections)
  const showPensionRef =
    deductionElections.includes('PENSION_EMPLOYEE') ||
    deductionElections.includes('AVC_PENSION') ||
    deductionElections.includes('SS_PENSION')

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
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
                    value={row.nationalInsuranceNo ?? ''}
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
                    placeholder="Not set"
                    searchPlaceholder="Search A, under 21, apprentice…"
                    emptyText="No NI category found."
                    allowDeselect={false}
                    aria-label="Employee National Insurance category"
                  />
                  {!niCategory ? (
                    <p className="text-xs text-destructive" role="alert" data-testid="ni-category-missing">
                      NI category not set. Choose the employee&apos;s category letter: tax and NI are not calculated
                      without it, and saving other fields leaves it not set.
                    </p>
                  ) : null}
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
                    {row.rtiIdentity?.dateOfBirth ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gender (HMRC)</p>
                  <p className="font-medium">
                    {row.rtiIdentity?.genderHmrc
                      ? row.rtiIdentity.genderHmrc === 'M'
                        ? 'M — Male'
                        : 'F — Female'
                      : '—'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="font-medium">{row.rtiIdentity?.addressSummary ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payroll number</p>
                  <p className="font-medium tabular-nums">{row.payrollNumber ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">NI number</p>
                  <p className="font-medium tabular-nums">
                    {row.nationalInsuranceNo ?? '—'}
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

            {row.ytd ? (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <h4 className="text-sm font-medium text-foreground">
                  Year to date
                  {row.ytd.taxYearCode ? ` · ${row.ytd.taxYearCode}` : ''}
                </h4>
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Gross YTD</p>
                    <p className="font-medium tabular-nums">
                      £{row.ytd.grossPayYtd.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tax YTD</p>
                    <p className="font-medium tabular-nums">
                      £
                      {row.ytd.incomeTaxYtd.toLocaleString('en-GB', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Employee NI YTD</p>
                    <p className="font-medium tabular-nums">
                      £
                      {row.ytd.employeeNiYtd.toLocaleString('en-GB', {
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
                    {row.employmentStartDate ?? '—'}
                  </span>
                  {' · '}leave{' '}
                  <span className="font-medium text-foreground">
                    {row.employmentEndDate ?? '—'}
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
        {canManage ? (
          <div className="flex justify-end border-t border-border pt-3">
            <Button
              disabled={
                upsertMut.isPending ||
                !resolvedTaxCode ||
                (taxCodeSelect === UK_TAX_CODE_OTHER && customTaxCode.trim().length < 2) ||
                (status === 'READY' && !canSetReady)
              }
              onClick={() =>
                upsertMut.mutate({
                  taxCode: resolvedTaxCode || null,
                  taxCodeWeek1Month1,
                  // Not set: left out, so saving other fields neither creates nor changes a category.
                  niCategory: niCategory || undefined,
                  status: status === 'READY' && !canSetReady ? 'DRAFT' : status,
                  starterDeclaration: starter,
                  p45Received,
                  hoursNormallyWorked: hoursNormallyWorked || null,
                  deductionElections,
                  ...syncedLoanFlags,
                  // Gate C17: left out when hidden, so the Workplace Pension scheme reference is not erased.
                  pensionSchemeRef: showPensionRef ? pensionSchemeRef.trim() || null : undefined,
                  apprenticeshipStartDate: apprenticeshipStartDate || null,
                  scheduleId: scheduleId || null,
                })
              }
            >
              Save profile
            </Button>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  )
}
