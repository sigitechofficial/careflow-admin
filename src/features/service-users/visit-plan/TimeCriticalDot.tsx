import { cn } from '@/shared/lib/utils'

export function timeCriticalLabel(toleranceMinutes: number): string {
  return `Time critical · ±${toleranceMinutes} min tolerance`
}

type Props = {
  toleranceMinutes?: number
  className?: string
  size?: 'xs' | 'sm'
  /** Pin to top-right of a relatively positioned parent. */
  position?: 'inline' | 'corner'
}

export function TimeCriticalDot({
  toleranceMinutes = 30,
  className,
  size = 'sm',
  position = 'inline',
}: Props) {
  const title = timeCriticalLabel(toleranceMinutes)

  return (
    <span
      className={cn(
        'inline-block shrink-0 rounded-full bg-red-600 ring-2 ring-white dark:ring-slate-900',
        size === 'xs' ? 'h-1.5 w-1.5' : 'h-2 w-2',
        position === 'corner' && 'absolute right-1 top-1 z-[3]',
        className,
      )}
      title={title}
      aria-label={title}
    />
  )
}
