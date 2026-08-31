import * as React from 'react'
import { Calendar, CalendarRange } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import {
  defaultBillingMonthRange,
  defaultBillingWeekRange,
} from '@/features/billing/utils/billing-run.util'

type BillingRunPeriodMode = 'monthly' | 'weekly'

/** End date implied by a start date for the chosen period type (weekly = +6 days, monthly = one month span). */
function periodEndForStart(start: string, mode: BillingRunPeriodMode): string {
  const [year, month, day] = start.split('-').map(Number)
  if (!year || !month || !day) return start
  if (mode === 'weekly') {
    return new Date(Date.UTC(year, month - 1, day + 6)).toISOString().slice(0, 10)
  }
  // Monthly: same day of the next month, minus one day (a full month-long span).
  const end = new Date(Date.UTC(year, month, day))
  end.setUTCDate(end.getUTCDate() - 1)
  return end.toISOString().slice(0, 10)
}

type BillingRunPeriodDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  isPending?: boolean
  onSubmit: (values: { periodStart: string; periodEnd: string }) => void | Promise<void>
}

export function BillingRunPeriodDialog({
  open,
  onOpenChange,
  title,
  description,
  isPending,
  onSubmit,
}: BillingRunPeriodDialogProps) {
  const defaults = React.useMemo(() => defaultBillingMonthRange(), [])
  const [mode, setMode] = React.useState<BillingRunPeriodMode>('monthly')
  const [periodStart, setPeriodStart] = React.useState(defaults.periodStart)
  const [periodEnd, setPeriodEnd] = React.useState(defaults.periodEnd)

  React.useEffect(() => {
    if (open) {
      const range = defaultBillingMonthRange()
      setMode('monthly')
      setPeriodStart(range.periodStart)
      setPeriodEnd(range.periodEnd)
    }
  }, [open])

  const applyMode = (next: BillingRunPeriodMode) => {
    setMode(next)
    const range = next === 'weekly' ? defaultBillingWeekRange() : defaultBillingMonthRange()
    setPeriodStart(range.periodStart)
    setPeriodEnd(range.periodEnd)
  }

  const handleStartChange = (value: string) => {
    setPeriodStart(value)
    if (value) setPeriodEnd(periodEndForStart(value, mode))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void onSubmit({ periodStart, periodEnd })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-5 py-4">
            <div className="grid gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Period type
              </span>
              <div className="flex w-full gap-1 rounded-lg border border-border bg-muted/40 p-1">
                {(
                  [
                    { value: 'monthly', label: 'Monthly', icon: Calendar },
                    { value: 'weekly', label: 'Weekly', icon: CalendarRange },
                  ] as { value: BillingRunPeriodMode; label: string; icon: typeof Calendar }[]
                ).map(option => {
                  const Icon = option.icon
                  const active = mode === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => applyMode(option.value)}
                      aria-pressed={active}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        active
                          ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {option.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {mode === 'weekly'
                  ? 'Latest full week (Mon–Sun). Adjust the dates below if needed.'
                  : 'Latest full calendar month. Adjust the dates below if needed.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label
                  htmlFor="periodStart"
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Period start
                </label>
                <Input
                  id="periodStart"
                  type="date"
                  value={periodStart}
                  onChange={e => handleStartChange(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <label
                  htmlFor="periodEnd"
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Period end
                </label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={periodEnd}
                  onChange={e => setPeriodEnd(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create run'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
