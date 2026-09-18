import * as React from 'react'
import { CalendarDays, CalendarRange, History } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import {
  rangeForInvoiceRunDatePreset,
  type InvoiceRunDatePreset,
} from '@/features/billing/utils/invoice-run-date-filter.util'

const DATE_PRESETS: {
  id: InvoiceRunDatePreset
  label: string
  icon: React.ReactNode
}[] = [
  { id: 'all', label: 'All time', icon: <History className="h-3.5 w-3.5" aria-hidden /> },
  {
    id: 'this-week',
    label: 'This week',
    icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden />,
  },
  {
    id: 'previous-week',
    label: 'Previous week',
    icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden />,
  },
  {
    id: 'this-month',
    label: 'This month',
    icon: <CalendarRange className="h-3.5 w-3.5" aria-hidden />,
  },
  {
    id: 'previous-month',
    label: 'Previous month',
    icon: <CalendarRange className="h-3.5 w-3.5" aria-hidden />,
  },
  {
    id: 'custom',
    label: 'Custom dates',
    icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden />,
  },
]

export function InvoiceRunDateFilterBar({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  testIdPrefix = 'billing-invoice-date',
}: {
  preset: InvoiceRunDatePreset
  onPresetChange: (preset: InvoiceRunDatePreset) => void
  customFrom: string
  customTo: string
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
  testIdPrefix?: string
}) {
  const { formatDate } = useOrganisationDisplayFormat()
  const filters = React.useMemo(
    () =>
      rangeForInvoiceRunDatePreset(
        preset,
        preset === 'custom' ? { dateFrom: customFrom, dateTo: customTo } : undefined,
      ),
    [preset, customFrom, customTo],
  )

  const rangeHint =
    filters.dateFrom && filters.dateTo
      ? `${formatDate(filters.dateFrom)} → ${formatDate(filters.dateTo)}`
      : filters.dateFrom
        ? `From ${formatDate(filters.dateFrom)}`
        : filters.dateTo
          ? `Until ${formatDate(filters.dateTo)}`
          : null

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-border bg-muted/10 p-4"
      data-testid={`${testIdPrefix}-filter`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden />
          Filter by invoice period
        </div>
        {rangeHint ? <p className="text-xs text-muted-foreground">{rangeHint}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {DATE_PRESETS.map(({ id, label, icon }) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={preset === id ? 'default' : 'outline'}
            leftIcon={icon}
            onClick={() => onPresetChange(id)}
            data-testid={`${testIdPrefix}-preset-${id}`}
          >
            {label}
          </Button>
        ))}
      </div>

      {preset === 'custom' ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/90">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              From
            </span>
            <Input
              type="date"
              value={customFrom}
              onChange={e => onCustomFromChange(e.target.value)}
              className="h-9 w-44"
              data-testid={`${testIdPrefix}-custom-from`}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/90">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              To
            </span>
            <Input
              type="date"
              value={customTo}
              onChange={e => onCustomToChange(e.target.value)}
              className="h-9 w-44"
              data-testid={`${testIdPrefix}-custom-to`}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}
