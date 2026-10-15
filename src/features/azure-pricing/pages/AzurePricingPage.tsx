import * as React from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  BarChart3,
  BellRing,
  Briefcase,
  Calculator,
  Cloud,
  FileBarChart2,
  LayoutDashboard,
  Lightbulb,
} from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { useCostOverview } from '@/features/azure-pricing/hooks/useAzurePricing'
import { isAzurePricingTabId, type AzurePricingTabId } from '@/features/azure-pricing/types'
import { FreshnessBanner } from '@/features/azure-pricing/components/AzurePricingShared'
import { OverviewTab } from '@/features/azure-pricing/components/OverviewTab'
import { BreakdownTab } from '@/features/azure-pricing/components/BreakdownTab'
import { PricesCalculatorTab } from '@/features/azure-pricing/components/PricesCalculatorTab'
import { AlertsTab } from '@/features/azure-pricing/components/AlertsTab'
import { RecommendationsTab } from '@/features/azure-pricing/components/RecommendationsTab'
import { BusinessMetricsTab } from '@/features/azure-pricing/components/BusinessMetricsTab'
import { ReportsSettingsTab } from '@/features/azure-pricing/components/ReportsSettingsTab'

const TABS: { id: AzurePricingTabId; label: string; Icon: typeof Cloud }[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'breakdown', label: 'Breakdown', Icon: BarChart3 },
  { id: 'prices', label: 'Prices & calculator', Icon: Calculator },
  { id: 'alerts', label: 'Alerts & anomalies', Icon: BellRing },
  { id: 'recommendations', label: 'Recommendations', Icon: Lightbulb },
  { id: 'business', label: 'Business metrics', Icon: Briefcase },
  { id: 'reports', label: 'Reports & settings', Icon: FileBarChart2 },
]

export default function AzurePricingPage() {
  const navigate = useNavigate()
  const search = useRouterState({ select: s => s.location.search as { tab?: string } })
  const activeTab: AzurePricingTabId = isAzurePricingTabId(search.tab) ? search.tab : 'overview'
  // Shared, cached query: drives the freshness banner on every tab.
  const overview = useCostOverview()
  const openAnomalies = overview.data?.openAnomalies ?? 0

  // On narrow screens the tab strip scrolls: keep the active tab visible (e.g. deep links to ?tab=reports).
  const tabStripRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const active = tabStripRef.current?.querySelector<HTMLElement>('[data-state="active"]')
    active?.scrollIntoView?.({ block: 'nearest', inline: 'center' })
  }, [activeTab])

  const setTab = (tab: AzurePricingTabId) => {
    void navigate({ to: '/azure-pricing', search: { tab } as Record<string, string> })
  }

  return (
    <div className="space-y-4" data-testid="azure-pricing-page">
      <PageHeader
        title="Azure Pricing"
        description="What the Careflow platform costs to run on Azure: actual spend, budget, live prices and what-if estimates."
        icon={<Cloud className="h-4 w-4 text-muted-foreground" aria-hidden />}
      />

      <FreshnessBanner
        lastSyncedAt={overview.data?.lastSyncedAt}
        dataThrough={overview.data?.dataThrough}
        enabled={overview.data?.enabled}
        loading={overview.isLoading}
      />

      <Tabs value={activeTab} onValueChange={v => isAzurePricingTabId(v) && setTab(v)}>
        <div ref={tabStripRef} className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList variant="underline" className="w-max min-w-full" aria-label="Azure Pricing sections">
            {TABS.map(({ id, label, Icon }) => (
              <TabsTrigger key={id} value={id} variant="underline" data-testid={`azure-tab-${id}`} className="gap-1.5 px-3 sm:px-4">
                <Icon className="h-4 w-4" aria-hidden />
                {label}
                {id === 'alerts' && openAnomalies > 0 ? (
                  <span
                    className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[11px] font-semibold text-warning-foreground"
                    aria-label={`${openAnomalies} open`}
                  >
                    {openAnomalies}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <OverviewTab onNavigateTab={setTab} />
        </TabsContent>
        <TabsContent value="breakdown">
          <BreakdownTab />
        </TabsContent>
        <TabsContent value="prices">
          <PricesCalculatorTab />
        </TabsContent>
        <TabsContent value="alerts">
          <AlertsTab />
        </TabsContent>
        <TabsContent value="recommendations">
          <RecommendationsTab />
        </TabsContent>
        <TabsContent value="business">
          <BusinessMetricsTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
