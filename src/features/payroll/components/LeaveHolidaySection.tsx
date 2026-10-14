import * as React from 'react'

import { useAuthStore } from '@/features/auth/store'
import { useLeaveActions, useLeaveEntries, useLeavePosition, useLeaveTerms } from '@/features/payroll/hooks/usePayroll'
import type { LeaveEntryRow, LeaveTermsRow } from '@/features/payroll/types/payroll.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

const ENTRY_LABELS: Record<LeaveEntryRow['entryType'], string> = {
  TAKEN: 'Leave taken',
  ADJUSTMENT: 'Adjustment (+/-)',
  CARRY_OVER: 'Carried over from last year (+/-)',
  LEAVER_PAYMENT: 'Paid on leaving',
}
const CATEGORY_LABELS: Record<LeaveTermsRow['workerCategory'], string> = {
  REGULAR_HOURS: 'Regular hours',
  IRREGULAR_HOURS: 'Irregular hours',
  PART_YEAR: 'Part year',
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * Payroll leave (holiday) on the payroll profile: the leave terms (entered, then approved by a
 * second person), leave taken and other movements, the balance today, and the position of a leaver
 * (leave taken in advance is recovered at annual salary / 260 a day through Billing → Wage
 * recoveries once approved). The leaving date is the employment end date (Employees → Employment).
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

  // Terms form
  const [category, setCategory] = React.useState<LeaveTermsRow['workerCategory']>('REGULAR_HOURS')
  const [yearMonth, setYearMonth] = React.useState('4')
  const [yearDay, setYearDay] = React.useState('1')
  const [weeklyHours, setWeeklyHours] = React.useState('')
  const [extraHours, setExtraHours] = React.useState('')
  const [payMethod, setPayMethod] = React.useState<LeaveTermsRow['payMethod']>('NORMAL_REMUNERATION_52_WEEKS')
  const [carryOver, setCarryOver] = React.useState('')
  const [effectiveFrom, setEffectiveFrom] = React.useState('')
  // Entry form
  const [entryType, setEntryType] = React.useState<LeaveEntryRow['entryType']>('TAKEN')
  const [entitlementType, setEntitlementType] = React.useState<LeaveEntryRow['entitlementType']>('STATUTORY')
  const [unit, setUnit] = React.useState<'DAYS' | 'HOURS'>('DAYS')
  const [amount, setAmount] = React.useState('')
  const [entryDate, setEntryDate] = React.useState('')
  const [entryNote, setEntryNote] = React.useState('')

  const inForce = position?.terms ?? null
  const hoursPerDay = inForce?.weeklyHours ? inForce.weeklyHours / 5 : null
  const amountNumber = amount.trim() === '' ? NaN : Number(amount)
  // Days need the weekly hours of the terms; without them the entry is in hours.
  const effectiveUnit = hoursPerDay ? unit : 'HOURS'
  const entryHours = effectiveUnit === 'HOURS' ? amountNumber : r2(amountNumber * hoursPerDay!)
  const asDays = (hours: number) => (hoursPerDay ? ` (${r2(hours / hoursPerDay)} days)` : '')
  const signed = entryType === 'ADJUSTMENT' || entryType === 'CARRY_OVER'
  const entryValid =
    Number.isFinite(entryHours) && (signed ? entryHours !== 0 : entryHours > 0) && Boolean(entryDate) && entryNote.trim().length >= 3
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

  const part = (label: string, p?: { entitlement: number; taken: number; balance: number; fullYearEntitlement: number }) =>
    p ? (
      <div className="text-xs">
        <span className="font-medium text-foreground">{label}:</span> earned so far {p.entitlement}h{asDays(p.entitlement)} of{' '}
        {p.fullYearEntitlement}h{asDays(p.fullYearEntitlement)} this year · taken {p.taken}h{asDays(p.taken)} ·{' '}
        <span className={p.balance < 0 ? 'font-medium text-destructive' : 'font-medium text-foreground'}>
          balance {p.balance}h{asDays(p.balance)}
        </span>
      </div>
    ) : null

  return (
    <section className="space-y-3 rounded-md border border-border p-3" data-testid="leave-holiday">
      <h3 className="text-sm font-medium">Leave / Holiday</h3>

      {/* Position today */}
      {position?.terms ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Leave year {position.leaveYear?.start} to {position.leaveYear?.end} · {CATEGORY_LABELS[position.terms.workerCategory]}
            {position.terms.weeklyHours ? ` · ${position.terms.weeklyHours} hours a week (a day = ${hoursPerDay} hours)` : ''}
          </p>
          {part('Statutory', position.statutory)}
          {position.contractual && position.contractual.fullYearEntitlement > 0 ? part('Contractual', position.contractual) : null}
          {position.holidayPay ? (
            <p className="text-xs text-muted-foreground">
              Holiday pay: {position.holidayPay.averageHourlyPay != null ? `${gbp(position.holidayPay.averageHourlyPay)} an hour. ` : ''}
              {position.holidayPay.note}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {position?.note ?? 'No approved leave terms are in force: enter them below and have a second person approve them.'}
        </p>
      )}

      {/* Leaver */}
      <div className="space-y-1 rounded-md bg-muted/30 p-2">
        <p className="text-xs font-medium">Leaver position</p>
        <p className="text-xs text-muted-foreground">
          Leaving date on the employment record: <span className="font-medium text-foreground">{employmentEndDate ?? 'not set'}</span> (set it
          under Employees → Employment → End date). You can preview another date here without saving it.
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
              Untaken by {lv.leavingDate}: {lv.untakenHours}h{asDays(lv.untakenHours)}
              {lv.paymentInLieu != null ? ` · payment in lieu about ${gbp(lv.paymentInLieu)}` : ''}.
            </p>
          )
        ) : null}
      </div>

      {/* Entries */}
      <div>
        <p className="text-xs font-medium text-muted-foreground">Recorded leave (most recent first)</p>
        {entries.length ? (
          <table className="mt-1 w-full text-left text-xs" data-testid="leave-entries">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-2 font-medium">Date</th>
                <th className="py-1 pr-2 font-medium">Type</th>
                <th className="py-1 pr-2 font-medium">Kind</th>
                <th className="py-1 pr-2 text-right font-medium">Hours</th>
                <th className="py-1 pr-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-border/70">
                  <td className="py-1 pr-2">{e.date}</td>
                  <td className="py-1 pr-2">{ENTRY_LABELS[e.entryType] ?? e.entryType}</td>
                  <td className="py-1 pr-2">{e.entitlementType.toLowerCase()}</td>
                  <td className="py-1 pr-2 text-right">
                    {e.hours}
                    {asDays(e.hours)}
                  </td>
                  <td className="py-1 pr-2">{e.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-muted-foreground">No leave recorded.</p>
        )}
      </div>

      {canEdit ? (
        <div className="space-y-2 rounded-md border border-border/70 p-2" data-testid="leave-entry-form">
          <p className="text-xs font-medium">Record leave</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block space-y-1 text-sm">
              <span>Type</span>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={entryType} onChange={(e) => setEntryType(e.target.value as LeaveEntryRow['entryType'])} aria-label="Leave entry type">
                {(Object.keys(ENTRY_LABELS) as LeaveEntryRow['entryType'][]).map((k) => (
                  <option key={k} value={k}>
                    {ENTRY_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Statutory or contractual</span>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={entitlementType} onChange={(e) => setEntitlementType(e.target.value as LeaveEntryRow['entitlementType'])} aria-label="Leave entitlement type">
                <option value="STATUTORY">Statutory (28 days)</option>
                <option value="CONTRACTUAL">Contractual extra</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Date</span>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} aria-label="Leave date" />
            </label>
            <label className="block space-y-1 text-sm">
              <span>{effectiveUnit === 'DAYS' ? 'Days' : 'Hours'}</span>
              <Input type="number" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Leave amount" />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Unit</span>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={effectiveUnit} onChange={(e) => setUnit(e.target.value as 'DAYS' | 'HOURS')} aria-label="Leave unit">
                <option value="DAYS" disabled={!hoursPerDay}>
                  Days{hoursPerDay ? ` (1 day = ${hoursPerDay}h)` : ' (needs weekly hours on the terms)'}
                </option>
                <option value="HOURS">Hours</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Note</span>
              <Input value={entryNote} onChange={(e) => setEntryNote(e.target.value)} aria-label="Leave note" />
            </label>
          </div>
          {Number.isFinite(entryHours) && amount ? <p className="text-xs text-muted-foreground">Recorded as {entryHours} hours.</p> : null}
          {entryError ? <p className="text-xs text-destructive" role="alert">{entryError}</p> : null}
          <Button
            size="sm"
            variant="outline"
            disabled={actions.recordEntry.isPending || !entryValid}
            onClick={() =>
              void actions.recordEntry
                .mutateAsync({ entryType, entitlementType, hours: entryHours, date: entryDate, note: entryNote.trim() })
                .then(() => {
                  setAmount('')
                  setEntryNote('')
                })
                .catch(() => undefined)
            }
          >
            Record leave
          </Button>
        </div>
      ) : null}

      {/* Terms */}
      <div>
        <p className="text-xs font-medium text-muted-foreground">Leave terms</p>
        {terms.length ? (
          <table className="mt-1 w-full text-left text-xs">
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
                  <td className="py-1 pr-2">{t.status === 'DRAFT' ? 'Awaiting approval' : t.status.toLowerCase()}</td>
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
          <p className="text-xs text-muted-foreground">No leave terms entered.</p>
        )}
        {approveError ? <p className="text-xs text-destructive" role="alert">{approveError}</p> : null}
      </div>

      {canEdit ? (
        <div className="space-y-2 rounded-md border border-border/70 p-2" data-testid="leave-terms-form">
          <p className="text-xs font-medium">Enter leave terms (a second person approves them)</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block space-y-1 text-sm">
              <span>Worker</span>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value as LeaveTermsRow['workerCategory'])} aria-label="Worker category">
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
            <label className="block space-y-1 text-sm">
              <span>Leave year starts (month)</span>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} aria-label="Leave year start month">
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Leave year starts (day)</span>
              <Input type="number" min={1} max={28} value={yearDay} onChange={(e) => setYearDay(e.target.value)} aria-label="Leave year start day" />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Holiday pay method</span>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={payMethod} onChange={(e) => setPayMethod(e.target.value as LeaveTermsRow['payMethod'])} aria-label="Holiday pay method">
                <option value="NORMAL_REMUNERATION_52_WEEKS">Paid when taken (52-week average)</option>
                <option value="ROLLED_UP_12_07" disabled={category === 'REGULAR_HOURS'}>
                  Rolled-up 12.07% (irregular / part-year only)
                </option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Contract extra hours a year (optional)</span>
              <Input type="number" step="0.5" value={extraHours} onChange={(e) => setExtraHours(e.target.value)} aria-label="Contractual extra hours" />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Carry-over allowed, hours (optional)</span>
              <Input type="number" step="0.5" value={carryOver} onChange={(e) => setCarryOver(e.target.value)} aria-label="Carry-over hours" />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Statutory leave is 5.6 weeks (28 days for a 5-day week). Regular-hours workers earn it in proportion to the part of the leave
            year they are employed; irregular-hours and part-year workers at 12.07% of hours worked.
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
            Save leave terms
          </Button>
        </div>
      ) : null}
    </section>
  )
}
