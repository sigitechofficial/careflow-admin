import { cn } from '@/lib/utils'

/** 40×40 Figma action button (includes its own circle + colour). */
export function FigmaActionIcon({
  src,
  title,
  className,
}: {
  src: string
  title: string
  className?: string
}) {
  return (
    <img
      src={src}
      alt=""
      title={title}
      className={cn('block h-10 w-10 shrink-0 object-contain', className)}
      draggable={false}
    />
  )
}
