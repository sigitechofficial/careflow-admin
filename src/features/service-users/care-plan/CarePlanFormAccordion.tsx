import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export function CarePlanFormAccordion({
  title,
  defaultOpen = false,
  children,
  className,
}: {
  title: string
  defaultOpen?: boolean
  children?: React.ReactNode
  className?: string
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        'group overflow-hidden rounded-sm border border-border/80 bg-card shadow-sm',
        className,
      )}
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-2 bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground',
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
        <span>{title}</span>
      </summary>
      {children ? (
        <div className="border-t border-[#c5cdd6] bg-white p-4 dark:bg-card sm:p-5">{children}</div>
      ) : null}
    </details>
  )
}
