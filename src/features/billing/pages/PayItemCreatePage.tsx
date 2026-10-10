import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Save, Wallet } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { toastSuccess } from '@/shared/lib/toast'
import { useCreatePayItem, usePayItemSuggestion } from '@/features/billing/hooks/usePayItems'
import {
  PAY_ITEM_TYPE_OPTIONS,
  PAY_ITEM_UNIT_LABELS,
  type PayItemUnit,
  type PayItemWageType,
} from '@/features/billing/types/pay-items.types'
import { formatBillingDate } from '@/features/billing/types/billing-cards.types'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useEmployeeHolidays } from '@/features/employees/hooks/useEmployeeTabs'
import { useEmployeeAbsences } from '@/features/employees/hooks/useEmployeeAbsences'

const fieldLabel = 'text-xs font-medium text-foreground/90'
const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm'

/** Enter one non-visit pay item for a carer. It waits for approval before it can be paid. */
export default function PayItemCreatePage() {
  const navigate = useNavigate()
  const createMutation = useCreatePayItem()
  const [employeeSearch, setEmployeeSearch] = React.useState('')
  const employeesQuery = useEmployees({ search: employeeSearch || undefined, limit: 50 })
  const [employeeId, setEmployeeId] = React.useState('')
  const [wageTypeCode, setWageTypeCode] = React.useState<PayItemWageType>('BONUS')
  const typeMeta = PAY_ITEM_TYPE_OPTIONS.find(o => o.value === wageTypeCode)!
  const [unit, setUnit] = React.useState<PayItemUnit>(typeMeta.units[0] ?? 'AMOUNT')
  const [workDate, setWorkDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [quantity, setQuantity] = React.useState('')
  const [rate, setRate] = React.useState('')
  const [rateTouched, setRateTouched] = React.useState(false)
  const [amount, setAmount] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [sourceId, setSourceId] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setUnit(typeMeta.units[0] ?? 'AMOUNT')
    setSourceId('')
    setRateTouched(false)
  }, [wageTypeCode, typeMeta.units])

  const suggestion = usePayItemSuggestion({ employeeId, wageTypeCode, unit, date: workDate }, unit !== 'AMOUNT')
  React.useEffect(() => {
    if (rateTouched) return
    const r = suggestion.data?.rate
    setRate(r != null ? String(r) : '')
  }, [suggestion.data, rateTouched])

  const holidaysQuery = useEmployeeHolidays(employeeId, typeMeta.link === 'EMPLOYEE_HOLIDAY' && !!employeeId)
  const absencesQuery = useEmployeeAbsences(
    { employeeId, sicknessOnly: true },
    typeMeta.link === 'EMPLOYEE_ABSENCE' && !!employeeId,
  )
  const linkOptions = React.useMemo(() => {
    if (typeMeta.link === 'EMPLOYEE_HOLIDAY') {
      return (holidaysQuery.data ?? []).map(h => ({
        value: h.id,
        label: `${formatBillingDate(h.startDate)} → ${formatBillingDate(h.endDate)}${h.notes ? ` · ${h.notes}` : ''}`,
      }))
    }
    if (typeMeta.link === 'EMPLOYEE_ABSENCE') {
      return (absencesQuery.data?.rows ?? []).map(a => ({
        value: a.id,
        label: `${formatBillingDate(a.fromDateTime)} → ${formatBillingDate(a.toDateTime)} · ${a.absenceType}`,
      }))
    }
    return []
  }, [typeMeta.link, holidaysQuery.data, absencesQuery.data])

  const employeeOptions = (employeesQuery.data?.rows ?? []).map(e => ({
    value: e.id,
    label: e.fullName || [e.firstName, e.lastName].filter(Boolean).join(' ') || 'Carer',
  }))

  const total =
    unit === 'AMOUNT'
      ? Number(amount || 0)
      : Math.round(Number(quantity || 0) * Number(rate || 0) * 100) / 100
  const saving = createMutation.isPending

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!employeeId) return setError('Choose the carer.')
    if (reason.trim().length < 3) return setError('Enter a reason (at least 3 characters).')
    if (unit === 'AMOUNT') {
      const n = Number(amount)
      if (!Number.isFinite(n) || n === 0) return setError('Enter an amount.')
      if (n < 0 && !typeMeta.allowNegative) return setError('Only manual adjustments can be negative.')
    } else {
      if (!(Number(quantity) > 0)) return setError('Enter how many units (more than zero).')
      if (rate === '' || !(Number(rate) >= 0)) return setError('Enter the rate.')
    }
    try {
      await createMutation.mutateAsync({
        employeeId,
        wageTypeCode,
        workDate,
        unit,
        ...(unit === 'AMOUNT' ? { amount: Number(amount) } : { quantity: Number(quantity), rate: Number(rate) }),
        reason: reason.trim(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(sourceId && typeMeta.link ? { sourceType: typeMeta.link, sourceId } : {}),
      })
      toastSuccess('Pay item created — awaiting approval.')
      void navigate({ to: '/billing/pay-items' })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create pay item.')
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-4">
        <Link to="/billing/pay-items" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Pay items
        </Link>
        <ContentSectionHeader
          icon={<Wallet className="h-5 w-5" />}
          iconClassName="bg-teal-500/10 text-teal-700 dark:text-teal-300"
          title="New pay item"
          description="Paid in the next visit pay run that covers the date, once approved."
        />
      </div>

      <form onSubmit={onSubmit} className="space-y-6" data-testid="pay-item-form">
        {error ? (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <ContentCard className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-1">
              <span className={fieldLabel}>Carer <span className="text-destructive">*</span></span>
              <Combobox
                options={employeeOptions}
                value={employeeId}
                onChange={setEmployeeId}
                onSearchChange={setEmployeeSearch}
                placeholder="Search carer…"
                disabled={saving}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className={fieldLabel}>Type <span className="text-destructive">*</span></span>
              <select
                className={selectClass}
                value={wageTypeCode}
                onChange={e => setWageTypeCode(e.target.value as PayItemWageType)}
                disabled={saving}
                data-testid="pay-item-type"
              >
                {PAY_ITEM_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className={fieldLabel}>Date it relates to <span className="text-destructive">*</span></span>
              <Input type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} disabled={saving} required />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">{typeMeta.hint}</p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className={fieldLabel}>Entered as</span>
              <select
                className={selectClass}
                value={unit}
                onChange={e => {
                  setUnit(e.target.value as PayItemUnit)
                  setRateTouched(false)
                }}
                disabled={saving || typeMeta.units.length === 1}
                data-testid="pay-item-unit"
              >
                {typeMeta.units.map(u => (
                  <option key={u} value={u}>{PAY_ITEM_UNIT_LABELS[u]}</option>
                ))}
              </select>
            </label>
            {unit === 'AMOUNT' ? (
              <label className="space-y-1 text-sm">
                <span className={fieldLabel}>
                  Amount (£) <span className="text-destructive">*</span>
                </span>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={typeMeta.allowNegative ? 'e.g. 50 or -20' : 'e.g. 50'}
                  disabled={saving}
                  data-testid="pay-item-amount"
                />
              </label>
            ) : (
              <>
                <label className="space-y-1 text-sm">
                  <span className={fieldLabel}>
                    {PAY_ITEM_UNIT_LABELS[unit]} <span className="text-destructive">*</span>
                  </span>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    disabled={saving}
                    data-testid="pay-item-quantity"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className={fieldLabel}>
                    Rate (£ per {unit.toLowerCase()}) <span className="text-destructive">*</span>
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rate}
                    onChange={e => {
                      setRate(e.target.value)
                      setRateTouched(true)
                    }}
                    disabled={saving}
                    data-testid="pay-item-rate"
                  />
                </label>
              </>
            )}
            <div className="space-y-1 text-sm">
              <span className={fieldLabel}>Total</span>
              <p className="flex h-9 items-center text-lg font-semibold tabular-nums" data-testid="pay-item-total">
                {total < 0 ? '−' : ''}£{Math.abs(total).toFixed(2)}
              </p>
            </div>
          </div>
          {unit !== 'AMOUNT' && employeeId ? (
            <p className="text-xs text-muted-foreground" data-testid="pay-item-suggestion">
              {suggestion.isLoading ? 'Looking up rate…' : suggestion.data?.explanation}
            </p>
          ) : null}

          {typeMeta.link ? (
            <label className="block space-y-1 text-sm sm:max-w-xl">
              <span className={fieldLabel}>
                Link {typeMeta.link === 'EMPLOYEE_HOLIDAY' ? 'holiday booking' : 'sickness absence'} (optional)
              </span>
              <select
                className={selectClass}
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                disabled={saving || !employeeId}
              >
                <option value="">{employeeId ? 'Not linked' : 'Choose a carer first'}</option>
                {linkOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className={fieldLabel}>Reason <span className="text-destructive">*</span></span>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                maxLength={500}
                placeholder="e.g. Christmas bonus 2026"
                disabled={saving}
                data-testid="pay-item-reason"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className={fieldLabel}>Notes</span>
              <Input value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} disabled={saving} />
            </label>
          </div>
          {typeMeta.secondApprover ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">A different user must approve this item.</p>
          ) : null}
        </ContentCard>

        <div className="sticky bottom-0 z-10 -mx-1 flex justify-end gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
          <Button type="button" variant="outline" disabled={saving} onClick={() => void navigate({ to: '/billing/pay-items' })}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} leftIcon={<Save className="h-4 w-4" />} data-testid="pay-item-submit">
            {saving ? 'Saving…' : 'Create pay item'}
          </Button>
        </div>
      </form>
    </div>
  )
}
