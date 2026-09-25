import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HOLISTIC_SECTION_BODY_CLASS,
  HOLISTIC_SECTION_SHELL_CLASS,
} from '@/features/service-users/initial-assessment/utils/holistic-form-typography'

type Props = {
  title: string
  subtitle?: string
  children: React.ReactNode
  testId?: string
  /** Defaults to open so existing flows stay visible. */
  defaultOpen?: boolean
  bodyClassName?: string
  headerClassName?: string
}

/**
 * Paper-style IA section shell with a trailing chevron to expand/collapse the body.
 */
export function HolisticCollapsibleSection({
  title,
  subtitle,
  children,
  testId,
  defaultOpen = true,
  bodyClassName,
  headerClassName,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [expanding, setExpanding] = React.useState(false)
  const panelId = React.useId()
  const expandTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (expandTimerRef.current != null) clearTimeout(expandTimerRef.current)
    }
  }, [])

  const onOpenChange = React.useCallback(
    (next: boolean) => {
      if (next === open) return
      if (expandTimerRef.current != null) {
        clearTimeout(expandTimerRef.current)
        expandTimerRef.current = null
      }

      if (next) {
        // Show loading on the header first so a heavy body reveal is not a silent freeze.
        setExpanding(true)
        expandTimerRef.current = setTimeout(() => {
          expandTimerRef.current = null
          setOpen(true)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setExpanding(false))
          })
        }, 40)
        return
      }

      setExpanding(false)
      setOpen(false)
    },
    [open],
  )

  return (
    <section className={HOLISTIC_SECTION_SHELL_CLASS} data-testid={testId} aria-busy={expanding || undefined}>
      <HolisticSectionHeader
        title={title}
        subtitle={open ? subtitle : undefined}
        className={headerClassName}
        open={open}
        onOpenChange={onOpenChange}
        controlsId={panelId}
      >
        {expanding ? (
          <span
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-sky-900/80 dark:text-sky-100/80"
            data-testid={testId ? `${testId}-expanding` : undefined}
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Loading…
          </span>
        ) : null}
      </HolisticSectionHeader>
      <div
        id={panelId}
        role="region"
        hidden={!open}
        className={cn(HOLISTIC_SECTION_BODY_CLASS, bodyClassName, !open && 'hidden')}
      >
        {children}
      </div>
    </section>
  )
}
