import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  contentBodyClass,
  contentKickerClass,
  contentTitleClass,
} from '@/shared/ui/content-typography'

export type ContentSectionHeaderProps = {
  kicker?: React.ReactNode
  kickerClassName?: string
  title: React.ReactNode
  titleAs?: 'h1' | 'h2' | 'h3' | 'h4'
  titleClassName?: string
  description?: React.ReactNode
  descriptionClassName?: string
  action?: React.ReactNode
  className?: string
  /** Optional leading icon (tinted well). */
  icon?: React.ReactNode
  iconClassName?: string
}

/** Standard card shell for module pages (visit plan, employee management, etc.). */
export function ContentCard({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'section'>) {
  return (
    <section
      className={cn('rounded-xl border border-border bg-card p-6 shadow-sm', className)}
      {...props}
    />
  )
}

/**
 * Collapsible card shell: same look as ContentCard but as a native <details>
 * accordion with an icon/title/description header. Collapsed by default.
 * `id` / `data-testid` and other <details> props pass through to the outer element.
 */
export function CollapsibleCard({
  className,
  bodyClassName,
  defaultOpen = false,
  icon,
  iconClassName,
  title,
  description,
  children,
  ...rest
}: {
  className?: string
  bodyClassName?: string
  defaultOpen?: boolean
  icon?: React.ReactNode
  iconClassName?: string
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'details'>, 'title'>) {
  return (
    <details
      className={cn('group rounded-xl border border-border bg-card shadow-sm', className)}
      {...(defaultOpen ? { open: true } : {})}
      {...rest}
    >
      <summary className="flex cursor-pointer select-none list-none items-center gap-3 p-6 [&::-webkit-details-marker]:hidden">
        {icon ? (
          <span
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              iconClassName,
            )}
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 pt-0.5">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {description ? (
            <span className="block text-xs text-muted-foreground">{description}</span>
          ) : null}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className={cn('px-6 pb-6', bodyClassName ?? 'space-y-4')}>{children}</div>
    </details>
  )
}

export function ContentSectionHeader({
  kicker,
  kickerClassName,
  title,
  titleAs: TitleTag = 'h2',
  titleClassName,
  description,
  descriptionClassName,
  action,
  className,
  icon,
  iconClassName,
}: ContentSectionHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 gap-3">
        {icon ? (
          <div
            className={cn(
              'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary',
              iconClassName,
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          {kicker ? (
            <p className={cn(contentKickerClass, kickerClassName)}>{kicker}</p>
          ) : null}
          <TitleTag className={cn(contentTitleClass, titleClassName)}>{title}</TitleTag>
          {description ? (
            <p className={cn('mt-1 max-w-2xl', contentBodyClass, descriptionClassName)}>{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export {
  contentAlertClass,
  contentAlertHeadingClass,
  contentBadgeClass,
  contentBodyClass,
  contentEmphasisClass,
  contentHelperClass,
  contentHelperErrorClass,
  contentKickerClass,
  contentOverlineClass,
  contentSummaryClass,
  contentTableRowLabelClass,
  contentTagClass,
  contentTitleClass,
  contentTitleDisplayClass,
} from '@/shared/ui/content-typography'
