import * as React from 'react'
import { CloudDownload, Plus } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import {
  useBankHolidays,
  useCreateBankHoliday,
  useHolidayCalendarStatus,
  useImportBankHolidays,
  useSetHolidayPremiumBasis,
  useUpdateBankHoliday,
} from '@/features/billing/hooks/useWageTypes'
import {
  BANK_HOLIDAY_REGION_OPTIONS,
  CALENDAR_REGION_OPTIONS,
  HOLIDAY_PREMIUM_BASIS_OPTIONS,
  type CalendarRegion,
  type HolidayCalendarStatus,
  type HolidayPremiumBasis,
} from '@/features/billing/types/wage-types.types'
import { formatBillingDate } from '@/features/billing/types/billing-cards.types'

const selectClass = 'flex h-9 rounded-md border border-input bg-background px-3 text-sm'
const MIN_REASON_LENGTH = 10

/**
 * Whether each nation's calendar can be priced from (PC-23). A year with dates missing prices
 * those days as ordinary days without saying so, so the gaps are listed here.
 */
function CalendarStatus({ status }: { status: HolidayCalendarStatus }) {
  const gaps = status.regions.flatMap(region =>
    region.years
      .filter(year => !year.complete)
      .map(year => ({
        key: `${region.region}-${year.year}`,
        label: `${BANK_HOLIDAY_REGION_OPTIONS.find(o => o.value === region.region)?.label ?? region.region} ${year.year}`,
        issues: year.issues,
      })),
  )
  if (gaps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="holiday-calendar-complete">
        The calendars for {status.years.join(' and ')} are complete for all three nations.
      </p>
    )
  }
  return (
    <div
      className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10"
      data-testid="holiday-calendar-gaps"
      role="alert"
    >
      <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
        Some calendars are not complete. Visits on a missing date are paid as an ordinary day.
      </p>
      <ul className="space-y-1 text-sm text-amber-950 dark:text-amber-100">
        {gaps.map(gap => (
          <li key={gap.key}>
            <span className="font-medium">{gap.label}:</span> {gap.issues.join(' ')}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Which day carries the pay card's holiday rate when a holiday falls on a weekend (PC-24). A
 * policy of the organisation: the calendar above says which days are holidays, not what is paid.
 */
function HolidayPremiumBasisCard({ current, canManage }: { current: HolidayPremiumBasis; canManage: boolean }) {
  const mutation = useSetHolidayPremiumBasis()
  const [basis, setBasis] = React.useState<HolidayPremiumBasis>(current)
  const [reason, setReason] = React.useState('')
  React.useEffect(() => setBasis(current), [current])
  const changed = basis !== current
  const reasonOk = reason.trim().length >= MIN_REASON_LENGTH

  const onSave = async () => {
    try {
      const res = await mutation.mutateAsync({ basis, reason: reason.trim() })
      toastSuccess(res.message)
      setReason('')
    } catch (err) {
      toastApiError(err, 'Could not update the holiday pay basis.')
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3" data-testid="holiday-premium-basis">
      <div>
        <p className="text-sm font-semibold text-foreground">When a holiday falls on a weekend</p>
        <p className="text-xs text-muted-foreground">
          Which day is paid at the pay card&apos;s holiday rate. This is carer pay only; client charges are
          not changed by it. Visits already approved or paid keep their amounts.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label="When a holiday falls on a weekend">
        {HOLIDAY_PREMIUM_BASIS_OPTIONS.map(option => (
          <label
            key={option.value}
            className={`flex gap-2 rounded-md border p-2 text-sm ${
              basis === option.value ? 'border-primary bg-primary/5' : 'border-border'
            } ${canManage ? 'cursor-pointer' : ''}`}
          >
            <input
              type="radio"
              name="holiday-premium-basis"
              className="mt-0.5 shrink-0"
              checked={basis === option.value}
              disabled={!canManage || mutation.isPending}
              onChange={() => setBasis(option.value)}
            />
            <span>
              <span className="font-medium text-foreground">
                {option.title}
                {option.value === current ? ' (in use)' : ''}
              </span>
              <span className="block text-xs text-muted-foreground">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
      {canManage && changed ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[260px] flex-1 space-y-1 text-sm">
            <span className="text-xs font-medium text-foreground/90">Who decided this, and why (kept in the audit log)</span>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={500}
              placeholder="e.g. Agreed by the directors on 1 March"
              aria-label="Reason for changing the holiday pay basis"
            />
          </label>
          <Button size="sm" onClick={() => void onSave()} disabled={!reasonOk || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Change the basis'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** Bank holiday calendars per UK nation, used for bank holiday pay rates. */
export function BankHolidaysPanel() {
  const canManage = useAuthStore(s => s.can('billing.pay_cards.manage' as never))
  const thisYear = String(new Date().getFullYear())
  const [region, setRegion] = React.useState<CalendarRegion>('UK')
  const organisationDays = region === 'ORGANISATION'
  const statusQuery = useHolidayCalendarStatus()
  const [year, setYear] = React.useState(thisYear)
  const holidaysQuery = useBankHolidays({ region, year })
  const createMutation = useCreateBankHoliday()
  const updateMutation = useUpdateBankHoliday()
  const importMutation = useImportBankHolidays()
  const [newDate, setNewDate] = React.useState('')
  const [newName, setNewName] = React.useState('')

  const rows = holidaysQuery.data ?? []
  const years = React.useMemo(() => {
    const y = Number(thisYear)
    return [y - 1, y, y + 1, y + 2].map(String)
  }, [thisYear])

  const onImport = async () => {
    try {
      const res = await importMutation.mutateAsync()
      toastSuccess(res.message)
    } catch (err) {
      toastApiError(err, 'Could not import bank holidays.')
    }
  }

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDate || !newName.trim()) return
    try {
      await createMutation.mutateAsync({ holidayDate: newDate, name: newName.trim(), region })
      toastSuccess(organisationDays ? 'Special day added.' : 'Bank holiday added.')
      setNewDate('')
      setNewName('')
    } catch (err) {
      toastApiError(err, 'Could not add bank holiday.')
    }
  }

  const onToggle = async (id: string, isActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, body: { isActive } })
    } catch (err) {
      toastApiError(err, 'Could not update bank holiday.')
    }
  }

  return (
    <div className="space-y-6" data-testid="bank-holidays-panel">
      <ContentSectionHeader
        title="Bank holidays"
        description="The calendar says which days are bank holidays; pay cards say what is paid on them. Each pay card chooses its nation (England & Wales by default). Switched-off dates are ignored; past dates are never imported, so already-priced visits are not affected."
        action={
          canManage ? (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<CloudDownload className="h-4 w-4" />}
              onClick={() => void onImport()}
              disabled={importMutation.isPending}
              data-testid="bank-holidays-import"
            >
              {importMutation.isPending ? 'Importing…' : 'Import from GOV.UK'}
            </Button>
          ) : undefined
        }
      />

      {statusQuery.data ? (
        <>
          <CalendarStatus status={statusQuery.data} />
          <HolidayPremiumBasisCard current={statusQuery.data.basis} canManage={canManage} />
        </>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-foreground/90">Calendar</span>
          <select className={selectClass} value={region} onChange={e => setRegion(e.target.value as CalendarRegion)}>
            {CALENDAR_REGION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-foreground/90">Year</span>
          <select className={selectClass} value={year} onChange={e => setYear(e.target.value)}>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>

      {organisationDays ? (
        <p className="text-sm text-muted-foreground" data-testid="organisation-special-days-note">
          Days your organisation treats as special (they are not bank holidays). A carer is paid more on
          one of these days only where their pay card has a rate for &ldquo;Special day&rdquo;; otherwise the
          ordinary rate for that day applies.
        </p>
      ) : null}

      {canManage ? (
        <form onSubmit={onAdd} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-foreground/90">Date</span>
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required />
          </label>
          <label className="min-w-[220px] flex-1 space-y-1 text-sm">
            <span className="text-xs font-medium text-foreground/90">Name</span>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Christmas Day" required maxLength={120} />
          </label>
          <Button type="submit" size="sm" leftIcon={<Plus className="h-4 w-4" />} disabled={createMutation.isPending}>
            Add date
          </Button>
        </form>
      ) : null}

      {holidaysQuery.error ? (
        <p className="text-sm text-destructive">
          {holidaysQuery.error instanceof ApiError ? holidaysQuery.error.message : 'Could not load bank holidays.'}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] text-sm" data-testid="bank-holidays-table">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
              {canManage ? <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {holidaysQuery.isLoading ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Loading bank holidays…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  {organisationDays
                    ? 'No organisation special days for this year.'
                    : 'No bank holidays for this nation and year. Bank holiday rates will not apply until dates are added.'}
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 whitespace-nowrap">{formatBillingDate(row.holidayDate)}</td>
                  <td className="px-3 py-2.5">
                    {row.name}
                    {row.isSubstitute ? (
                      <span className="ml-2 text-xs text-muted-foreground" data-testid="bank-holiday-substitute">
                        {row.substituteForDate
                          ? `Substitute day for ${formatBillingDate(row.substituteForDate)}`
                          : 'Substitute day — the date it stands for is not recorded'}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Switched off</Badge>}
                  </td>
                  {canManage ? (
                    <td className="px-3 py-2.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={updateMutation.isPending}
                        onClick={() => void onToggle(row.id, !row.isActive)}
                      >
                        {row.isActive ? 'Switch off' : 'Switch on'}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
