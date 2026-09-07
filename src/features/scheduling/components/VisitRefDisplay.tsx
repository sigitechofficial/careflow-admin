import { cn } from '@/shared/lib/utils'

const REF_TITLE =
  'Visit reference (EMONITORED): VIS-[BRANCH]-[YYYYMMDD]-[NNNN] — same as visit reconciliation'

const ID_TITLE = 'Scheduled visit system ID'

type Props = {
  visitRef?: string | null
  /** Scheduled visit UUID (internal Visit ID). */
  visitId?: string | null
  className?: string
  /** When true, always reserve EMONITORED row (shows — if missing). */
  showEmpty?: boolean
  size?: 'sm' | 'md'
}

/** EMONITORED visit reference + optional Visit ID for schedule workspace. */
export function VisitRefDisplay({
  visitRef,
  visitId,
  className,
  showEmpty = false,
  size = 'sm',
}: Props) {
  const ref = visitRef?.trim() || null
  const id = visitId?.trim() || null
  if (!ref && !id && !showEmpty) return null

  const labelClass = cn(
    'shrink-0 font-medium uppercase tracking-wide text-muted-foreground',
    size === 'md' ? 'text-xs' : 'text-[11px]',
  )
  const valueClass = cn(
    'min-w-0 break-all font-mono font-semibold tracking-tight text-foreground',
    size === 'md' ? 'text-sm' : 'text-xs',
  )

  return (
    <div className={cn('space-y-1', className)}>
      {(ref || showEmpty) && (
        <div
          className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5"
          title={REF_TITLE}
        >
          <span className={labelClass}>EMONITORED</span>
          {ref ? (
            <span className={valueClass}>{ref}</span>
          ) : (
            <span className="text-xs text-muted-foreground" title="Not allocated yet">
              —
            </span>
          )}
        </div>
      )}
      {id ? (
        <div
          className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5"
          title={ID_TITLE}
        >
          <span className={labelClass}>Visit ID</span>
          <span className={cn(valueClass, 'font-medium')}>{id}</span>
        </div>
      ) : null}
    </div>
  )
}
