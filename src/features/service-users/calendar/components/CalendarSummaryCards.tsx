import type { ReactNode } from 'react'
import { Cake, CalendarDays, CalendarRange, PartyPopper } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type SummaryCard = {
  id: string
  label: string
  value: number
  hint: string
  icon: ReactNode
  accent: string
}

export function CalendarSummaryCards({
  year,
  month,
  thisMonthTotal,
  thisMonthBirthdays,
  nextMonthTotal,
  nextMonthBirthdays,
  loading,
}: {
  year: number
  month: number
  thisMonthTotal: number
  thisMonthBirthdays: number
  nextMonthTotal: number
  nextMonthBirthdays: number
  loading?: boolean
}) {
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  const thisLabel = `${MONTH_NAMES[month]} ${year}`
  const nextLabel = `${MONTH_NAMES[nextMonth]} ${nextYear}`

  const cards: SummaryCard[] = [
    {
      id: 'this-total',
      label: 'Events this month',
      value: thisMonthTotal,
      hint: thisLabel,
      icon: <CalendarDays className="h-4 w-4" />,
      accent: 'text-teal-700 dark:text-teal-400',
    },
    {
      id: 'this-birthdays',
      label: 'Birthdays this month',
      value: thisMonthBirthdays,
      hint: thisLabel,
      icon: <Cake className="h-4 w-4" />,
      accent: 'text-amber-700 dark:text-amber-400',
    },
    {
      id: 'next-total',
      label: 'Events next month',
      value: nextMonthTotal,
      hint: nextLabel,
      icon: <CalendarRange className="h-4 w-4" />,
      accent: 'text-sky-700 dark:text-sky-400',
    },
    {
      id: 'next-birthdays',
      label: 'Birthdays next month',
      value: nextMonthBirthdays,
      hint: nextLabel,
      icon: <PartyPopper className="h-4 w-4" />,
      accent: 'text-violet-700 dark:text-violet-400',
    },
  ]

  return (
    <div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      data-testid="calendar-summary-cards"
    >
      {cards.map(card => (
        <div
          key={card.id}
          data-testid={`calendar-summary-${card.id}`}
          className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className={cn('mt-1 text-2xl font-semibold tabular-nums', card.accent)}>
                {loading ? '—' : card.value}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{card.hint}</p>
            </div>
            <span className={cn('rounded-md bg-muted/60 p-2', card.accent)}>{card.icon}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
