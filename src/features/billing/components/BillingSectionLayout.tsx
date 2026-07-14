import * as React from 'react'
import { BookOpen, PoundSterling } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { BillingGuidanceDialog } from '@/features/billing/components/BillingGuidanceDialog'

type Props = {
  title: string
  description: string
  testId: string
  children: React.ReactNode
}

export function BillingSectionLayout({ title, description, testId, children }: Props) {
  const [guidanceOpen, setGuidanceOpen] = React.useState(false)

  return (
    <div
      className="flex h-[calc(100dvh-3.5rem-2.5rem)] flex-col gap-4 overflow-hidden md:h-[calc(100dvh-3.5rem-3rem)]"
      data-testid={testId}
    >
      <PageHeader
        className="shrink-0"
        title={title}
        description={description}
        icon={<PoundSterling className="h-4 w-4 text-muted-foreground" aria-hidden />}
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

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        {children}
      </div>
    </div>
  )
}
