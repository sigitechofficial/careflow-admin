import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { SectionInfoTip } from '@/features/billing/components/SectionInfoTip'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useSetTravelGapSettings, useTravelGapSettings } from '@/features/billing/hooks/useWageTypes'
import type { TravelGapSettings, TravelPayBasis } from '@/features/billing/types/wage-types.types'

const MIN_REASON_LENGTH = 10
const MAX_MINUTES = 720

type NumberKey = Exclude<keyof TravelGapSettings, 'enabled' | 'basis'>
type Field = { key: NumberKey; label: string; unit: string; hint: string }

const GAP_FIELDS: Field[] = [
  {
    key: 'waitingGapMinutes',
    label: 'Waiting time up to',
    unit: 'minutes',
    hint: 'A gap this short or shorter is paid as waiting time.',
  },
  {
    key: 'breakGapMinutes',
    label: 'Break from (same service user)',
    unit: 'minutes',
    hint: 'A gap this long or longer between two visits to the same person is a break, not paid.',
  },
  {
    key: 'wentHomeGapMinutes',
    label: 'Went home from',
    unit: 'minutes',
    hint: 'A gap this long or longer is treated as the carer going home, not paid. Shorter gaps are paid as travel.',
  },
]

const BASIS_OPTIONS: { value: TravelPayBasis; title: string; description: string }[] = [
  {
    value: 'DISTANCE',
    title: 'From the distance between addresses',
    description:
      'On the same day, travel and mileage are paid for every journey between two service users, however long the gap. Worked out from their addresses. Nothing is paid once the date changes.',
  },
  {
    value: 'GAP',
    title: 'From the gap between visits',
    description: 'The gap is paid as waiting or travel time using the limits below. Long gaps are not paid.',
  },
]

