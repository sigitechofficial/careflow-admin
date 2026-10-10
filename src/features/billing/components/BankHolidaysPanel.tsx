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
  useImportBankHolidays,
  useUpdateBankHoliday,
} from '@/features/billing/hooks/useWageTypes'
import {
  BANK_HOLIDAY_REGION_OPTIONS,
  type BankHolidayRegion,
} from '@/features/billing/types/wage-types.types'
import { formatBillingDate } from '@/features/billing/types/billing-cards.types'

const selectClass = 'flex h-9 rounded-md border border-input bg-background px-3 text-sm'

/** Bank holiday calendars per UK nation, used for bank holiday pay rates. */
export function BankHolidaysPanel() {
  const canManage = useAuthStore(s => s.can('billing.pay_cards.manage' as never))
  const thisYear = String(new Date().getFullYear())
  const [region, setRegion] = React.useState<BankHolidayRegion>('UK')
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
      toastSuccess('Bank holiday added.')
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
        description="Calendars used for bank holiday pay. Each pay card chooses its nation (England & Wales by default). Switched-off dates are ignored; past dates are never imported, so already-priced visits are not affected."
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

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-foreground/90">Nation</span>
          <select className={selectClass} value={region} onChange={e => setRegion(e.target.value as BankHolidayRegion)}>
            {BANK_HOLIDAY_REGION_OPTIONS.map(o => (
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
                  No bank holidays for this nation and year. Bank holiday rates will not apply until dates are added.
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 whitespace-nowrap">{formatBillingDate(row.holidayDate)}</td>
                  <td className="px-3 py-2.5">{row.name}</td>
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
