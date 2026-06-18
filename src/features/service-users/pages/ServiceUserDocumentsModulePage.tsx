import { useParams } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import {
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { ServiceUserDocumentStorePanel } from '@/features/service-users/documents/components/ServiceUserDocumentStorePanel'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
export default function ServiceUserDocumentsModulePage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const serviceUserId = params.serviceUserId ?? ''
  const apiConfigured = Boolean(getApiBaseUrl())
  const profileQuery = useServiceUser(serviceUserId)

  if (!apiConfigured) {
    return (
      <p className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL to load documents.</p>
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
    <div className={SERVICE_USER_MODULE_PAGE_CLASS}>
      <ServiceUserModuleHeader serviceUserId={serviceUserId} detail={profileQuery.data ?? null} />
      <ServiceUserModuleTabs serviceUserId={serviceUserId} />

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <ServiceUserDocumentStorePanel serviceUserId={serviceUserId} />
      </div>
    </div>
  )
}
