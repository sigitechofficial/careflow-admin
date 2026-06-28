import * as React from 'react'
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
}: ContentSectionHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {kicker ? (
          <p className={cn(contentKickerClass, kickerClassName)}>{kicker}</p>
        ) : null}
        <TitleTag className={cn(contentTitleClass, titleClassName)}>{title}</TitleTag>
        {description ? (
          <p className={cn('mt-1 max-w-2xl', contentBodyClass, descriptionClassName)}>{description}</p>
        ) : null}
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
