import * as React from 'react'
import { ClipboardList } from 'lucide-react'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { cn } from '@/shared/lib/utils'

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

function colorFromLabel(label: string): string {
  const palette = [
    'bg-sky-500',
    'bg-teal-500',
    'bg-amber-500',
    'bg-violet-500',
    'bg-rose-500',
    'bg-emerald-500',
  ]
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h + label.charCodeAt(i) * 11) % palette.length
  return palette[h]!
}

/** Care pathway icon with fallback when `/uploads/...` file is missing. */
export function StandardIconImage({
  src,
  label,
  className,
  imgClassName,
}: {
  src: string | null | undefined
  label: string
  className?: string
  imgClassName?: string
}) {
  const [failed, setFailed] = React.useState(false)
  const resolved = resolveMediaUrl(src)

  React.useEffect(() => {
    setFailed(false)
  }, [resolved])

  if (!resolved || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md text-xs font-semibold text-white',
          colorFromLabel(label),
          className,
        )}
        title={label}
      >
        {initialsFromLabel(label)}
      </div>
    )
  }

  return (
    <img
      src={resolved}
      alt={label}
      className={cn('object-contain', imgClassName, className)}
      onError={() => setFailed(true)}
    />
  )
}

export function StandardIconPlaceholder({
  label,
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md bg-muted text-muted-foreground',
        className,
      )}
      title={label}
    >
      <ClipboardList className="h-6 w-6" strokeWidth={1.25} />
    </div>
  )
}
