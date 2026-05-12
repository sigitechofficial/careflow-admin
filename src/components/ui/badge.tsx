import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary/10 text-primary border border-primary/20',
        secondary:
          'bg-secondary text-secondary-foreground border border-border',
        outline:
          'border border-border text-foreground bg-transparent',
        destructive:
          'bg-destructive/10 text-destructive border border-destructive/20',
        success:
          'bg-success/10 text-success border border-success/20',
        warning:
          'bg-warning/10 text-warning border border-warning/20',
        info:
          'bg-info/10 text-info border border-info/20',
        solid:
          'bg-primary text-primary-foreground border border-transparent',
        'solid-destructive':
          'bg-destructive text-destructive-foreground border border-transparent',
        'solid-success':
          'bg-success text-success-foreground border border-transparent',
        'solid-warning':
          'bg-warning text-warning-foreground border border-transparent',
        'solid-info':
          'bg-info text-info-foreground border border-transparent',
        muted:
          'bg-muted text-muted-foreground border border-transparent',
      },
      size: {
        sm: 'px-1.5 py-0 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'inline-block w-1.5 h-1.5 rounded-full shrink-0',
            variant === 'destructive' || variant === 'solid-destructive'
              ? 'bg-destructive'
              : variant === 'success' || variant === 'solid-success'
              ? 'bg-success'
              : variant === 'warning' || variant === 'solid-warning'
              ? 'bg-warning'
              : variant === 'info' || variant === 'solid-info'
              ? 'bg-info'
              : 'bg-primary'
          )}
        />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
