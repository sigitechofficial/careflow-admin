import type { KeyboardEvent, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { HOLISTIC_HEADER_CLASS, HOLISTIC_SUBHEADER_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'

type Props = {
  title: string
  subtitle?: string
  children?: ReactNode
  className?: string
  /** When set with onOpenChange, shows a trailing collapse control. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  controlsId?: string
}

function HolisticSectionCollapseButton({
  open,
  onOpenChange,
  controlsId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  controlsId?: string
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
        'text-sky-950/80 hover:bg-sky-200/60 hover:text-sky-950',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40',
        'dark:text-sky-100/90 dark:hover:bg-sky-900/50 dark:hover:text-sky-50',
      )}
      aria-expanded={open}
      aria-controls={controlsId}
      aria-label={open ? 'Collapse section' : 'Expand section'}
      onClick={(e) => {
        e.stopPropagation()
        onOpenChange(!open)
      }}
    >
      <ChevronDown
        className={cn('h-4 w-4 transition-transform duration-200', open ? 'rotate-0' : '-rotate-90')}
        aria-hidden
      />
    </button>
  )
}

export function HolisticSectionHeader({
  title,
  subtitle,
  children,
  className,
  open,
  onOpenChange,
  controlsId,
}: Props) {
  const collapsible = typeof open === 'boolean' && typeof onOpenChange === 'function'

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!collapsible) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpenChange!(!open)
    }
  }

  return (
    <header
      className={cn(HOLISTIC_HEADER_CLASS, collapsible && 'cursor-pointer select-none', className)}
      role={collapsible ? 'button' : undefined}
      tabIndex={collapsible ? 0 : undefined}
      aria-expanded={collapsible ? open : undefined}
      aria-controls={collapsible ? controlsId : undefined}
      onClick={collapsible ? () => onOpenChange!(!open) : undefined}
      onKeyDown={collapsible ? onKeyDown : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold tracking-wide text-sky-950 dark:text-sky-100">{title}</h3>
          {subtitle ? <p className={HOLISTIC_SUBHEADER_CLASS}>{subtitle}</p> : null}
          {children}
        </div>
        {collapsible ? (
          <HolisticSectionCollapseButton open={open!} onOpenChange={onOpenChange!} controlsId={controlsId} />
        ) : null}
      </div>
    </header>
  )
}
