import * as React from 'react'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { POLICY_PATHS } from '@/features/policies/policy-routes'

type Props = {
  title: string
  description: string
  testId: string
  actions?: React.ComponentProps<typeof PageHeader>['actions']
  children: React.ReactNode
}

export function PolicySectionLayout({ title, description, testId, actions, children }: Props) {
  return (
    <div className="flex flex-col gap-4" data-testid={testId}>
      <PageHeader
        className="shrink-0"
        title={title}
        description={description}
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Policies', href: POLICY_PATHS.library },
          { label: title },
        ]}
        actions={actions}
      />
      <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">{children}</div>
    </div>
  )
}
