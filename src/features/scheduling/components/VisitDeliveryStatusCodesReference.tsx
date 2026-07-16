import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import {
  VISIT_DURATION_EXCEPTION_CATALOG,
  VISIT_LIFECYCLE_STATUS_CATALOG,
  VISIT_TIMING_STATUS_CATALOG,
} from '@/features/scheduling/utils/visit-delivery-assessment.util'
import { VISIT_TIMING_EXCEPTION_REASONS } from '@/features/scheduling/utils/visit-timing-exception-reason.util'

function timingBadgeClass(code: string): string {
  if (code === 'CRITICALLY_LATE') {
    return 'bg-destructive/10 text-destructive border-destructive/30'
  }
  if (code === 'LATE_START') {
    return 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200'
  }
  if (code === 'EARLY_ARRIVAL') {
    return 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200'
  }
  if (code === 'ON_TIME') {
    return 'bg-success/10 text-success border-success/20'
  }
  return 'bg-muted text-muted-foreground border-border'
}

function durationBadgeClass(code: string): string {
  if (
    code === 'ZERO_DURATION' ||
    code === 'NEGATIVE_OR_INVALID_DURATION' ||
    code === 'ABNORMALLY_LONG_OPEN'
  ) {
    return 'bg-destructive/10 text-destructive border-destructive/30'
  }
  if (code === 'PLANNED_SHORT_VISIT') {
    return 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200'
  }
  return 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200'
}

type ActiveFilter =
  | { kind: 'none' }
  | { kind: 'lifecycle'; code: string }
  | { kind: 'timing'; code: string }
  | { kind: 'duration'; code: string }

type Props = {
  defaultOpen?: boolean
  className?: string
  activeFilter?: ActiveFilter
  onSelectLifecycle?: (code: string) => void
  onSelectTiming?: (code: string) => void
  onSelectDuration?: (code: string) => void
  onClearFilter?: () => void
}

/**
 * Full catalogue of delivery codes. Badges are clickable filters when handlers are provided.
 */
export function VisitDeliveryStatusCodesReference({
  defaultOpen = false,
  className,
  activeFilter = { kind: 'none' },
  onSelectLifecycle,
  onSelectTiming,
  onSelectDuration,
  onClearFilter,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen)
  const clickable = Boolean(onSelectLifecycle || onSelectTiming || onSelectDuration)

  return (
    <section
      className={cn('rounded-xl border border-border bg-card', className)}
      data-testid="visit-delivery-status-codes-reference"
    >
      <Button
        type="button"
        variant="ghost"
        className="flex h-auto w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left hover:bg-muted/40"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">Visit status codes (verify)</p>
          <p className="text-xs font-normal text-muted-foreground">
            {clickable
              ? 'Click a code to filter the visit list. Sample visits cover every code.'
              : 'All lifecycle, timing, duration, and exception reason codes'}
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </Button>

      {open ? (
        <div className="space-y-5 border-t border-border px-4 py-4">
          {activeFilter.kind !== 'none' && onClearFilter ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Active filter:</span>
              <Badge variant="outline">
                {activeFilter.kind} · {activeFilter.code}
              </Badge>
              <Button type="button" size="sm" variant="ghost" onClick={onClearFilter}>
                Clear
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Lifecycle
            </p>
            <div className="flex flex-wrap gap-2">
              {VISIT_LIFECYCLE_STATUS_CATALOG.map((item) => {
                const active =
                  activeFilter.kind === 'lifecycle' && activeFilter.code === item.code
                return (
                  <button
                    key={item.code}
                    type="button"
                    className="flex flex-col gap-0.5 text-left"
                    onClick={() => onSelectLifecycle?.(item.code)}
                    disabled={!onSelectLifecycle}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        'w-fit font-medium',
                        onSelectLifecycle && 'cursor-pointer hover:bg-muted',
                        active && 'border-primary bg-primary/10',
                      )}
                    >
                      {item.label}
                    </Badge>
                    <code className="px-0.5 text-[10px] text-muted-foreground">{item.code}</code>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Timing / punctuality
            </p>
            <div className="flex flex-wrap gap-2">
              {VISIT_TIMING_STATUS_CATALOG.map((item) => {
                const active =
                  activeFilter.kind === 'timing' && activeFilter.code === item.code
                return (
                  <button
                    key={item.code}
                    type="button"
                    className="flex flex-col gap-0.5 text-left"
                    onClick={() => onSelectTiming?.(item.code)}
                    disabled={!onSelectTiming}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        'w-fit font-medium',
                        timingBadgeClass(item.code),
                        onSelectTiming && 'cursor-pointer hover:opacity-90',
                        active && 'ring-2 ring-primary/40',
                      )}
                    >
                      {item.label}
                    </Badge>
                    <code className="px-0.5 text-[10px] text-muted-foreground">{item.code}</code>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Duration exceptions
            </p>
            <div className="flex flex-wrap gap-2">
              {VISIT_DURATION_EXCEPTION_CATALOG.map((item) => {
                const active =
                  activeFilter.kind === 'duration' && activeFilter.code === item.code
                return (
                  <button
                    key={item.code}
                    type="button"
                    className="flex flex-col gap-0.5 text-left"
                    onClick={() => onSelectDuration?.(item.code)}
                    disabled={!onSelectDuration}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        'w-fit font-medium',
                        durationBadgeClass(item.code),
                        onSelectDuration && 'cursor-pointer hover:opacity-90',
                        active && 'ring-2 ring-primary/40',
                      )}
                    >
                      {item.label}
                    </Badge>
                    <code className="px-0.5 text-[10px] text-muted-foreground">{item.code}</code>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Timing exception reason codes
            </p>
            <div className="flex flex-wrap gap-2">
              {VISIT_TIMING_EXCEPTION_REASONS.map((item) => (
                <div key={item.code} className="flex max-w-[11rem] flex-col gap-0.5">
                  <Badge variant="secondary" className="w-fit font-medium">
                    {item.label}
                  </Badge>
                  <code className="px-0.5 text-[10px] text-muted-foreground">{item.code}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
