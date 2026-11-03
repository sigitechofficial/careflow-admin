import * as React from 'react'
import { Clock } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useUpdateEnquiry } from '@/features/crm/hooks/useCrm'
import { hours, overWeeklyHours, weeklyVisitMinutes } from '@/features/crm/quote-labels'
import type { Enquiry } from '@/features/crm/types/crm.types'
import type { QuotePatternInput } from '@/features/crm/types/quotation.types'

/**
 * The enquiry's hours per week: the most care time the quote's visits can add up to. Changed here,
 * it is saved on the enquiry straight away.
 */
export function WeeklyHoursLimit({
  enquiry,
  patterns,
  readOnly,
}: {
  enquiry: Enquiry
  patterns: QuotePatternInput[]
  readOnly: boolean
}) {
  const update = useUpdateEnquiry(enquiry.id)
  const saved = enquiry.hoursPerWeek
  const [value, setValue] = React.useState(saved != null ? String(saved) : '')
  React.useEffect(() => setValue(saved != null ? String(saved) : ''), [saved])

  const typed = value.trim() === '' ? null : Number(value)
  const valid = typed != null && typed > 0 && typed <= 168
  const changed = typed !== saved
  const used = weeklyVisitMinutes(patterns)
  const over = overWeeklyHours(used, saved)
  const left = saved != null ? saved * 60 - used : 0

  const save = () => {
    if (!valid) return
    update.mutate(
      { hoursPerWeek: typed },
      {
        onSuccess: () => toastSuccess(`Hours per week set to ${typed}`),
        onError: e => toastApiError(e, 'Could not save the hours per week'),
      },
    )
  }

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm',
        over ? 'border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20' : 'border-border bg-card',
      )}
      data-testid="quote-hours-limit"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Clock className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">Hours per week</p>
            <p className="text-xs text-muted-foreground">
              From the enquiry. The visits can’t add up to more than this; a visit with 2 carers counts once.
            </p>
          </div>
        </div>
        {readOnly ? (
          <p className="text-lg font-semibold tabular-nums">{saved != null ? `${saved} h` : '—'}</p>
        ) : (
          <form
            className="flex items-center gap-2"
            onSubmit={e => {
              e.preventDefault()
              save()
            }}
          >
            <div className="relative w-28">
              <Input
                id="quote-hours-per-week"
                type="number"
                min={0.5}
                max={168}
                step={0.5}
                className={cn('pr-8 tabular-nums', saved == null && 'border-amber-400')}
                aria-label="Hours per week"
                placeholder="e.g. 14"
                value={value}
                onChange={e => setValue(e.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">h</span>
            </div>
            {changed && (
              <Button type="submit" size="sm" disabled={!valid || update.isPending}>
                {update.isPending ? 'Saving…' : 'Save'}
              </Button>
            )}
          </form>
        )}
      </div>

      {saved == null ? (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
          No hours per week on the enquiry yet{readOnly ? '.' : ' — enter them above.'}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className={cn('h-full rounded-full', over ? 'bg-red-500' : left <= 0 ? 'bg-amber-500' : 'bg-primary')}
              style={{ width: `${Math.min(100, (used / (saved * 60)) * 100)}%` }}
            />
          </div>
          <p className={cn('text-xs', over ? 'font-medium text-red-700 dark:text-red-300' : 'text-muted-foreground')} data-testid="quote-hours-used">
            {hours(used)} of {saved} h used ·{' '}
            {over ? `${hours(-left)} over — remove visits or raise the hours` : left > 0 ? `${hours(left)} left` : 'all used — no more visits can be added'}
          </p>
        </div>
      )}
    </section>
  )
}
