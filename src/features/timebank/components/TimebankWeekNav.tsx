import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { mondayOf, shiftWeek } from '@/features/timebank/timebank-format'

/** Previous / next week, a date picker and "This week" — the week lives in the URL (`?week=`). */
export function TimebankWeekNav({
  shownWeek,
  range,
  isCurrent,
  goToWeek,
}: {
  shownWeek: string | undefined
  range: { weekStart: string; weekEnd: string } | undefined
  isCurrent: boolean
  goToWeek: (week: string | undefined) => void
}) {
  const { formatDate } = useOrganisationDisplayFormat()
  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Previous week"
        disabled={!shownWeek}
        onClick={() => shownWeek && goToWeek(shiftWeek(shownWeek, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-[13rem] text-center">
        <p className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-foreground">
          <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          {isCurrent ? 'This week' : 'Week'}
        </p>
        <p className="text-xs text-muted-foreground">
          {range ? `${formatDate(range.weekStart)} – ${formatDate(range.weekEnd)}` : ' '}
        </p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Next week"
        disabled={!shownWeek}
        onClick={() => shownWeek && goToWeek(shiftWeek(shownWeek, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <input
        type="date"
        className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
        value={shownWeek ?? ''}
        aria-label="Jump to the week of a date"
        onChange={e => e.target.value && goToWeek(mondayOf(e.target.value))}
        data-testid="timebank-week-picker"
      />
      {!isCurrent ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => goToWeek(undefined)}>
          This week
        </Button>
      ) : null}
    </>
  )
}
