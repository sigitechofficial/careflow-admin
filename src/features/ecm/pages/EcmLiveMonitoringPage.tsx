import * as React from 'react'
import { Radio } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { EcmExceptionQueueWorkspace } from '@/features/ecm/components/EcmExceptionQueueWorkspace'
import { EcmLiveMonitoringPanel } from '@/features/ecm/components/EcmLiveMonitoringPanel'

export default function EcmLiveMonitoringPage() {
  const [tab, setTab] = React.useState('ecm')

  return (
    <div className="flex flex-col gap-4" data-testid="ecm-live-monitoring-page">
      <PageHeader
        className="shrink-0"
        title="ECM live monitoring"
        description="Electronic Call Monitoring — planned vs actual attendance, timing exceptions, and follow-up."
        icon={<Radio className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'ECM', href: '/ecm/live' },
          { label: 'Live monitoring' },
        ]}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="underline" className="w-full justify-start">
          <TabsTrigger variant="underline" value="ecm">
            ECM
          </TabsTrigger>
          <TabsTrigger variant="underline" value="exceptions">
            Exception queue
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ecm" className="mt-4">
          {tab === 'ecm' ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
              <EcmLiveMonitoringPanel />
            </div>
          ) : null}
        </TabsContent>
        <TabsContent value="exceptions" className="mt-4">
          {tab === 'exceptions' ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
              <EcmExceptionQueueWorkspace />
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
