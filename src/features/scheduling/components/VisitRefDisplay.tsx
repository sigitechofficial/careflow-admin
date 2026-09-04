import { cn } from '@/shared/lib/utils'

const TITLE =
  'Visit reference (EMONITORED): VIS-[BRANCH]-[YYYYMMDD]-[NNNN] — same as visit reconciliation'

type Props = {
  visitRef?: string | null
  className?: string
  /** When true, always reserve a row (shows — if missing). */
  showEmpty?: boolean
  size?: 'sm' | 'md'
}

/** Shared EMONITORED visit reference chip (matches billing visit reconciliation). */
export function VisitRefDisplay({
  visitRef,
  className,
  showEmpty = false,
  size = 'sm',
}: Props) {
  const ref = visitRef?.trim() || null
  if (!ref && !showEmpty) return null

  return (
    <div
      className={cn(
        'inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5',
        className,
      )}
      title={TITLE}
    >
      <span
        className={cn(
          'shrink-0 font-medium uppercase tracking-wide text-muted-foreground',
          size === 'md' ? 'text-xs' : 'text-[11px]',
        )}
      >
        EMONITORED
      </span>
      {ref ? (
        <span
          className={cn(
            'min-w-0 break-all font-mono font-semibold tracking-tight text-foreground',
            size === 'md' ? 'text-sm' : 'text-xs',
          )}
        >
          {ref}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground" title="Not synced to visit reconciliation yet">
          —
        </span>
      )}
    </div>
  )
}
