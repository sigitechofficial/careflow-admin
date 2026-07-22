import * as React from 'react'
import { BookOpen, Landmark } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { PAYROLL_PATHS } from '@/features/payroll/payroll-routes'

type Props = {
  title: string
  description: string
  testId: string
  children: React.ReactNode
}

export function PayrollSectionLayout({ title, description, testId, children }: Props) {
  const [guidanceOpen, setGuidanceOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-4" data-testid={testId}>
      <PageHeader
        className="shrink-0"
        title={title}
        description={description}
        icon={<Landmark className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'UK Payroll', href: PAYROLL_PATHS.overview },
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

      <Dialog open={guidanceOpen} onOpenChange={setGuidanceOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>UK Payroll — Phase 1</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3 text-sm text-muted-foreground">
            <p>
              This module is the foundation for native UK PAYE payroll. It is separate from Billing
              visit-pay runs under{' '}
              <span className="font-medium text-foreground">Billing → Payroll runs</span>.
            </p>
            <p>
              Phase 1 covers tax years, pay schedules, periods, employee payroll setup,
              effective-dated pay agreements, and a payroll-run shell. It does not calculate Income
              Tax, National Insurance, pensions, or submit FPS/EPS to HMRC.
            </p>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        {children}
      </div>
    </div>
  )
}
