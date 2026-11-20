import { cn } from '@/shared/lib/utils'

const REF_TITLE =
  'Visit reference (EMONITORED): VIS-[BRANCH]-[YYYYMMDD]-[NNNN] — same as visit reconciliation'

type Props = {
  visitRef?: string | null
  /** Internal system ID: not shown (kept so callers need not change). */
  visitId?: string | null
  className?: string
  /** When true, always reserve EMONITORED row (shows — if missing). */
  showEmpty?: boolean
  size?: 'sm' | 'md'
}

/** The visit reference people use (VIS-CRO-20261117-0004). The internal system ID is never shown. */
export function VisitRefDisplay({
  visitRef,
  className,
  showEmpty = false,
  size = 'sm',
}: Props) {
  const ref = visitRef?.trim() || null
  if (!ref && !showEmpty) return null

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
          <span className={labelClass}>Visit ref</span>
          {ref ? (
            <span className={valueClass}>{ref}</span>
          ) : (
            <span className="text-xs text-muted-foreground" title="Not allocated yet">
              —
            </span>
          )}
        </div>
      )}
    </div>
  )
}
