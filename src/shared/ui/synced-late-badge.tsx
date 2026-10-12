import { cn } from '@/shared/lib/utils'

/**
 * Marks a clock-in/out whose time came from the carer's phone because it reached the
 * server late. `receivedLabel` is when the server got it.
 */
export function SyncedLateBadge({
  receivedLabel,
  className,
}: {
  receivedLabel?: string | null
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100',
        className,
      )}
      title="The time shown is from the carer's phone. The server received it later."
    >
      Synced late{receivedLabel ? ` · ${receivedLabel}` : ''}
    </span>
  )
}
