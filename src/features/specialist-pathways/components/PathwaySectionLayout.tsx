import * as React from 'react'
import { HeartHandshake } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { SPECIALIST_PATHWAY_PATHS } from '@/features/specialist-pathways/specialist-pathways-routes'

type Props = {
  title: string
  description: string
  testId: string
  breadcrumbTail?: { label: string; href?: string }[]
  actions?: React.ComponentProps<typeof PageHeader>['actions']
  children: React.ReactNode
}

export function PathwaySectionLayout({
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
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HeartHandshake className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Specialist Pathways', href: SPECIALIST_PATHWAY_PATHS.landing },
          ...(breadcrumbTail ?? [{ label: title }]),
        ]}
        actions={actions}
      />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