/** Admin rules for paying the time and miles between two visits. */
export function TravelGapSettingsCard({ canManage }: { canManage: boolean }) {
  const query = useTravelGapSettings()
  const mutation = useSetTravelGapSettings()
  const current = query.data
  const [values, setValues] = React.useState<Record<NumberKey, string> | null>(null)
  const [enabled, setEnabled] = React.useState(true)
  const [basis, setBasis] = React.useState<TravelPayBasis>('GAP')
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (current) {
      setEnabled(current.enabled)
      setBasis(current.basis)
      setValues({
        waitingGapMinutes: String(current.waitingGapMinutes),
        breakGapMinutes: String(current.breakGapMinutes),
        wentHomeGapMinutes: String(current.wentHomeGapMinutes),
      })
    }
  }, [current])

  if (!current || !values) {
    return <p className="text-sm text-muted-foreground">Loading travel settings…</p>
  }

  const parsed: Record<NumberKey, number> = {
    waitingGapMinutes: Number(values.waitingGapMinutes),
    breakGapMinutes: Number(values.breakGapMinutes),
    wentHomeGapMinutes: Number(values.wentHomeGapMinutes),
  }
  const changed =
    enabled !== current.enabled ||
    basis !== current.basis ||
    (Object.keys(parsed) as NumberKey[]).some(k => parsed[k] !== current[k])
  const problem = (() => {
    const gaps = [parsed.waitingGapMinutes, parsed.breakGapMinutes, parsed.wentHomeGapMinutes]
    if (gaps.some(v => !Number.isInteger(v) || v < 1 || v > MAX_MINUTES)) {
      return `Each limit must be a whole number of minutes from 1 to ${MAX_MINUTES}.`
    }
    if (parsed.waitingGapMinutes >= parsed.breakGapMinutes) return 'Waiting time must be shorter than the break limit.'
    if (parsed.breakGapMinutes > parsed.wentHomeGapMinutes) return 'The break limit can’t be longer than “went home”.'
    return null
  })()
  const reasonOk = reason.trim().length >= MIN_REASON_LENGTH

  const onSave = async () => {
    try {
      const res = await mutation.mutateAsync({ enabled, basis, ...parsed, reason: reason.trim() })
      toastSuccess(res.message)
      setReason('')
    } catch (err) {
      toastApiError(err, 'Could not update the travel settings.')
    }
  }

  const renderFields = (fields: Field[]) => (
    <div className="grid gap-3 md:grid-cols-3">
      {fields.map(f => (
        <label key={f.key} className="space-y-1 text-sm">
          <span className="text-xs font-medium text-foreground/90">{f.label}</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step={1}
              className="w-24"
              value={values[f.key]}
              disabled={!canManage || mutation.isPending}
              onChange={e => setValues(v => (v ? { ...v, [f.key]: e.target.value } : v))}
              aria-label={f.label}
            />
            <span className="text-xs text-muted-foreground">{f.unit}</span>
          </div>
          <span className="block text-xs text-muted-foreground">{f.hint}</span>
        </label>
      ))}
    </div>
  )

  return (
    <section className="space-y-3 rounded-lg border border-border p-3" data-testid="travel-gap-settings">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        Travel and waiting time between visits
        <SectionInfoTip label="travel and waiting time between visits">
          How the time and miles between two of a carer’s visits are paid, using the pay card’s travel, waiting and
          mileage rates. Visits already approved or paid keep their amounts.
        </SectionInfoTip>
      </h3>
      <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
          checked={enabled}
          disabled={!canManage || mutation.isPending}
          onChange={e => setEnabled(e.target.checked)}
          aria-label="Pay the time between visits automatically"
        />
        <span>
          <span className="font-medium text-foreground">Pay the time between visits automatically</span>
          <span className="block text-xs text-muted-foreground">
            {enabled
              ? 'On: travel is worked out using the choice below.'
              : 'Off: nothing is paid automatically. Only travel minutes and miles entered by hand on a visit are paid.'}
          </span>
        </span>
      </label>

      {enabled ? (
        <>
          <div className="grid gap-2 md:grid-cols-2" role="radiogroup" aria-label="How travel is paid">
            {BASIS_OPTIONS.map(o => (
              <label
                key={o.value}
                className={`flex gap-2 rounded-md border p-2 text-sm ${
                  basis === o.value ? 'border-primary bg-primary/5' : 'border-border'
                } ${canManage ? 'cursor-pointer' : ''}`}
              >
                <input
                  type="radio"
                  name="travel-pay-basis"
                  className="mt-0.5 shrink-0"
                  checked={basis === o.value}
                  disabled={!canManage || mutation.isPending}
                  onChange={() => setBasis(o.value)}
                />
                <span>
                  <span className="font-medium text-foreground">
                    {o.title}
                    {o.value === current.basis ? ' (in use)' : ''}
                    <span className="ml-1.5 inline-flex align-middle">
                      <SectionInfoTip label={`travel ${o.title.toLowerCase()}`}>
                        <p>{o.description}</p>
                        {o.value === 'DISTANCE' ? (
                          <p className="mt-1.5">
                            Miles and minutes come from the Google Maps driving route, filled on each visit. When
                            Google gives no route they are estimated from the addresses. A journey is flagged for
                            review instead of paid when an address has no map location or the trip is over 50 miles.
                            Two visits to the same person have no journey.
                          </p>
                        ) : null}
                      </SectionInfoTip>
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>
          {basis === 'GAP' ? renderFields(GAP_FIELDS) : null}
        </>
      ) : null}

      {changed && problem ? <p className="text-xs text-destructive">{problem}</p> : null}
      {canManage && changed && !problem ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[260px] flex-1 space-y-1 text-sm">
            <span className="text-xs font-medium text-foreground/90">Who decided this, and why (kept in the audit log)</span>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={500}
              placeholder="e.g. Agreed by the directors on 1 November"
              aria-label="Reason for changing the travel settings"
            />
          </label>
          <Button size="sm" onClick={() => void onSave()} disabled={!reasonOk || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save travel settings'}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
