import { cn } from '@/shared/lib/utils'
import { administrationStatusToDisplayCode } from '@/features/service-users/medication/mar-status-utils'

export function MedicationStatusBadge({
  code,
  label,
  color,
  textColor,
  status,
  className,
}: {
  code?: string | null
  label?: string | null
  color?: string | null
  textColor?: string | null
  status?: string
  className?: string
}) {
  const displayCode =
    code ?? (status ? administrationStatusToDisplayCode(status) : '—')
  const title = label ?? (status ? status.replace(/_/g, ' ') : displayCode)

  return (
    <span
      className={cn(
        'inline-flex min-w-[1.75rem] items-center justify-center rounded px-1.5 py-0.5 text-xs font-bold tabular-nums',
        !color && 'border border-border bg-muted text-foreground',
        className,
      )}
      style={
        color
          ? { backgroundColor: color, color: textColor ?? '#fff' }
          : undefined
      }
      title={title}
    >
      {displayCode}
    </span>
  )
}
