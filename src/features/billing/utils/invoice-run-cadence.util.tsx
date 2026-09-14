import { cn } from '@/shared/lib/utils'

/** Derive the run cadence from its span (≈7 days = Weekly, ≈a month = Monthly, else Custom). */
export function periodCadence(
  startIso: string,
  endIso: string,
): {
  label: string
  tone: 'weekly' | 'monthly' | 'custom'
} {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return { label: 'Custom', tone: 'custom' }
  const days = Math.round((end - start) / 86_400_000) + 1
  if (days >= 6 && days <= 8) return { label: 'Weekly', tone: 'weekly' }
  if (days >= 28 && days <= 31) return { label: 'Monthly', tone: 'monthly' }
  return { label: `${days} days`, tone: 'custom' }
}

export function InvoiceRunCadenceBadge({
  startIso,
  endIso,
}: {
  startIso: string
  endIso: string
}) {
  const { label, tone } = periodCadence(startIso, endIso)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tone === 'weekly' && 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
        tone === 'monthly' &&
          'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200',
        tone === 'custom' && 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  )
}
