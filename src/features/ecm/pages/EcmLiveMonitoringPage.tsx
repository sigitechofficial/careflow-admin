import * as React from 'react'
import { Radio } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { EcmExceptionQueueWorkspace } from '@/features/ecm/components/EcmExceptionQueueWorkspace'
import { EcmLiveMonitoringPanel } from '@/features/ecm/components/EcmLiveMonitoringPanel'
import { useEcmExceptions } from '@/features/ecm/hooks/useEcm'

function isClosedLifecycle(lifecycle: string): boolean {
  return (
    lifecycle === 'RESOLVED' ||
    lifecycle === 'MANAGER_REVIEWED' ||
    lifecycle === 'CLOSED'
  )
}

function useExceptionQueueTabFlags() {
  const exceptions = useEcmExceptions({ limit: 100 })
  return React.useMemo(() => {
    const sosJobs = new Set<string>()
    const lockedAreaJobs = new Set<string>()
    for (const row of exceptions.data ?? []) {
      if (
        row.kind === 'CARER_SOS' &&
        !isClosedLifecycle(row.lifecycle) &&
        row.lifecycle !== 'ACKNOWLEDGED' &&
        !row.acknowledgedAt &&
        !row.sos?.acknowledgedAt
      ) {
        sosJobs.add(row.scheduledJobId)
      }
      if (row.kind === 'LEFT_VISIT_AREA' && row.areaLock?.status !== 'ALLOWED') {
        lockedAreaJobs.add(row.scheduledJobId)
      }
    }
    return {
      sosVisitCount: sosJobs.size,
      lockedAreaVisitCount: lockedAreaJobs.size,
    }
  }, [exceptions.data])
}

export default function EcmLiveMonitoringPage() {
  const [tab, setTab] = React.useState('ecm')
  const { sosVisitCount, lockedAreaVisitCount } = useExceptionQueueTabFlags()
  const flagBits = [
    sosVisitCount > 0 ? `${sosVisitCount} carer SOS` : null,
    lockedAreaVisitCount > 0 ? `${lockedAreaVisitCount} left visit area` : null,
  ].filter(Boolean)

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
          <TabsTrigger
            variant="underline"
            value="exceptions"
            aria-label={
              flagBits.length > 0
                ? `Exception queue, ${flagBits.join(', ')}`
                : 'Exception queue'
            }
          >
            Exception queue
            {sosVisitCount > 0 ? (
              <span
                className="ml-1.5 inline-flex items-center rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-semibold leading-none text-destructive-foreground"
                data-testid="ecm-exception-queue-sos-flag"
              >
                SOS {sosVisitCount}
              </span>
            ) : null}
            {lockedAreaVisitCount > 0 ? (
              <span
                className="ml-1.5 inline-flex items-center rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-semibold leading-none text-destructive-foreground"
                data-testid="ecm-exception-queue-area-lock-flag"
              >
                Left area {lockedAreaVisitCount}
              </span>
            ) : null}
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
