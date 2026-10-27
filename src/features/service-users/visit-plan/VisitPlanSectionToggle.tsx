import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

const STORAGE_KEY = 'visit-plan-sections-open'

function readSaved(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

/** Open/closed state of one visit plan page section, remembered in this browser. */
export function useVisitPlanSectionOpen(key: string, defaultOpen = true) {
  const [open, setOpen] = React.useState<boolean>(() => readSaved()[key] ?? defaultOpen)
  const toggle = React.useCallback(() => {
    setOpen(prev => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSaved(), [key]: next }))
      } catch {
        // Storage blocked: the section still opens and closes, it just isn't remembered.
      }
      return next
    })
  }, [key])
  return [open, toggle] as const
}

/** Chevron button that opens or closes a section. */
export function VisitPlanSectionToggle({
  open,
  onToggle,
  label,
}: {
  open: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`${open ? 'Hide' : 'Show'} ${label}`}
      title={open ? 'Hide' : 'Show'}
    >
      <ChevronDown className={cn('h-4 w-4 transition-transform', open ? 'rotate-180' : '')} aria-hidden />
    </Button>
  )
}
