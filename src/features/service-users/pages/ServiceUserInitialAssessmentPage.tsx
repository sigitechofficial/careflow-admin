import { Link, useParams } from '@tanstack/react-router'
import {
  SERVICE_USER_MODULE_CONTENT_WIDE_CLASS,
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { ServiceUserInitialAssessmentEnterpriseTab } from '@/features/service-users/initial-assessment/components/ServiceUserInitialAssessmentEnterpriseTab'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import type { ServiceUserDetail } from '@/features/service-users/types'

function displayName(d: ServiceUserDetail | null | undefined): string {
  if (!d) return 'Service user'
  const legal = [d.firstName, d.lastName].filter(Boolean).join(' ').trim()
  if (d.preferredName?.trim()) {
    return legal ? `${legal} (${d.preferredName.trim()})` : d.preferredName.trim()
  }
  return legal || 'Service user'
}

export default function ServiceUserInitialAssessmentPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const serviceUserId = params.serviceUserId ?? ''
  const profileQuery = useServiceUser(serviceUserId)
  const detail = profileQuery.data ?? null

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

  return (
    <div className={SERVICE_USER_MODULE_PAGE_CLASS}>
      <ServiceUserModuleHeader
        serviceUserId={serviceUserId}
        detail={detail}
        shellLayout="wide"
      />
      <ServiceUserModuleTabs serviceUserId={serviceUserId} shellLayout="wide" />
      <div className={SERVICE_USER_MODULE_CONTENT_WIDE_CLASS}>
        <ServiceUserInitialAssessmentEnterpriseTab
          serviceUserId={serviceUserId}
          displayName={displayName(detail)}
        />
      </div>
    </div>
  )
}
