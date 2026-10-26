import * as React from 'react'
import { ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { PageIllustration } from '@/components/layout/NavIllustration'

type Props = {
  title: string
  description: string
  testId: string
  breadcrumbTail?: { label: string; href?: string }[]
  actions?: React.ComponentProps<typeof PageHeader>['actions']
  children: React.ReactNode
}

export function SafeguardingSectionLayout({
  title,
  description,
  testId,
  breadcrumbTail,
  actions,
  children,
}: Props) {
  return (
    <div className="flex flex-col gap-4" data-testid={testId}>
      <PageHeader
        className="shrink-0"
        title={title}
        description={description}
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-primary">
            <PageIllustration
              label="Safeguarding cases"
              className="h-6 w-6"
              fallback={<ShieldAlert className="h-4 w-4" aria-hidden />}
            />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Safeguarding', href: '/safeguarding' },
          ...(breadcrumbTail ?? [{ label: title }]),
        ]}
        actions={actions}
      />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
