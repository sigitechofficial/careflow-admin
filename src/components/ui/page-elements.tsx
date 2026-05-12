import * as React from 'react'
import { Filter, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from './button'

/* ─── PageHeader ─────────────────────────────────────────── */
interface PageAction {
  label: string
  onClick?: () => void
  icon?: React.ReactNode
  variant?: ButtonProps['variant']
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: PageAction[]
  breadcrumb?: { label: string; href?: string }[]
  /** Shown before the title; defaults to a filter icon (matches schedule-style page headers). */
  icon?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

function PageHeader({ title, description, actions, breadcrumb, icon, children, className }: PageHeaderProps) {
  const leadingIcon = icon ?? <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />

  return (
    <div className={cn('rounded-xl border border-border bg-card shadow-sm', className)}>
      <div className="space-y-3 p-5">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
            {breadcrumb.map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-muted-foreground/70">/</span>}
                {item.href ? (
                  <a href={item.href} className="hover:text-foreground transition-colors">
                    {item.label}
                  </a>
                ) : (
                  <span className={i === breadcrumb.length - 1 ? 'font-medium text-foreground' : ''}>
                    {item.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <h1 className="flex items-center gap-2 text-sm font-semibold text-foreground tracking-tight">
              <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{leadingIcon}</span>
              <span className="truncate">{title}</span>
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {(actions || children) && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {actions?.map((action, i) => (
                <Button
                  key={i}
                  variant={action.variant ?? (i === actions.length - 1 ? 'default' : 'outline')}
                  size="sm"
                  leftIcon={action.icon}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── EmptyState ─────────────────────────────────────────── */
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick?: () => void
    icon?: React.ReactNode
  }
  className?: string
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-display font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {action && (
        <Button className="mt-4" size="sm" leftIcon={action.icon} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

/* ─── Loading Spinner ────────────────────────────────────── */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

function LoadingSpinner({ size = 'md', label, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  )
}

/* ─── Section ────────────────────────────────────────────── */
interface SectionProps {
  title?: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

function Section({ title, description, action, children, className }: SectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-sm font-display font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

/* ─── Inline Status Indicator ────────────────────────────── */
type StatusVariant = 'active' | 'inactive' | 'pending' | 'warning' | 'error'

interface StatusIndicatorProps {
  status: StatusVariant
  label?: string
  className?: string
}

const statusConfig: Record<StatusVariant, { color: string; label: string }> = {
  active: { color: 'bg-success', label: 'Active' },
  inactive: { color: 'bg-muted-foreground', label: 'Inactive' },
  pending: { color: 'bg-warning', label: 'Pending' },
  warning: { color: 'bg-warning animate-pulse', label: 'Warning' },
  error: { color: 'bg-destructive', label: 'Error' },
}

function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const config = statusConfig[status]
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', config.color)} />
      <span className="text-xs text-muted-foreground">{label ?? config.label}</span>
    </div>
  )
}

export { PageHeader, EmptyState, LoadingSpinner, Section, StatusIndicator }
