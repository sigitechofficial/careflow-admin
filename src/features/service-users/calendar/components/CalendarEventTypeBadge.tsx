import { cn } from '@/shared/lib/utils'

export function CalendarEventTypeBadge({
  name,
  color,
}: {
  name: string
  color?: string | null
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        !color && 'bg-muted text-muted-foreground',
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
