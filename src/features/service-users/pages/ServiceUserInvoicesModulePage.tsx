import { Link, useParams } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import {
  SERVICE_USER_MODULE_CONTENT_WIDE_CLASS,
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { ServiceUserEditInvoicesPanel } from '@/features/service-users/components/ServiceUserEditInvoicesPanel'
import { ServiceUserFundingUsageCard } from '@/features/billing/components/ServiceUserFundingUsageCard'
import { useAuthStore } from '@/features/auth/store'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { resolveServiceUserIdFromParams } from '@/features/service-users/service-user-route-id'
import { getApiBaseUrl } from '@/shared/lib/api-base'

/** Route: `/service-users/:serviceUserId/invoices` — module tab after Overview. */
export default function ServiceUserInvoicesModulePage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const serviceUserId = resolveServiceUserIdFromParams(params.serviceUserId)
  const apiConfigured = Boolean(getApiBaseUrl())
  const profileQuery = useServiceUser(serviceUserId ?? '')
  const canSeeFundingUsage = useAuthStore(s => s.can('billing.visit_reconciliations.read' as never))

  if (!serviceUserId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Missing service user id.{' '}
        <Link to="/service-users/all" className="text-primary underline">
          Back to list
        </Link>
      </div>
    )
  }

  if (!apiConfigured) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Configure VITE_API_BASE_URL to load invoices.
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
    <div className={SERVICE_USER_MODULE_PAGE_CLASS}>
      <ServiceUserModuleHeader
        serviceUserId={serviceUserId}
        detail={profileQuery.data ?? null}
        shellLayout="wide"
      />
      <ServiceUserModuleTabs serviceUserId={serviceUserId} shellLayout="wide" />

      <div className={SERVICE_USER_MODULE_CONTENT_WIDE_CLASS}>
        {canSeeFundingUsage ? (
          <div className="mb-4">
            <ServiceUserFundingUsageCard serviceUserId={serviceUserId} />
          </div>
        ) : null}
        <ServiceUserEditInvoicesPanel serviceUserId={serviceUserId} />
      </div>
    </div>
  )
}
