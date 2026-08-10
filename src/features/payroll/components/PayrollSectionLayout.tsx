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
import type { PayrollPageGuidance } from '@/features/payroll/data/payroll-section-guidance'

type Props = {
  title: string
  description: string
  testId: string
  children: React.ReactNode
  /** When set, Guidance button shows this page’s purpose + flow instead of the generic blurb. */
  guidance?: PayrollPageGuidance
}

const DEFAULT_GUIDANCE: PayrollPageGuidance = {
  title: 'UK Payroll',
  purpose:
    'Native UK payroll is separate from Billing → Visit pay runs. Visit pay feeds gross; this module calculates PAYE Income Tax and employee Class 1 NI.',
  flow: [
    'Set tax years.',
    'Create schedules & pay periods.',
    'Complete employee payroll setup (tax code + NI + hours band).',
    'Open a UK payroll run → Calculate gross → Calculate tax & NI → Close.',
    'Send FPS from the closed run; use Employer PAYE for EPS and Gateway logins.',
  ],
}

export function PayrollSectionLayout({
  title,
  description,
  testId,
  children,
  guidance,
}: Props) {
  const [guidanceOpen, setGuidanceOpen] = React.useState(false)
  const g = guidance ?? DEFAULT_GUIDANCE

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
            <DialogTitle>{g.title} — guidance</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4 text-sm text-muted-foreground">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Purpose of this page
              </p>
              <p className="leading-relaxed">{g.purpose}</p>
            </div>

            {g.flow && g.flow.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Complete flow
                </p>
                <ol className="list-decimal space-y-2 pl-5 leading-relaxed">
                  {g.flow.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            {g.tips && g.tips.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Tips
                </p>
                <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
                  {g.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        {children}
      </div>
    </div>
  )
}
