import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { MODULE_ILLUSTRATION, PAGE_ILLUSTRATION, illustrationSrc } from '@/components/layout/nav-illustrations'

/**
 * Colourful illustration for a menu entry. Decorative (the label is always shown next to it),
 * so it is hidden from screen readers. Falls back to the line icon if there is no illustration
 * for the label or the file fails to load.
 */
function Illustration({
  name,
  fallback,
  className,
}: {
  name: string | undefined
  fallback?: React.ReactNode
  className?: string
}) {
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => setFailed(false), [name])
  if (!name || failed) return <>{fallback ?? null}</>
  return (
    <img
      src={illustrationSrc(name)}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('shrink-0 select-none object-contain', className)}
    />
  )
}

export function ModuleIllustration({
  label,
  fallback,
  className,
}: {
  label: string
  fallback?: React.ReactNode
  className?: string
}) {
  return <Illustration name={MODULE_ILLUSTRATION[label]} fallback={fallback} className={className} />
}

export function PageIllustration({
  label,
  fallback,
  className,
}: {
  label: string
  fallback?: React.ReactNode
  className?: string
}) {
  return <Illustration name={PAGE_ILLUSTRATION[label]} fallback={fallback} className={className} />
}
