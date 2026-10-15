import * as React from 'react'
import { Box, Info, Loader2, Zap } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import {
  healthMeta,
  runStatusMeta,
  triggerDescription,
  triggerLabel,
} from '@/features/system-jobs/lib/system-jobs-format'

/** Tooltip on any focusable trigger. Self-contained provider so pieces render standalone (tests, sheet). */
export function Hint({
  content,
  children,
  side = 'top',
}: {
  content: React.ReactNode
  children: React.ReactElement
  side?: 'top' | 'bottom' | 'left' | 'right'
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** Small "i" button that reveals an explanation on hover/focus. */
export function InfoHint({ label, content, className }: { label: string; content: React.ReactNode; className?: string }) {
  return (
    <Hint content={content}>
      <button
        type="button"
        className={cn(
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        aria-label={label}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
    </Hint>
  )
}

export function JobHealthBadge({
  health,
  withTooltip = true,
  className,
}: {
  health: string
  withTooltip?: boolean
  className?: string
}) {
  const meta = healthMeta(health)
  const badge = (
    <Badge
      variant={meta.variant}
      dot={meta.health !== 'running'}
      className={cn(meta.variant === 'muted' && 'border-border', className)}
      data-testid={`job-health-${meta.health}`}
    >
      {meta.health === 'running' ? (
        <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
      ) : null}
      {meta.label}
    </Badge>
  )
  if (!withTooltip) return badge
  return (
    <Hint content={meta.explanation}>
      <button
        type="button"
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Health: ${meta.label}. ${meta.explanation}`}
      >
        {badge}
      </button>
    </Hint>
  )
}

export function RunStatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const meta = runStatusMeta(status)
  return (
    <Badge variant={meta.variant} size={size} className={cn(meta.variant === 'muted' && 'border-border')}>
      {status === 'running' ? (
        <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
      ) : null}
      {meta.label}
    </Badge>
  )
}

export function TriggerBadge({ trigger, withTooltip = true }: { trigger: string; withTooltip?: boolean }) {
  const label = triggerLabel(trigger)
  const Icon = trigger === 'container-job' ? Box : Zap
  const badge = (
    <Badge variant="outline" className="gap-1 font-normal">
      <Icon className="h-3 w-3 text-muted-foreground" aria-hidden />
      {label}
    </Badge>
  )
  if (!withTooltip) return badge
  return (
    <Hint content={triggerDescription(trigger)}>
      <button
        type="button"
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Runs on ${label}. ${triggerDescription(trigger)}`}
      >
        {badge}
      </button>
    </Hint>
  )
}
