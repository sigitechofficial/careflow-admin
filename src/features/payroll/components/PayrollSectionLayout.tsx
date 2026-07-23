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
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Landmark className="h-4 w-4" aria-hidden />
          </span>
        }
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
            <DialogTitle>UK Payroll guidance</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3 text-sm text-muted-foreground">
            <p>
              Native UK payroll is separate from{' '}
              <span className="font-medium text-foreground">Billing → Visit pay runs</span>. Visit
              pay feeds gross; this module calculates PAYE Income Tax and employee Class 1 NI.
            </p>
            <p>
              Typical flow: tax years → schedules & periods → employee setup (tax code + NI) → UK
              payroll run → Calculate gross → Calculate tax & NI → Close.
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
