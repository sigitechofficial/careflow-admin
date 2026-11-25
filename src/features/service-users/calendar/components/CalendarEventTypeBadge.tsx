import { cn } from '@/shared/lib/utils'

export function CalendarEventTypeBadge({
  name,
  color,
  className,
}: {
  name: string
  color?: string | null
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        !color && 'bg-muted text-muted-foreground',
        className,
      )}
      style={
        color
          ? { backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }
          : undefined
      }
    >
      {name}
    </span>
  )
}
