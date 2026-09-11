import * as React from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import {
  Calendar,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  Sparkles,
  User,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { type LookupRow } from '@/features/employees/types'
import { resolveServiceUserIdFromParams } from '@/features/service-users/service-user-route-id'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { useQueryClient } from '@tanstack/react-query'
import { serviceUserKeys } from '@/features/service-users/keys'
import { ServiceUserProfileSectionContent } from '@/features/service-users/components/ServiceUserProfileSectionContent'
import { ServiceUserSectionSideNav } from '@/features/service-users/components/ServiceUserSectionSideNav'
import {
  resolveServiceUserProfileTab,
  SERVICE_USER_PROFILE_TABS,
  type ServiceUserProfileTabId,
} from '@/features/service-users/service-user-profile-tabs'
import { Button } from '@/shared/ui/button'

function formatDob(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}-${mm}-${yyyy}`
}

export default function EditServiceUserPage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const serviceUserId = resolveServiceUserIdFromParams(params.serviceUserId)
  const search = useSearch({ strict: false }) as { tab?: string }

  React.useEffect(() => {
    if (!serviceUserId || search.tab !== 'invoices') return
    void navigate({
      to: '/service-users/$serviceUserId/invoices',
      params: { serviceUserId },
      replace: true,
    })
  }, [navigate, search.tab, serviceUserId])

  const mainTab: ServiceUserProfileTabId = resolveServiceUserProfileTab(search.tab)

  const setMainTab = React.useCallback(
    (tab: ServiceUserProfileTabId) => {
      if (!serviceUserId) return
      void navigate({
        to: '/service-users/$serviceUserId',
        params: { serviceUserId },
        search: { tab },
      })
    },
    [navigate, serviceUserId],
  )

  const { data: detail = null, isLoading: profileLoading, error: profileError } = useServiceUser(serviceUserId ?? '')
  const { data: lookups = null, isLoading: lookupsLoading } = useServiceUserLookups()
  const { data: empLookups } = useEmployeeLookups()
  const locations: LookupRow[] = empLookups?.locations ?? []

  const loading = profileLoading || lookupsLoading
  const error = profileError ? 'Failed to load service user' : null
  const queryClient = useQueryClient()
  const invalidateProfile = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: serviceUserKeys.profile(serviceUserId ?? '') })
  }, [queryClient, serviceUserId])

  const headerTitle = detail
    ? `${[detail.firstName, detail.lastName].filter(Boolean).join(' ')} (${formatDob(detail.dateOfBirth)})`
    : 'Service user'

  const photoSrc = resolveMediaUrl(detail?.profilePhoto?.fileUrl ?? detail?.profilePhotoUrl)

  if (!serviceUserId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Missing service user id in the URL. Return to{' '}
        <Link to="/service-users/all" className="text-primary underline">
          Service users
        </Link>
        .
      </div>
    )
  }

  return (
    <div className="relative flex min-h-full flex-col pb-16">
      <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground sm:text-xl">Edit Service User</h1>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="flex h-16 w-16 shrink-0 flex-col items-center justify-center overflow-hidden rounded-full border-2 border-muted bg-muted text-[6px] text-muted-foreground"
                style={{ minWidth: '4rem' }}
              >
                {photoSrc ? (
                  <img src={photoSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <User className="mb-0.5 h-6 w-6" strokeWidth={1.2} />
                    <span className="px-1 text-center font-medium leading-tight">
                      NO IMAGE
                      <br />
                      AVAILABLE
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm font-medium text-foreground">{headerTitle}</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
            <Button
              variant="outline"
              size="sm"
              asChild
              className={cn(
                'h-auto min-h-9 border-sky-200/80 bg-gradient-to-b from-card to-sky-50/40 py-2 pl-2.5 pr-3 shadow-sm',
                'text-foreground hover:border-sky-400/70 hover:bg-sky-50/80 hover:shadow-md',
                'dark:border-sky-800/60 dark:from-card dark:to-sky-950/30 dark:hover:border-sky-600/50 dark:hover:bg-sky-950/50',
                'transition-all duration-200 active:scale-[0.98]',
              )}
            >
              <Link to="/service-users/all" className="inline-flex max-w-[11rem] items-center gap-2 sm:max-w-none">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white shadow-inner dark:bg-sky-500">
                  <LayoutDashboard className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-left text-xs font-semibold leading-tight sm:text-sm">Service Users Dashboard</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className={cn(
                'h-auto min-h-9 border-violet-200/80 bg-gradient-to-b from-card to-violet-50/40 py-2 pl-2.5 pr-3 shadow-sm',
                'text-foreground hover:border-violet-400/70 hover:bg-violet-50/80 hover:shadow-md',
                'dark:border-violet-800/50 dark:from-card dark:to-violet-950/25 dark:hover:border-violet-600/50 dark:hover:bg-violet-950/45',
                'transition-all duration-200 active:scale-[0.98]',
              )}
            >
              <Link to="/showcase" className="inline-flex max-w-[9rem] items-center gap-2 sm:max-w-none">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white shadow-inner dark:bg-violet-500">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-left text-xs font-semibold leading-tight sm:text-sm">Care Plan</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className={cn(
                'h-auto min-h-9 border-teal-200/80 bg-gradient-to-b from-card to-teal-50/35 py-2 pl-2.5 pr-3 shadow-sm',
                'text-foreground hover:border-teal-400/70 hover:bg-teal-50/80 hover:shadow-md',
                'dark:border-teal-800/50 dark:from-card dark:to-teal-950/25 dark:hover:border-teal-600/50 dark:hover:bg-teal-950/45',
                'transition-all duration-200 active:scale-[0.98]',
              )}
            >
              <Link to="/service-users/calendar" className="inline-flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-teal-700 text-white shadow-inner dark:bg-teal-600">
                  <Calendar className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-xs font-semibold sm:text-sm">Calendar</span>
              </Link>
            </Button>
          </nav>
        </div>
      </div>


      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && detail && (
        <div className="flex-1 px-4 py-4 sm:px-6">
          <div
            className="flex flex-col rounded-xl border border-border bg-card shadow-sm md:flex-row"
            data-testid="service-user-edit-layout"
          >
            <ServiceUserSectionSideNav
              tabs={SERVICE_USER_PROFILE_TABS}
              activeId={mainTab}
              onSelect={setMainTab}
              ariaLabel="Service user sections"
              testId="service-user-edit-tabs"
              tabTestIdPrefix="service-user-edit-tab-"
            />

            <div className="min-w-0 flex-1 space-y-6 p-5">
              <ServiceUserProfileSectionContent
                tab={mainTab}
                serviceUserId={serviceUserId}
                detail={detail}
                lookups={lookups}
                locations={locations}
                onSaved={invalidateProfile}
              />
            </div>
          </div>
        </div>
      )}

      <a
        href="#help"
        className={cn(
          'fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full shadow-lg',
          'bg-teal-800 text-white hover:bg-teal-900',
        )}
        title="Help"
        aria-label="Help"
      >
        <HelpCircle className="h-6 w-6" />
      </a>
    </div>
  )
}
