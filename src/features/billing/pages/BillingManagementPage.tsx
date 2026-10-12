import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  BookOpen,
  CalendarDays,
  CreditCard,
  Layers,
  FileText,
  LayoutDashboard,
  PoundSterling,
  ScrollText,
} from 'lucide-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui/page-elements'
import { cn } from '@/shared/lib/utils'
import type { BillingTabId } from '@/features/billing/types/billing.types'
import { BILLING_SETUP_TAB_IDS } from '@/features/billing/billing-routes'
import { BillingGuidanceDialog } from '@/features/billing/components/BillingGuidanceDialog'
import { BillingDashboardPanel } from '@/features/billing/components/BillingDashboardPanel'
import { ChargeCardsPanel } from '@/features/billing/components/ChargeCardsPanel'
import { PayCardsPanel } from '@/features/billing/components/PayCardsPanel'
import { BillingFundingContractsPanel } from '@/features/billing/components/BillingFundingContractsPanel'
import { BillingInvoiceTemplatesPanel } from '@/features/billing/components/BillingInvoiceTemplatesPanel'
import { WageTypesPanel } from '@/features/billing/components/WageTypesPanel'
import { BankHolidaysPanel } from '@/features/billing/components/BankHolidaysPanel'

export type { BillingTabId }

const BILLING_TABS: {
  id: BillingTabId
  label: string
  group?: string
  Icon: LucideIcon
  color: string
}[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'Overview', Icon: LayoutDashboard, color: 'text-sky-500' },
  { id: 'pay-cards', label: 'Pay cards', group: 'Setup', Icon: Banknote, color: 'text-emerald-500' },
  { id: 'charge-cards', label: 'Charge cards', group: 'Setup', Icon: CreditCard, color: 'text-violet-500' },
  { id: 'funding-contracts', label: 'Funding contracts', group: 'Setup', Icon: ScrollText, color: 'text-amber-500' },
  { id: 'invoice-templates', label: 'Invoice templates', group: 'Setup', Icon: FileText, color: 'text-rose-500' },
  { id: 'wage-types', label: 'Wage types', group: 'Setup', Icon: Layers, color: 'text-teal-500' },
  { id: 'bank-holidays', label: 'Bank holidays', group: 'Setup', Icon: CalendarDays, color: 'text-orange-500' },
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
    case 'wage-types':
      return <WageTypesPanel />
    case 'bank-holidays':
      return <BankHolidaysPanel />
    default:
      return <BillingDashboardPanel />
  }
}

export default function BillingManagementPage() {
  const navigate = useNavigate()
  const [guidanceOpen, setGuidanceOpen] = React.useState(false)
  const search = useRouterState({ select: s => s.location.search as { tab?: string } })
  const activeTab =
    search.tab && BILLING_SETUP_TAB_IDS.includes(search.tab as BillingTabId)
      ? (search.tab as BillingTabId)
      : 'dashboard'

  const setTab = (tab: BillingTabId) => {
    void navigate({ to: '/billing', search: { tab } as Record<string, string> })
  }

  let lastGroup: string | undefined

  return (
    <div className="flex flex-col gap-4" data-testid="billing-management-page">
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

      <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm md:flex-row">
        <nav
          className={cn(
            'flex shrink-0 gap-0.5 overflow-x-auto',
            'border-b border-border bg-muted/30 p-2',
            'md:sticky md:top-0 md:h-fit md:max-h-[calc(100dvh-5rem)] md:w-56 md:flex-col md:overflow-y-auto md:overflow-x-visible',
            'md:border-b-0 md:border-r',
          )}
          aria-label="Billing modules"
          data-testid="billing-tabs"
        >
          {BILLING_TABS.map(tab => {
            const isActive = tab.id === activeTab
            const showGroup = tab.group && tab.group !== lastGroup
            if (showGroup) lastGroup = tab.group
            const Icon = tab.Icon

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
                    'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                    'md:w-full',
                  )}
                >
                  <Icon
                    className={cn('h-4 w-4 shrink-0', tab.color)}
                    aria-hidden
                  />
                  <span className="min-w-0">{tab.label}</span>
                </button>
              </React.Fragment>
            )
          })}
        </nav>

        <div
          className="min-w-0 flex-1 p-4 md:p-6"
          role="tabpanel"
          data-testid={`billing-panel-${activeTab}`}
        >
          <BillingTabPanel tab={activeTab} />
        </div>
      </div>
    </div>
  )
}
