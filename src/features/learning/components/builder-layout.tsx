import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

/** Builder tab layout (design reference 13 Nov 2026): main work area + summary sidebar. Stacks on small screens. */
export function TwoColumn({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-5">{main}</div>
      <aside className="min-w-0 space-y-4">{side}</aside>
    </div>
  )
}

/** A bordered card with a title row. */
export function Panel({
  title,
  description,
  icon,
  actions,
  children,
  className,
  testId,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
  testId?: string
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-card p-4 sm:p-5', className)} data-testid={testId}>
      <div className="mb-4 flex flex-wrap items-start gap-3">
        {icon ? <span className="mt-0.5 text-muted-foreground">{icon}</span> : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">{title}</h3>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

/** Sidebar card; optionally collapsible. */
export function SideCard({
  title,
  icon,
  children,
  collapsible,
  defaultOpen = true,
  badge,
  testId,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  badge?: React.ReactNode
  testId?: string
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const header = (
    <span className="flex w-full items-center gap-2">
      {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      <span className="text-sm font-semibold">{title}</span>
      {badge ? <span className="ml-auto">{badge}</span> : null}
      {collapsible ? (
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', badge ? '' : 'ml-auto', open && 'rotate-180')} aria-hidden />
      ) : null}
    </span>
  )
  return (
    <section className="rounded-xl border border-border bg-card p-4" data-testid={testId}>
      {collapsible ? (
        <button type="button" className="w-full text-left" aria-expanded={open} onClick={() => setOpen(v => !v)}>
          {header}
        </button>
      ) : (
        header
      )}
      {!collapsible || open ? <div className="mt-3">{children}</div> : null}
    </section>
  )
}

/** "Label ........ value" line used in summary cards. */
export function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 text-sm">
      {icon ? <span className="shrink-0 text-muted-foreground">{icon}</span> : null}
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto text-right font-medium">{value}</span>
    </div>
  )
}

/** Small stat box: big number + label. */
export function StatBox({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <span className="text-primary">{icon}</span>
      <span>
        <span className="block text-lg font-semibold leading-none">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  )
}

/** Tick / cross / dash line for checklists. */
export function CheckLine({
  state,
  children,
  hint,
}: {
  state: 'on' | 'off' | 'warn' | 'error'
  children: React.ReactNode
  hint?: React.ReactNode
}) {
  const dot =
    state === 'on'
      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
      : state === 'warn'
        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
        : state === 'error'
          ? 'bg-destructive/15 text-destructive'
          : 'bg-muted text-muted-foreground'
  const mark = state === 'on' ? '✓' : state === 'warn' ? '!' : state === 'error' ? '✕' : '–'
  return (
    <div className="flex items-start gap-2.5 py-1.5 text-sm">
      <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold', dot)} aria-hidden>
        {mark}
      </span>
      <span className="min-w-0">
        <span className={state === 'off' ? 'text-muted-foreground' : ''}>{children}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </div>
  )
}
