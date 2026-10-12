import { cn } from '@/shared/lib/utils'

/** Marks a PRN dose given inside the minimum gap or over the 24-hour maximum. */
export function PrnOverLimitBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100',
        className,
      )}
      title="PRN dose given outside the limits set on this medicine"
    >
      Over PRN limit
    </span>
  )
}
