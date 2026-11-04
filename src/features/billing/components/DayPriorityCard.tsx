import * as React from 'react'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useDayPriority, useSetDayPriority } from '@/features/billing/hooks/useWageTypes'

const MIN_REASON_LENGTH = 10

/** Day types with the names shown on pay cards. */
const DAY_LABELS: Record<string, string> = {
  CHRISTMAS: 'Christmas Day',
  BOXING_DAY: 'Boxing Day',
  NEW_YEAR: "New Year's Day",
  EASTER: 'Easter',
  SPECIAL: 'Organisation special day',
  BANK_HOLIDAY: 'Bank holiday',
  SUNDAY: 'Sunday',
  SATURDAY: 'Saturday',
  WEEKDAY: 'Weekday',
  ANY: 'Any day',
}
const DAY_TYPES = Object.keys(DAY_LABELS)

/** Highest priority first. */
const orderOf = (priorities: Record<string, number>) =>
  [...DAY_TYPES].sort((a, b) => (priorities[b] ?? 0) - (priorities[a] ?? 0))

/** The list order as the numbers the server stores (top = highest). */
const prioritiesOf = (order: string[]) =>
  Object.fromEntries(order.map((d, i) => [d, (order.length - i) * 10]))

/**
 * Organisation policy for carer pay: when rules for different days match the same visit or time,
 * the day higher in the list wins. Applies to every pay card.
 */
export function DayPriorityCard({ canManage }: { canManage: boolean }) {
  const query = useDayPriority()
  const mutation = useSetDayPriority()
  const current = query.data
  const [order, setOrder] = React.useState<string[] | null>(null)
  const [dragging, setDragging] = React.useState<string | null>(null)
  /** Where the dragged day will land: above (`before`) or below the hovered row. */
  const [dropAt, setDropAt] = React.useState<{ day: string; before: boolean } | null>(null)
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (current) setOrder(orderOf(current.priorities))
  }, [current])

  if (!current || !order) {
    return <p className="text-sm text-muted-foreground">Loading day priority…</p>
  }

  const savedOrder = orderOf(current.priorities)
  const changed = order.some((d, i) => d !== savedOrder[i])
  const reasonOk = reason.trim().length >= MIN_REASON_LENGTH
  const editable = canManage && !mutation.isPending

  const move = (day: string, to: number) => {
    setOrder(prev => {
      if (!prev) return prev
      const next = prev.filter(d => d !== day)
      next.splice(Math.max(0, Math.min(to, next.length)), 0, day)
      return next
    })
  }

  const save = async (priorities: Record<string, number> | null) => {
    try {
      const res = await mutation.mutateAsync({ priorities, reason: reason.trim() })
      toastSuccess(res.message)
      setReason('')
    } catch (err) {
      toastApiError(err, 'Could not update the day priority.')
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-border p-3" data-testid="day-priority">
      <div>
        <p className="text-sm font-semibold text-foreground">Which day’s rate wins</p>
        <p className="text-xs text-muted-foreground">
          Drag the days into order — the day higher in the list wins when a pay card has rates for more than one day that
          match the same visit (for example a bank holiday that is also a Sunday, or an “any day” fixed amount on a bank
          holiday). Carer pay only, on every pay card. Visits already approved or paid keep their amounts.
          {current.custom ? '' : ' Now using the built-in order.'}
        </p>
      </div>

      <ol className="space-y-1.5" aria-label="Day priority, highest first">
        {order.map((day, index) => (
          <li
            key={day}
            draggable={editable}
            onDragStart={e => {
              setDragging(day)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={e => {
              if (!dragging || dragging === day) return
              e.preventDefault()
              // The list only changes on drop, so the row under the pointer stays put while dragging.
              const rect = e.currentTarget.getBoundingClientRect()
              const before = e.clientY < rect.top + rect.height / 2
              if (dropAt?.day !== day || dropAt.before !== before) setDropAt({ day, before })
            }}
            onDragEnd={() => {
              setDragging(null)
              setDropAt(null)
            }}
            onDrop={e => {
              e.preventDefault()
              if (dragging && dragging !== day) {
                const from = order.indexOf(dragging)
                const before = dropAt?.day === day ? dropAt.before : true
                let to = before ? index : index + 1
                if (from < to) to -= 1
                move(dragging, to)
              }
              setDragging(null)
              setDropAt(null)
            }}
            className={cn(
              'flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm',
              editable && 'cursor-grab active:cursor-grabbing',
              dragging === day && 'border-primary bg-primary/5 opacity-70',
              dropAt?.day === day && (dropAt.before ? 'border-t-2 border-t-primary' : 'border-b-2 border-b-primary'),
            )}
            data-testid={`day-priority-${day}`}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
            <span className="flex-1 font-medium text-foreground">{DAY_LABELS[day]}</span>
            {index === 0 ? <span className="text-xs text-muted-foreground">wins first</span> : null}
            {index === order.length - 1 ? <span className="text-xs text-muted-foreground">last</span> : null}
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={!editable || index === 0}
                onClick={() => move(day, index - 1)}
                aria-label={`Move ${DAY_LABELS[day]} up`}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={!editable || index === order.length - 1}
                onClick={() => move(day, index + 1)}
                aria-label={`Move ${DAY_LABELS[day]} down`}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ol>

      {canManage && (changed || current.custom) ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[260px] flex-1 space-y-1 text-sm">
            <span className="text-xs font-medium text-foreground/90">Who decided this, and why (kept in the audit log)</span>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={500}
              placeholder="e.g. Agreed by the directors on 1 November"
              aria-label="Reason for changing the day priority"
            />
          </label>
          {changed ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setOrder(savedOrder)} disabled={mutation.isPending}>
                Undo
              </Button>
              <Button size="sm" onClick={() => void save(prioritiesOf(order))} disabled={!reasonOk || mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save order'}
              </Button>
            </>
          ) : null}
          {current.custom && !changed ? (
            <Button size="sm" variant="outline" onClick={() => void save(null)} disabled={!reasonOk || mutation.isPending}>
              Reset to built-in order
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
