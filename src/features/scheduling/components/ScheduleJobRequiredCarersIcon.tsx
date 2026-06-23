import { Users, Users2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type Props = {
  requiredCarers: number
  className?: string
  badgeClassName?: string
}

/** Double-up (2) vs triple-up (3+) indicator for rota visit blocks. */
export function ScheduleJobRequiredCarersIcon({
  requiredCarers,
  className,
  badgeClassName,
}: Props) {
  if (requiredCarers <= 1) return null

  const iconClass = cn('shrink-0 opacity-90', className)

  if (requiredCarers === 2) {
    return (
      <span title="Double up (2 carers)">
        <Users2
          className={iconClass}
          aria-label="Double up — 2 carers required"
        />
      </span>
    )
  }

  const label = requiredCarers >= 4 ? '4+' : String(requiredCarers)

  return (
    <span
      className="inline-flex shrink-0 items-center gap-0.5"
      title={`${requiredCarers} carers required`}
      aria-label={`Triple up — ${requiredCarers} carers required`}
    >
      <Users className={iconClass} aria-hidden />
      <span
        className={cn(
          'rounded bg-slate-800/90 px-0.5 text-[8px] font-bold tabular-nums leading-none text-white',
          badgeClassName,
        )}
      >
        {label}
      </span>
    </span>
  )
}