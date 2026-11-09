import { useChargeCards } from '@/features/billing/hooks/useChargeCards'

/**
 * Pick an existing charge card (the rates used to price visits). When none exist, or the right one is missing,
 * it guides the user to create one in a new tab (so the form they are filling in is kept) and refresh the list.
 * Used for a funder's standard rates, a funding line, and when adding a service user.
 */
export function ChargeCardPicker({
  value,
  onChange,
  label = 'Charge card',
  placeholder = '— Choose a charge card —',
  disabled,
  testId,
}: {
  value: string
  onChange: (id: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  testId?: string
}) {
  const q = useChargeCards()
  const cards = [...(q.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const refresh = (
    <button
      type="button"
      className="font-medium text-primary hover:underline"
      disabled={q.isFetching}
      onClick={() => void q.refetch()}
    >
      {q.isFetching ? 'checking…' : 'refresh the list'}
    </button>
  )
  const create = (
    <a
      href="/billing/charge-cards/new"
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary hover:underline"
    >
      Create a charge card
    </a>
  )

  if (!q.isLoading && cards.length === 0) {
    return (
      <div
        className="space-y-1 rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground"
        data-testid={testId ? `${testId}-empty` : undefined}
      >
        <p>No charge cards yet. A charge card holds the rates used to price each visit.</p>
        <p>
          {create} (opens in a new tab, so nothing here is lost), then {refresh}.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <select
        aria-label={label}
        data-testid={testId}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        value={value}
        disabled={disabled || q.isLoading}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">{q.isLoading ? 'Loading charge cards…' : placeholder}</option>
        {cards.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.status && c.status !== 'ACTIVE' ? ` (${c.status.toLowerCase()})` : ''}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        Not listed? {create} (new tab), then {refresh}.
      </p>
    </div>
  )
}
