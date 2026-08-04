import * as React from 'react'
import { ArrowRight, Info } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hoverable?: boolean
    bordered?: boolean
  }
>(({ className, hoverable, bordered = true, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg bg-card text-card-foreground',
      bordered && 'border border-border',
      'shadow-card-sm',
      hoverable && 'transition-shadow duration-200 hover:shadow-card cursor-pointer',
      className
    )}
    {...props}
  />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-5 pb-4', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'font-display text-base font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center p-5 pt-0',
      className
    )}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

/* ─── Stat Card (icon left · text right) ─────────────────────────────────── */

export const STAT_CARD_TONES = {
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
} as const

export type StatCardTone = keyof typeof STAT_CARD_TONES

export interface StatCardProps {
  /** Primary label shown above the value. */
  label: string
  value: React.ReactNode
  /** Secondary line under the value (hint / subtitle). */
  hint?: string
  /** Alias for hint with optional colour (showcase / trend copy). */
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: React.ReactNode
  /** Preset icon chip colour. Ignored when `iconClassName` is set. */
  tone?: StatCardTone
  /** Custom classes for the icon chip (overrides `tone`). */
  iconClassName?: string
  /** @deprecated Prefer `tone` or `iconClassName`. Kept for showcase compatibility. */
  iconColor?: string
  /** Info tooltip next to the label (e.g. purpose). */
  tooltip?: string
  loading?: boolean
  muted?: boolean
  emphasize?: boolean
  /** When set, the card navigates on click. */
  to?: string
  search?: Record<string, unknown>
  showChevron?: boolean
  valueClassName?: string
  className?: string
  'data-testid'?: string
}

function StatCardHelpIcon({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`About ${label}`}
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="z-[110] max-w-sm text-left text-xs leading-snug">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function StatCard({
  label,
  value,
  hint,
  change,
  changeType = 'neutral',
  icon,
  tone = 'primary',
  iconClassName,
  iconColor,
  tooltip,
  loading,
  muted,
  emphasize,
  to,
  search,
  showChevron,
  valueClassName,
  className,
  'data-testid': testId,
}: StatCardProps) {
  const subtitle = hint ?? change
  const chipClass =
    iconClassName ?? iconColor ?? STAT_CARD_TONES[tone] ?? STAT_CARD_TONES.primary

  const body = (
    <div className="flex items-start gap-3">
      {icon ? (
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            to && 'transition-transform group-hover:scale-105',
            chipClass,
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span className="truncate">{label}</span>
          {tooltip ? <StatCardHelpIcon label={label} tooltip={tooltip} /> : null}
        </p>
        <p
          className={cn(
            'text-2xl font-display font-bold tabular-nums tracking-tight text-foreground',
            valueClassName,
          )}
        >
          {loading ? '—' : value}
        </p>
        {subtitle ? (
          <p
            className={cn(
              'text-xs',
              change && !hint
                ? cn(
                    'font-medium',
                    changeType === 'positive' && 'text-success',
                    changeType === 'negative' && 'text-destructive',
                    changeType === 'neutral' && 'text-muted-foreground',
                  )
                : 'text-muted-foreground',
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {to && showChevron !== false ? (
        <ArrowRight
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      ) : null}
    </div>
  )

  const shellClass = cn(
    'rounded-xl border border-border bg-card p-4 shadow-sm',
    emphasize && 'border-primary/40 bg-primary/5',
    muted && 'opacity-70',
    to &&
      'group block transition-colors hover:border-primary/30 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    className,
  )

  if (to) {
    return (
      <Link to={to} search={search} className={shellClass} data-testid={testId}>
        {body}
      </Link>
    )
  }

  return (
    <div className={shellClass} data-testid={testId}>
      {body}
    </div>
  )
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatCard,
}
