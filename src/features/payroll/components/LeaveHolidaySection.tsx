import * as React from 'react'

import { useAuthStore } from '@/features/auth/store'
import { PayrollFieldLabel } from '@/features/payroll/components/PayrollFieldLabel'
import { useLeaveActions, useLeaveEntries, useLeavePosition, useLeaveTerms } from '@/features/payroll/hooks/usePayroll'
import type { LeaveEntryRow, LeaveTermsRow } from '@/features/payroll/types/payroll.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { TooltipProvider } from '@/shared/ui/tooltip'

const ENTRY_LABELS: Record<LeaveEntryRow['entryType'], string> = {
  TAKEN: 'Holiday taken',
  ADJUSTMENT: 'Correction (+ or −)',
  CARRY_OVER: 'Brought from last year (+ or −)',
  LEAVER_PAYMENT: 'Paid out on leaving',
}
const CATEGORY_LABELS: Record<LeaveTermsRow['workerCategory'], string> = {
  REGULAR_HOURS: 'Regular hours',
  IRREGULAR_HOURS: 'Irregular hours',
  PART_YEAR: 'Part year',
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
const r2 = (n: number) => Math.round(n * 100) / 100
const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm'

/**
 * Payroll leave (holiday) on the payroll profile, in the order it is used: the balance today, record
 * holiday, the history, then (folded) a leaver check and the holiday rules (leave terms, entered
 * and then approved by a second person). Leave taken in advance is recovered at annual salary / 260
 * a day through Billing → Wage recoveries once approved. The leaving date is the employment end
 * date (Employees → Employment). Amounts are kept in hours; days are shown when the rules have
 * weekly hours (a day = weekly hours / 5).
 */
export function LeaveHolidaySection({
  employeeId,
  canEdit,
  employmentEndDate,
  annualSalary,
}: {
  employeeId: string
  canEdit: boolean
  employmentEndDate: string | null
  annualSalary: number | null
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [leaverPreview, setLeaverPreview] = React.useState(employmentEndDate ?? '')
  React.useEffect(() => setLeaverPreview(employmentEndDate ?? ''), [employmentEndDate])
  const { data: position } = useLeavePosition(employeeId, { asOf: today })
  const { data: leaver } = useLeavePosition(employeeId, leaverPreview ? { leavingDate: leaverPreview } : { asOf: today })
  const { data: terms = [] } = useLeaveTerms(employeeId)
  const { data: entries = [] } = useLeaveEntries(employeeId)
  const actions = useLeaveActions(employeeId)
  const canApprove = useAuthStore((s) => s.can('payroll.pay_agreements.approve'))
  const currentUserId = useAuthStore((s) => s.user?.id ?? null)

  // Holiday rules form
  const [category, setCategory] = React.useState<LeaveTermsRow['workerCategory']>('REGULAR_HOURS')
  const [yearMonth, setYearMonth] = React.useState('4')
  const [yearDay, setYearDay] = React.useState('1')
  const [weeklyHours, setWeeklyHours] = React.useState('')
  const [extraHours, setExtraHours] = React.useState('')
  const [payMethod, setPayMethod] = React.useState<LeaveTermsRow['payMethod']>('NORMAL_REMUNERATION_52_WEEKS')
  const [carryOver, setCarryOver] = React.useState('')
  const [effectiveFrom, setEffectiveFrom] = React.useState('')
  // Record holiday form
  const [entryType, setEntryType] = React.useState<LeaveEntryRow['entryType']>('TAKEN')
  const [entitlementType, setEntitlementType] = React.useState<LeaveEntryRow['entitlementType']>('STATUTORY')
  const [unit, setUnit] = React.useState<'DAYS' | 'HOURS'>('DAYS')
  const [amount, setAmount] = React.useState('')
  const [entryDate, setEntryDate] = React.useState('')
  const [entryNote, setEntryNote] = React.useState('')

  const inForce = position?.terms ?? null
  const hoursPerDay = inForce?.weeklyHours ? inForce.weeklyHours / 5 : null
  const hasContractual = Boolean(position?.contractual && position.contractual.fullYearEntitlement > 0)
  const amountNumber = amount.trim() === '' ? NaN : Number(amount)
  // Days need the weekly hours of the rules; without them the entry is in hours.
  const effectiveUnit = hoursPerDay ? unit : 'HOURS'
  const entryHours = effectiveUnit === 'HOURS' ? amountNumber : r2(amountNumber * hoursPerDay!)
  // Hours, shown as days where a day is known.
  const show = (hours: number) => (hoursPerDay ? `${r2(hours / hoursPerDay)} days` : `${hours} hours`)
  const showBoth = (hours: number) => (hoursPerDay ? `${r2(hours / hoursPerDay)} days (${hours}h)` : `${hours} hours`)
  const signed = entryType === 'ADJUSTMENT' || entryType === 'CARRY_OVER'
  const entryMissing = [
    !entryDate ? 'the date' : null,
    !(Number.isFinite(entryHours) && (signed ? entryHours !== 0 : entryHours > 0)) ? (signed ? 'an amount (not 0)' : 'how many') : null,
    entryNote.trim().length < 3 ? 'a short note' : null,
  ].filter(Boolean)
  const weekly = weeklyHours.trim() === '' ? null : Number(weeklyHours)
  const termsValid =
    Boolean(effectiveFrom) &&
    (category !== 'REGULAR_HOURS' || (weekly != null && weekly > 0)) &&
    (payMethod !== 'ROLLED_UP_12_07' || category !== 'REGULAR_HOURS')

  const termsError = actions.createTerms.error instanceof Error ? actions.createTerms.error.message : null
  const approveError = actions.approveTerms.error instanceof Error ? actions.approveTerms.error.message : null
  const entryError = actions.recordEntry.error instanceof Error ? actions.recordEntry.error.message : null

  const lv = leaver?.leaver ?? null
  const excessHours = lv?.takenMoreThanEarned ? r2(-lv.untakenHours) : 0
  const excessDays = hoursPerDay && excessHours > 0 ? r2(excessHours / hoursPerDay) : null
  const recoveryEstimate = excessDays != null && annualSalary ? r2((excessDays * annualSalary) / 260) : null
  const waiting = terms.filter((t) => t.status === 'DRAFT')

  const balance = (label: string, p: { entitlement: number; taken: number; balance: number; fullYearEntitlement: number }) => (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          ['Earned so far', show(p.entitlement), `of ${show(p.fullYearEntitlement)} this year`],
          ['Taken', show(p.taken), null],
          ['Left', show(p.balance), p.balance < 0 ? 'taken more than earned' : null],
        ].map(([title, value, sub]) => (
          <div key={title} className="rounded-md border border-border p-2">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={title === 'Left' && p.balance < 0 ? 'text-base font-semibold text-destructive' : 'text-base font-semibold text-foreground'}>
              {value}
            </p>
            {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <TooltipProvider delayDuration={200}>
      <section className="space-y-4 rounded-md border border-border p-3" data-testid="leave-holiday">
        <h3 className="text-sm font-medium">Leave / Holiday</h3>

        {/* 1. Balance today */}
        {position?.terms ? (
          <div className="space-y-2" data-testid="leave-balance">
            <p className="text-xs text-muted-foreground">
              Leave year {position.leaveYear?.start} to {position.leaveYear?.end} · {CATEGORY_LABELS[position.terms.workerCategory]}
              {position.terms.weeklyHours ? ` · ${position.terms.weeklyHours} hours a week (1 day = ${hoursPerDay} hours)` : ''}
            </p>
            {position.statutory ? balance(hasContractual ? 'Statutory holiday' : 'Holiday', position.statutory) : null}
            {hasContractual && position.contractual ? balance('Contract extra', position.contractual) : null}
            {position.holidayPay ? (
              <p className="text-xs text-muted-foreground">
                Holiday pay: {position.holidayPay.averageHourlyPay != null ? `${gbp(position.holidayPay.averageHourlyPay)} an hour. ` : ''}
                {position.holidayPay.note}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-300" data-testid="leave-no-terms">
            {position?.note ?? 'No approved holiday rules yet.'} First set up the holiday rules below; a second person then approves them.
          </p>
        )}
        {waiting.length ? (
          <p className="text-xs text-amber-700 dark:text-amber-300" data-testid="leave-terms-waiting">
            Holiday rules from {waiting.map((t) => t.effectiveFrom).join(', ')} are waiting for a second person to approve them (under
            Holiday rules below).
          </p>
        ) : null}

        {/* 2. Record holiday */}
        {canEdit ? (
          <div className="space-y-2 rounded-md border border-border/70 p-2" data-testid="leave-entry-form">
            <p className="text-sm font-medium">Record holiday</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="block space-y-1 text-sm">
                <span>What?</span>
                <select className={selectClass} value={entryType} onChange={(e) => setEntryType(e.target.value as LeaveEntryRow['entryType'])} aria-label="Leave entry type">
                  {(Object.keys(ENTRY_LABELS) as LeaveEntryRow['entryType'][]).map((k) => (
                    <option key={k} value={k}>
                      {ENTRY_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span>Date</span>
                <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} aria-label="Leave date" />
              </label>
              <div className="space-y-1 text-sm">
                <span className="block">How many?</span>
                <div className="flex items-center gap-2">
                  <Input type="number" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Leave amount" className="w-24" />
                  {hoursPerDay ? (
                    <div className="flex items-center gap-3" role="radiogroup" aria-label="Leave unit">
                      <label className="flex items-center gap-1">
                        <input type="radio" name={`leave-unit-${employeeId}`} checked={effectiveUnit === 'DAYS'} onChange={() => setUnit('DAYS')} />
                        days
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="radio" name={`leave-unit-${employeeId}`} checked={effectiveUnit === 'HOURS'} onChange={() => setUnit('HOURS')} />
                        hours
                      </label>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">hours</span>
                  )}
                </div>
              </div>
              {hasContractual ? (
                <label className="block space-y-1 text-sm">
                  <span>From which allowance?</span>
                  <select className={selectClass} value={entitlementType} onChange={(e) => setEntitlementType(e.target.value as LeaveEntryRow['entitlementType'])} aria-label="Leave entitlement type">
                    <option value="STATUTORY">Statutory (28 days)</option>
                    <option value="CONTRACTUAL">Contract extra</option>
                  </select>
                </label>
              ) : null}
              <label className={hasContractual ? 'block space-y-1 text-sm sm:col-span-2' : 'block space-y-1 text-sm sm:col-span-3'}>
                <span>Note</span>
                <Input value={entryNote} onChange={(e) => setEntryNote(e.target.value)} aria-label="Leave note" placeholder="e.g. Annual leave, approved by manager" />
              </label>
            </div>
            {effectiveUnit === 'DAYS' && Number.isFinite(entryHours) && amount ? (
              <p className="text-xs text-muted-foreground">Saved as {entryHours} hours.</p>
            ) : null}
            {!hoursPerDay ? <p className="text-xs text-muted-foreground">Days can be used once the holiday rules have weekly hours.</p> : null}
            {entryMissing.length && (amount || entryNote) ? (
              <p className="text-xs text-muted-foreground">Still needed: {entryMissing.join(', ')}.</p>
            ) : null}
            {entryError ? <p className="text-xs text-destructive" role="alert">{entryError}</p> : null}
            <Button
              size="sm"
              variant="outline"
              disabled={actions.recordEntry.isPending || entryMissing.length > 0}
              onClick={() =>
                void actions.recordEntry
                  .mutateAsync({ entryType, entitlementType: hasContractual ? entitlementType : 'STATUTORY', hours: entryHours, date: entryDate, note: entryNote.trim() })
                  .then(() => {
                    setAmount('')
                    setEntryNote('')
                  })
                  .catch(() => undefined)
              }
            >
              Record holiday
            </Button>
          </div>
        ) : null}

        {/* 3. History */}
        <div>
          <p className="text-xs font-medium text-muted-foreground">Holiday history (most recent first)</p>
          {entries.length ? (
            <table className="mt-1 w-full text-left text-xs" data-testid="leave-entries">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2 font-medium">Date</th>
                  <th className="py-1 pr-2 font-medium">What</th>
                  <th className="py-1 pr-2 text-right font-medium">Amount</th>
                  <th className="py-1 pr-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-border/70">
                    <td className="py-1 pr-2">{e.date}</td>
                    <td className="py-1 pr-2">
                      {ENTRY_LABELS[e.entryType] ?? e.entryType}
                      {e.entitlementType === 'CONTRACTUAL' ? ' (contract extra)' : ''}
                    </td>
                    <td className="py-1 pr-2 text-right">{showBoth(e.hours)}</td>
                    <td className="py-1 pr-2">{e.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-muted-foreground">No holiday recorded yet.</p>
          )}
        </div>

        {/* 4. Leaver check */}
        <details className="rounded-md border border-border/70 p-2" open={Boolean(employmentEndDate)}>
          <summary className="cursor-pointer text-sm font-medium">Leaving? Check holiday owed or taken in advance</summary>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground">
              Leaving date on the employment record: <span className="font-medium text-foreground">{employmentEndDate ?? 'not set'}</span> (set it
              under Employees → Employment → End date). You can try another date here; it is not saved.
            </p>
            <Input type="date" value={leaverPreview} onChange={(e) => setLeaverPreview(e.target.value)} aria-label="Leaver preview date" className="sm:max-w-xs" />
            {leaverPreview && lv ? (
              lv.takenMoreThanEarned ? (
                <p className="text-xs text-destructive" data-testid="leave-taken-in-advance">
                  Taken in advance by {lv.leavingDate}: {excessHours}h{excessDays != null ? ` = ${excessDays} days` : ''}.
                  {recoveryEstimate != null
                    ? ` Estimated recovery ${gbp(recoveryEstimate)} (${gbp(annualSalary!)} / 260 a day). The final payroll run proposes it; it is deducted only after approval under Billing → Wage recoveries.`
                    : ' It cannot be valued: no annual salary or weekly hours on record.'}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Holiday owed by {lv.leavingDate}: {showBoth(lv.untakenHours)}
                  {lv.paymentInLieu != null ? ` · payment in lieu about ${gbp(lv.paymentInLieu)}` : ''}.
                </p>
              )
            ) : null}
          </div>
        </details>

        {/* 5. Holiday rules (leave terms) */}
        <details className="rounded-md border border-border/70 p-2" open={!inForce || waiting.length > 0} data-testid="leave-terms">
          <summary className="cursor-pointer text-sm font-medium">Holiday rules (worker type, weekly hours, leave year)</summary>
          <div className="mt-2 space-y-3">
            {terms.length ? (
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-2 font-medium">From</th>
                    <th className="py-1 pr-2 font-medium">Worker</th>
                    <th className="py-1 pr-2 font-medium">Weekly hours</th>
                    <th className="py-1 pr-2 font-medium">Leave year</th>
                    <th className="py-1 pr-2 font-medium">Status</th>
                    <th className="py-1 pr-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {terms.map((t) => (
                    <tr key={t.id} className="border-t border-border/70">
                      <td className="py-1 pr-2">{t.effectiveFrom}</td>
                      <td className="py-1 pr-2">{CATEGORY_LABELS[t.workerCategory]}</td>
                      <td className="py-1 pr-2">{t.weeklyHours ?? '—'}</td>
                      <td className="py-1 pr-2">
                        from {t.leaveYearStartDay} {MONTHS[t.leaveYearStartMonth - 1]}
                      </td>
                      <td className="py-1 pr-2">{t.status === 'DRAFT' ? 'Waiting for approval' : t.status === 'ACTIVE' ? 'In use' : 'Replaced'}</td>
                      <td className="py-1 pr-2">
                        {t.status === 'DRAFT' && canApprove && currentUserId !== t.createdById ? (
                          <Button size="sm" variant="outline" disabled={actions.approveTerms.isPending} onClick={() => void actions.approveTerms.mutateAsync(t.id).catch(() => undefined)}>
                            Approve
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-muted-foreground">No holiday rules entered yet.</p>
            )}
            {approveError ? <p className="text-xs text-destructive" role="alert">{approveError}</p> : null}

            {canEdit ? (
              <div className="space-y-2" data-testid="leave-terms-form">
                <p className="text-xs font-medium">New holiday rules (a second person approves them)</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="block space-y-1 text-sm">
                    <PayrollFieldLabel
                      label="Worker type"
                      info="Regular hours: fixed weekly hours, holiday is earned through the leave year. Irregular hours or part year: holiday is 12.07% of the hours worked."
                      className="font-normal"
                    />
                    <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as LeaveTermsRow['workerCategory'])} aria-label="Worker category">
                      {(Object.keys(CATEGORY_LABELS) as LeaveTermsRow['workerCategory'][]).map((k) => (
                        <option key={k} value={k}>
                          {CATEGORY_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span>Weekly hours{category === 'REGULAR_HOURS' ? ' (required)' : ''}</span>
                    <Input type="number" step="0.5" value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} aria-label="Weekly hours" />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span>Applies from</span>
                    <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} aria-label="Leave terms effective from" />
                  </label>
                  <div className="space-y-1 text-sm">
                    <span className="block">Leave year starts on</span>
                    <div className="flex gap-2">
                      <Input type="number" min={1} max={28} value={yearDay} onChange={(e) => setYearDay(e.target.value)} aria-label="Leave year start day" className="w-20" />
                      <select className={selectClass} value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} aria-label="Leave year start month">
                        {MONTHS.map((m, i) => (
                          <option key={m} value={String(i + 1)}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <label className="block space-y-1 text-sm sm:col-span-2">
                    <PayrollFieldLabel
                      label="Holiday pay"
                      info="Paid when taken: holiday is paid at the average of the last 52 paid weeks. Rolled-up 12.07% is added to every payslip instead, and is only allowed for irregular-hours or part-year workers."
                      className="font-normal"
                    />
                    <select className={selectClass} value={payMethod} onChange={(e) => setPayMethod(e.target.value as LeaveTermsRow['payMethod'])} aria-label="Holiday pay method">
                      <option value="NORMAL_REMUNERATION_52_WEEKS">Paid when taken (52-week average)</option>
                      <option value="ROLLED_UP_12_07" disabled={category === 'REGULAR_HOURS'}>
                        Rolled-up 12.07% (irregular / part-year only)
                      </option>
                    </select>
                  </label>
                </div>
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">Optional: contract extra holiday and carry-over</summary>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <label className="block space-y-1 text-sm">
                      <PayrollFieldLabel label="Contract extra hours a year" info="Holiday the contract gives on top of the statutory 28 days, in hours a year." className="font-normal" />
                      <Input type="number" step="0.5" value={extraHours} onChange={(e) => setExtraHours(e.target.value)} aria-label="Contractual extra hours" />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <PayrollFieldLabel label="Carry-over allowed (hours)" info="The most unused holiday that can be brought into the next leave year." className="font-normal" />
                      <Input type="number" step="0.5" value={carryOver} onChange={(e) => setCarryOver(e.target.value)} aria-label="Carry-over hours" />
                    </label>
                  </div>
                </details>
                <p className="text-xs text-muted-foreground">
                  Statutory holiday is 5.6 weeks (28 days for a 5-day week). Regular-hours workers earn it through the part of the leave year they
                  are employed; irregular-hours and part-year workers at 12.07% of hours worked.
                </p>
                {termsError ? <p className="text-xs text-destructive" role="alert">{termsError}</p> : null}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actions.createTerms.isPending || !termsValid}
                  onClick={() =>
                    void actions.createTerms
                      .mutateAsync({
                        workerCategory: category,
                        leaveYearStartMonth: Number(yearMonth),
                        leaveYearStartDay: Number(yearDay) || 1,
                        weeklyHours: weekly,
                        contractualExtraHours: extraHours.trim() === '' ? null : Number(extraHours),
                        payMethod,
                        carryOverMaxHours: carryOver.trim() === '' ? null : Number(carryOver),
                        effectiveFrom,
                      })
                      .catch(() => undefined)
                  }
                >
                  Save holiday rules
                </Button>
              </div>
            ) : null}
          </div>
        </details>
      </section>
    </TooltipProvider>
  )
}
