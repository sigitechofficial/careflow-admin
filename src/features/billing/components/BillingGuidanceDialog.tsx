import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleDot,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { billingPathForTab, isBillingSectionTab } from '@/features/billing/billing-routes'
import type { BillingTabId } from '@/features/billing/types/billing.types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FlowStep = {
  step: number
  title: string
  tab: BillingTabId
  summary: string
  details: string[]
}

const SETUP_STEPS: FlowStep[] = [
  {
    step: 1,
    title: 'Pay cards',
    tab: 'pay-cards',
    summary: 'Define how carers are paid — hourly rates, sleep-ins, travel, and premiums.',
    details: [
      'Create reusable pay card templates with rate rules and effective dates.',
      'Assign a pay card to each employee on their employment record.',
      'Missing pay cards cause visit reconciliation exceptions before payroll.',
    ],
  },
  {
    step: 2,
    title: 'Charge cards',
    tab: 'charge-cards',
    summary: 'Define what service users / funders are charged for each visit type.',
    details: [
      'Set charge rates by service type, duration rules, and billing frequency.',
      'Assign charge cards to service users or funding contracts.',
      'Charge cards drive invoice line amounts after visits are approved.',
    ],
  },
  {
    step: 3,
    title: 'Funding contracts',
    tab: 'funding-contracts',
    summary: 'Link each service user to their funders and split percentages.',
    details: [
      'Record local authority, NHS, private, and split-funding packages.',
      'Set purchase order numbers, council references, and billing contacts.',
      'Funding splits determine how each visit charge is divided across payers.',
    ],
  },
  {
    step: 4,
    title: 'Invoice templates',
    tab: 'invoice-templates',
    summary: 'Configure export layouts for each funder type — PDF, Excel, or council upload.',
    details: [
      'Use industry presets: Standard, Local authority, NHS, or Private client.',
      'Map system fields to funder column names and mark required fields.',
      'Each local authority receives its own separate invoice when runs are generated.',
    ],
  },
]

const OPERATIONS_STEPS: FlowStep[] = [
  {
    step: 5,
    title: 'Visit reconciliation',
    tab: 'visit-reconciliation',
    summary: 'Review completed visits before they enter payroll or invoicing.',
    details: [
      'Compare planned vs actual times and approve billable / payable durations.',
      'Resolve exceptions: missing cards, funding gaps, or time discrepancies.',
      'Only approved visits flow into payroll and invoice runs — never silent billing.',
    ],
  },
]

const FINANCE_STEPS: FlowStep[] = [
  {
    step: 6,
    title: 'Payroll runs',
    tab: 'payroll-runs',
    summary: 'Batch carer pay for a billing period.',
    details: [
      'Create a run for the week or month, then Calculate to pull approved visits.',
      'Review carer totals, fix exceptions, Approve, Lock, and Export CSV for payroll.',
      'Payroll and invoicing are separate — carer pay does not depend on funder invoices.',
    ],
  },
  {
    step: 7,
    title: 'Invoice runs',
    tab: 'invoice-runs',
    summary: 'Batch client charges and produce funder invoices.',
    details: [
      'Create a run for the period and Calculate from approved billable visits.',
      'Each authority / funder gets its own invoice with a unique invoice number.',
      'Approve, Lock, then mark Sent when files go to councils or families.',
    ],
  },
  {
    step: 8,
    title: 'Payments',
    tab: 'payments',
    summary: 'Record remittances and match them to locked invoice runs.',
    details: [
      'Log BACS, council remittances, and family payments as they arrive.',
      'Match payments to invoice runs to track paid vs outstanding balances.',
      'Use aged debt on the dashboard to chase overdue authority invoices.',
    ],
  },
]

const COMPLIANCE_STEPS: FlowStep[] = [
  {
    step: 9,
    title: 'Audit & export',
    tab: 'audit-export',
    summary: 'Download audit trails and finance exports for compliance review.',
    details: [
      'Export billing configuration changes and run history for auditors.',
      'Use alongside locked payroll and invoice runs as your finance evidence trail.',
    ],
  },
]

const WEEKLY_CHECKLIST = [
  'Reconcile new completed visits and clear exceptions.',
  'Confirm pay cards, charge cards, and funding are complete for active service users.',
  'Run payroll for the closed week — calculate, approve, lock, export.',
  'Run invoices for the same period — one invoice per authority / funder.',
  'Send invoice files and record incoming payments against locked runs.',
]

function FlowStepBlock({ step, onNavigate }: { step: FlowStep; onNavigate: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {step.step}
          </span>
          <div className="min-w-0 space-y-1">
            <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
            <p className="text-sm text-muted-foreground">{step.summary}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild onClick={onNavigate}>
          {isBillingSectionTab(step.tab) ? (
            <Link to={billingPathForTab(step.tab)}>
              Open page
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link to="/billing" search={{ tab: step.tab }}>
              Open tab
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </Button>
      </div>
      <ul className="mt-3 space-y-1.5 border-t border-border pt-3 pl-10 text-sm text-muted-foreground">
        {step.details.map(detail => (
          <li key={detail} className="flex gap-2">
            <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span>{detail}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PhaseHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h3>
  )
}

export function BillingGuidanceDialog({ open, onOpenChange }: Props) {
  const closeAndNavigate = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            Billing management guidance
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[75vh] space-y-6 overflow-y-auto pr-1">
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Core rule</p>
            <p className="mt-1 text-muted-foreground">
              Completed and approved visits are the single source of truth for finance. Carer pay
              and client / funder invoicing are calculated separately. Missing setup creates
              exceptions — the system never bills silently.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              End-to-end flow
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Setup → Visit reconciliation → Payroll run → Invoice run → Payments → Audit
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {['Pay & charge cards', 'Funding', 'Templates', 'Approve visits', 'Pay carers', 'Bill funders', 'Match cash', 'Export'].map(
                label => (
                  <span key={label} className="rounded-full border border-border bg-background px-2.5 py-1">
                    {label}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="space-y-3">
            <PhaseHeading>Phase 1 — Setup (do once, keep updated)</PhaseHeading>
            {SETUP_STEPS.map(step => (
              <FlowStepBlock key={step.tab} step={step} onNavigate={closeAndNavigate} />
            ))}
          </div>

          <div className="space-y-3">
            <PhaseHeading>Phase 2 — Operations (weekly)</PhaseHeading>
            {OPERATIONS_STEPS.map(step => (
              <FlowStepBlock key={step.tab} step={step} onNavigate={closeAndNavigate} />
            ))}
          </div>

          <div className="space-y-3">
            <PhaseHeading>Phase 3 — Finance runs (weekly / monthly)</PhaseHeading>
            {FINANCE_STEPS.map(step => (
              <FlowStepBlock key={step.tab} step={step} onNavigate={closeAndNavigate} />
            ))}
          </div>

          <div className="space-y-3">
            <PhaseHeading>Phase 4 — Compliance</PhaseHeading>
            {COMPLIANCE_STEPS.map(step => (
              <FlowStepBlock key={step.tab} step={step} onNavigate={closeAndNavigate} />
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">Typical weekly checklist</h3>
            <ul className="mt-3 space-y-2">
              {WEEKLY_CHECKLIST.map(item => (
                <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Invoice tip:</strong> one invoice run can include
            multiple authorities — each council or funder is split into its own invoice with a
            unique number. Preview individual authority invoices from the invoice run detail page.
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" asChild>
            <Link to="/billing" search={{ tab: 'dashboard' }} onClick={closeAndNavigate}>
              Go to dashboard
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
