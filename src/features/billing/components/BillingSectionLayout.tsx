import * as React from 'react'
import { BookOpen, PoundSterling } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { BillingGuidanceDialog } from '@/features/billing/components/BillingGuidanceDialog'

type Props = {
  title: string
  description: string
  testId: string
  children: React.ReactNode
  /** Optional header icon; defaults to PoundSterling in a tinted well. */
  icon?: React.ReactNode
}

export function BillingSectionLayout({ title, description, testId, children, icon }: Props) {
  const [guidanceOpen, setGuidanceOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-4" data-testid={testId}>
      <PageHeader
        className="shrink-0"
        title={title}
        description={description}
        icon={
          icon ?? (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PoundSterling className="h-4 w-4" aria-hidden />
            </span>
          )
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Billing', href: '/billing' },
          { label: title },
        ]}
        actions={[
          {
            label: 'Guidance',
            icon: <BookOpen className="h-4 w-4" />,
            variant: 'outline',
            onClick: () => setGuidanceOpen(true),
          },
        ]}
      />

      <BillingGuidanceDialog open={guidanceOpen} onOpenChange={setGuidanceOpen} />

      <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        {children}
      </div>
    </div>
  )
}
