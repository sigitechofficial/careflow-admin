import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Radio } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { EcmExceptionQueueWorkspace } from '@/features/ecm/components/EcmExceptionQueueWorkspace'
import { EcmLiveMonitoringPanel } from '@/features/ecm/components/EcmLiveMonitoringPanel'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useEcmExceptions } from '@/features/ecm/hooks/useEcm'
import { countExceptionQueueTabFlags } from '@/features/ecm/utils/ecm-urgent-alert.util'
import type { EcmLiveUrlSearch } from '@/features/ecm/utils/ecm-period-url-state.util'

function useExceptionQueueTabFlags() {
  const { locationId } = useGlobalLocationScope()
  const exceptions = useEcmExceptions({
    limit: 100,
    locationId: locationId ?? undefined,
  })
  return React.useMemo(
    () => countExceptionQueueTabFlags(exceptions.data ?? []),
    [exceptions.data],
  )
}

export default function EcmLiveMonitoringPage() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as EcmLiveUrlSearch
  const tab = search.tab === 'exceptions' ? 'exceptions' : 'ecm'
  const {
    sosVisitCount,
    lockedAreaVisitCount,
    checkInRequestVisitCount,
    unableToStartVisitCount,
  } = useExceptionQueueTabFlags()
  const flagBits = [
    sosVisitCount > 0 ? `${sosVisitCount} carer SOS` : null,
    lockedAreaVisitCount > 0 ? `${lockedAreaVisitCount} left visit area` : null,
    unableToStartVisitCount > 0 ? `${unableToStartVisitCount} unable to start` : null,
    checkInRequestVisitCount > 0
      ? `${checkInRequestVisitCount} outside area check-in`
      : null,
  ].filter(Boolean)

  const setTab = (next: string) => {
    const nextTab: EcmLiveUrlSearch['tab'] = next === 'exceptions' ? 'exceptions' : 'ecm'
    void navigate({
      to: '/ecm/live',
      search: ((prev: Record<string, unknown>) => ({
        ...prev,
        tab: nextTab,
      })) as never,
      replace: true,
    })
  }

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
            {unableToStartVisitCount > 0 ? (
              <span
                className="ml-1.5 inline-flex items-center rounded-full bg-amber-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
                data-testid="ecm-exception-queue-unable-to-start-flag"
              >
                Unable to start {unableToStartVisitCount}
              </span>
            ) : null}
            {checkInRequestVisitCount > 0 ? (
              <span
                className="ml-1.5 inline-flex items-center rounded-full bg-amber-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
                data-testid="ecm-exception-queue-check-in-request-flag"
              >
                Check-in {checkInRequestVisitCount}
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
              <EcmExceptionQueueWorkspace focusJobId={search.jobId} />
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
