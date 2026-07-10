import * as React from 'react'
import { BookOpen, PoundSterling } from 'lucide-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui/page-elements'
import { cn } from '@/shared/lib/utils'
import type { BillingTabId } from '@/features/billing/types/billing.types'
import { BillingGuidanceDialog } from '@/features/billing/components/BillingGuidanceDialog'
import { BillingDashboardPanel } from '@/features/billing/components/BillingDashboardPanel'
import { ChargeCardsPanel } from '@/features/billing/components/ChargeCardsPanel'
import { PayCardsPanel } from '@/features/billing/components/PayCardsPanel'
import { BillingFundingContractsPanel } from '@/features/billing/components/BillingFundingContractsPanel'
import { BillingInvoiceTemplatesPanel } from '@/features/billing/components/BillingInvoiceTemplatesPanel'
import { BillingVisitReconciliationPanel } from '@/features/billing/components/BillingVisitReconciliationPanel'
import { BillingPayrollRunsPanel } from '@/features/billing/components/BillingPayrollRunsPanel'
import { BillingInvoiceRunsPanel } from '@/features/billing/components/BillingInvoiceRunsPanel'
import { BillingPaymentsPanel } from '@/features/billing/components/BillingPaymentsPanel'
import { BillingAuditExportPanel } from '@/features/billing/components/BillingAuditExportPanel'

export type { BillingTabId }

const BILLING_TABS: { id: BillingTabId; label: string; group?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'Overview' },
  { id: 'pay-cards', label: 'Pay cards', group: 'Setup' },
  { id: 'charge-cards', label: 'Charge cards', group: 'Setup' },
  { id: 'funding-contracts', label: 'Funding contracts', group: 'Setup' },
  { id: 'invoice-templates', label: 'Invoice templates', group: 'Setup' },
  { id: 'visit-reconciliation', label: 'Visit reconciliation', group: 'Operations' },
  { id: 'payroll-runs', label: 'Payroll runs', group: 'Finance runs' },
  { id: 'invoice-runs', label: 'Invoice runs', group: 'Finance runs' },
  { id: 'payments', label: 'Payments', group: 'Finance runs' },
  { id: 'audit-export', label: 'Audit & export', group: 'Compliance' },
]

function BillingTabPanel({ tab }: { tab: BillingTabId }) {
  switch (tab) {
    case 'dashboard':
      return <BillingDashboardPanel />
    case 'pay-cards':
      return <PayCardsPanel />
    case 'charge-cards':
      return <ChargeCardsPanel />
    case 'funding-contracts':
      return <BillingFundingContractsPanel />
    case 'invoice-templates':
      return <BillingInvoiceTemplatesPanel />
    case 'visit-reconciliation':
      return <BillingVisitReconciliationPanel />
    case 'payroll-runs':
      return <BillingPayrollRunsPanel />
    case 'invoice-runs':
      return <BillingInvoiceRunsPanel />
    case 'payments':
      return <BillingPaymentsPanel />
    case 'audit-export':
      return <BillingAuditExportPanel />
    default:
      return <BillingDashboardPanel />
  }
}

export default function BillingManagementPage() {
  const navigate = useNavigate()
  const [guidanceOpen, setGuidanceOpen] = React.useState(false)
  const search = useRouterState({ select: s => s.location.search as { tab?: string } })
  const activeTab =
    search.tab && BILLING_TABS.some(t => t.id === search.tab)
      ? (search.tab as BillingTabId)
      : 'dashboard'

  const setTab = (tab: BillingTabId) => {
    void navigate({ to: '/billing', search: { tab } as Record<string, string> })
  }

  let lastGroup: string | undefined

  return (
    <div
      className="flex h-[calc(100dvh-3.5rem-2.5rem)] flex-col gap-4 overflow-hidden md:h-[calc(100dvh-3.5rem-3rem)]"
      data-testid="billing-management-page"
    >
      <PageHeader
        className="shrink-0"
        title="Billing management"
        description="Carer payroll, service user invoicing, funding, charge cards, funder templates, and credit control."
        icon={<PoundSterling className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Billing' },
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm md:flex-row">
        <nav
          className={cn(
            'flex min-h-0 shrink-0 gap-0.5 overflow-x-auto overflow-y-hidden overscroll-y-contain',
            'border-b border-border bg-muted/30 p-2',
            'md:w-56 md:flex-col md:overflow-x-visible md:overflow-y-auto',
            'md:border-b-0 md:border-r',
          )}
          aria-label="Billing modules"
          data-testid="billing-tabs"
        >
          {BILLING_TABS.map(tab => {
            const isActive = tab.id === activeTab
            const showGroup = tab.group && tab.group !== lastGroup
            if (showGroup) lastGroup = tab.group

            return (
              <React.Fragment key={tab.id}>
                {showGroup && (
                  <p className="hidden md:block px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground first:pt-0">
                    {tab.group}
                  </p>
                )}
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-testid={`billing-tab-${tab.id}`}
                  onClick={() => setTab(tab.id)}
                  className={cn(
                    'shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                    'md:w-full',
                  )}
                >
                  {tab.label}
                </button>
              </React.Fragment>
            )
          })}
        </nav>

        <div
          className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6"
          role="tabpanel"
          data-testid={`billing-panel-${activeTab}`}
        >
          <BillingTabPanel tab={activeTab} />
        </div>
      </div>
    </div>
  )
}
