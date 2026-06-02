import { cn } from '@/shared/lib/utils'

export function NotificationBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        'inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
