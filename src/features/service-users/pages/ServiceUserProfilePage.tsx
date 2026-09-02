import * as React from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { type LookupRow } from '@/features/employees/types'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { ServiceUserProfileSectionContent } from '@/features/service-users/components/ServiceUserProfileSectionContent'
import { ServiceUserSectionSideNav } from '@/features/service-users/components/ServiceUserSectionSideNav'
import {
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { serviceUserKeys } from '@/features/service-users/keys'
import { resolveServiceUserIdFromParams } from '@/features/service-users/service-user-route-id'
import {
  resolveServiceUserProfileTab,
  SERVICE_USER_PROFILE_ROUTE,
  SERVICE_USER_PROFILE_TABS,
  type ServiceUserProfileTabId,
} from '@/features/service-users/service-user-profile-tabs'

/** Route: `/service-users/:serviceUserId/profile` — profile under the module tab shell. */
export default function ServiceUserProfilePage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const search = useSearch({ strict: false }) as { tab?: string }
  const serviceUserId = resolveServiceUserIdFromParams(params.serviceUserId)
  const tab = resolveServiceUserProfileTab(search.tab)

  const { data: detail = null, isLoading: profileLoading, error: profileError } = useServiceUser(serviceUserId ?? '')
  const { data: lookups = null, isLoading: lookupsLoading } = useServiceUserLookups()
  const { data: empLookups } = useEmployeeLookups()
  const locations: LookupRow[] = empLookups?.locations ?? []
  const queryClient = useQueryClient()

  const setTab = React.useCallback(
    (next: ServiceUserProfileTabId) => {
      if (!serviceUserId) return
      void navigate({
        to: SERVICE_USER_PROFILE_ROUTE,
        params: { serviceUserId },
        search: { tab: next },
      })
    },
    [navigate, serviceUserId],
  )

  const invalidateProfile = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: serviceUserKeys.profile(serviceUserId ?? '') })
  }, [queryClient, serviceUserId])

  if (!serviceUserId) {
    return (
      <div className="p-6 text-sm text-muted-foreground" data-testid="service-user-profile-missing-id">
        Missing service user id in the URL. Return to{' '}
        <Link to="/service-users/all" className="text-primary underline">
          Service users
        </Link>
        .
      </div>
    )
  }

  const loading = (profileLoading && !detail) || lookupsLoading

  return (
    <div className={SERVICE_USER_MODULE_PAGE_CLASS} data-testid="service-user-profile-page">
      <ServiceUserModuleHeader serviceUserId={serviceUserId} detail={detail} />
      <ServiceUserModuleTabs serviceUserId={serviceUserId} />

      {profileError ? (
        <p className="p-6 text-sm text-destructive" role="alert">
          Failed to load service user
        </p>
      ) : null}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {!loading && detail ? (
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6">
          <div
            className="flex flex-col rounded-xl border border-border bg-card shadow-sm md:flex-row"
            data-testid="service-user-profile-layout"
          >
            <ServiceUserSectionSideNav
              tabs={SERVICE_USER_PROFILE_TABS}
              activeId={tab}
              onSelect={setTab}
              ariaLabel="Profile sections"
              testId="service-user-profile-tabs"
              tabTestIdPrefix="service-user-profile-tab-"
            />
            <div className="min-w-0 flex-1 space-y-6 p-5">
              <ServiceUserProfileSectionContent
                tab={tab}
                serviceUserId={serviceUserId}
                detail={detail}
                lookups={lookups}
                locations={locations}
                onSaved={invalidateProfile}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
