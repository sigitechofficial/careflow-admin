import * as React from 'react'
import { useParams } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { EcmExceptionQueueWorkspace } from '@/features/ecm/components/EcmExceptionQueueWorkspace'
import { EcmLiveMonitoringPanel } from '@/features/ecm/components/EcmLiveMonitoringPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import {
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { getApiBaseUrl } from '@/shared/lib/api-base'

/**
 * Service-user scoped ECM — reuses the central live monitoring panel with serviceUserId only.
 */
export default function ServiceUserEcmPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const serviceUserId = params.serviceUserId ?? ''
  const apiConfigured = Boolean(getApiBaseUrl())
  const profileQuery = useServiceUser(serviceUserId)
  const [tab, setTab] = React.useState('ecm')

  if (!apiConfigured) {
    return (
      <p className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL to load ECM.</p>
    )
  }

  if (!serviceUserId) {
    return (
      <p className="p-6 text-sm text-muted-foreground" data-testid="service-user-ecm-missing-id">
        Missing service user id in the URL.
      </p>
    )
  }

  if (profileQuery.isLoading && !profileQuery.data) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    )
  }

  return (
    <div className={SERVICE_USER_MODULE_PAGE_CLASS} data-testid="service-user-ecm-page">
      <ServiceUserModuleHeader serviceUserId={serviceUserId} detail={profileQuery.data ?? null} />
      <ServiceUserModuleTabs serviceUserId={serviceUserId} />

      <div className="mx-auto w-full max-w-[1400px] bg-muted/20 px-4 py-6 sm:px-6">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Electronic Call Monitoring
          </h2>
          <p className="text-sm text-muted-foreground">
            Live attendance and exceptions for this service user only.
          </p>
        </div>
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
              <EcmLiveMonitoringPanel serviceUserId={serviceUserId} />
            ) : null}
          </TabsContent>
          <TabsContent value="exceptions" className="mt-4">
            {tab === 'exceptions' ? (
              <EcmExceptionQueueWorkspace serviceUserId={serviceUserId} />
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
