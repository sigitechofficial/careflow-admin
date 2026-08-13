import * as React from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  BedDouble,
  Calendar,
  CalendarOff,
  ClipboardList,
  FileText,
  Heart,
  HelpCircle,
  Home,
  Images,
  Landmark,
  LayoutDashboard,
  Loader2,
  Package,
  Receipt,
  ClipboardCheck,
  Shield,
  Sparkles,
  User,
  UserCircle,
  Users,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { type ServiceUserDetail, type ServiceUserLookupsBundle } from '@/features/service-users/types'
import { type LookupRow } from '@/features/employees/types'
import { resolveServiceUserIdFromParams } from '@/features/service-users/service-user-route-id'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { useQueryClient } from '@tanstack/react-query'
import { serviceUserKeys } from '@/features/service-users/keys'
import { ServiceUserPersonalDetailsForm } from '@/features/service-users/components/ServiceUserPersonalDetailsForm'
import { ServiceUserPhotosTab } from '@/features/service-users/components/ServiceUserPhotosTab'
import { ServiceUserPortalAccessSection } from '@/features/service-users/components/ServiceUserPortalAccessSection'
import { ServiceUserContactsTab } from '@/features/service-users/components/ServiceUserContactsTab'
import { ServiceUserAboutMeForm } from '@/features/service-users/components/ServiceUserAboutMeForm'
import { ServiceUserInventoryTab } from '@/features/service-users/components/ServiceUserInventoryTab'
import { ServiceUserAllergiesTab } from '@/features/service-users/components/ServiceUserAllergiesTab'
import { ServiceUserAbsencesTab } from '@/features/service-users/components/ServiceUserAbsencesTab'
import { ServiceUserDomCareTab } from '@/features/service-users/components/ServiceUserDomCareTab'
import { ServiceUserInitialAssessmentEnterpriseTab } from '@/features/service-users/initial-assessment/components/ServiceUserInitialAssessmentEnterpriseTab'
import { ServiceUserFundingTab } from '@/features/service-users/components/ServiceUserFundingTab'
import { ServiceUserEditChargeCardPanel } from '@/features/service-users/components/ServiceUserEditChargeCardPanel'
import { ServiceUserEditVisitsPanel } from '@/features/service-users/components/ServiceUserEditVisitsPanel'
import { ServiceUserEditInvoicesPanel } from '@/features/service-users/components/ServiceUserEditInvoicesPanel'
import { ServiceUserLiveInProfileTab } from '@/features/service-users/components/ServiceUserLiveInProfileTab'
import { ServiceUserCalendarTab } from '@/features/service-users/calendar/components/ServiceUserCalendarTab'
import { Button } from '@/shared/ui/button'

type ServiceUserEditTabId =
  | 'personal'
  | 'contacts'
  | 'about'
  | 'photos'
  | 'inventory'
  | 'allergies'
  | 'absences'
  | 'calendar'
  | 'privacy'
  | 'dom'
  | 'assessment'
  | 'funding'
  | 'charge-card'
  | 'visits'
  | 'invoices'
  | 'livein'

const MAIN_TABS: { id: ServiceUserEditTabId; label: string; Icon: LucideIcon }[] = [
  { id: 'personal', label: 'Personal Details', Icon: UserCircle },
  { id: 'contacts', label: 'Contacts and Family', Icon: Users },
  { id: 'about', label: 'About Me', Icon: Heart },
  { id: 'photos', label: 'Photographs', Icon: Images },
  { id: 'inventory', label: 'Personal Inventory', Icon: Package },
  { id: 'allergies', label: 'Allergies', Icon: AlertTriangle },
  { id: 'absences', label: 'Record Absences', Icon: CalendarOff },
  { id: 'calendar', label: 'Calendar', Icon: Calendar },
  { id: 'privacy', label: 'Privacy', Icon: Shield },
  { id: 'dom', label: 'DOM Care', Icon: Home },
  { id: 'assessment', label: 'Initial Assessment', Icon: ClipboardList },
  { id: 'funding', label: 'Funding', Icon: Landmark },
  { id: 'charge-card', label: 'Charge card', Icon: Receipt },
  { id: 'visits', label: 'Visits', Icon: ClipboardCheck },
  { id: 'invoices', label: 'Invoices', Icon: FileText },
  { id: 'livein', label: 'Live in Service Profile', Icon: BedDouble },
]

const EMPTY_SU_LOOKUPS: ServiceUserLookupsBundle = {
  statuses: [],
  titles: [],
  genders: [],
  maritalStatuses: [],
  careTypes: [],
  fundingTypes: [],
  ethnicities: [],
  languages: [],
  riskLevels: [],
  relationshipTypes: [],
  allergies: [],
  absenceReasons: [],
  visitPlanPauseReasons: [],
}

function formatDob(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center text-sm text-muted-foreground">
      {title} data is not available in the API yet. This section is reserved for future CareAdmin modules.
    </div>
  )
}

export default function EditServiceUserPage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const serviceUserId = resolveServiceUserIdFromParams(params.serviceUserId)
  const search = useSearch({ strict: false }) as { tab?: string }
  const mainTab: ServiceUserEditTabId =
    search.tab && MAIN_TABS.some(t => t.id === search.tab)
      ? (search.tab as ServiceUserEditTabId)
      : 'personal'

  const setMainTab = React.useCallback(
    (tab: ServiceUserEditTabId) => {
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
            <nav
              className={cn(
                'flex shrink-0 gap-0.5 overflow-x-auto',
                'border-b border-border bg-muted/30 p-2',
                'md:sticky md:top-0 md:h-fit md:max-h-[calc(100dvh-5rem)] md:w-60 md:flex-col md:overflow-y-auto md:overflow-x-visible',
                'md:border-b-0 md:border-r',
              )}
              aria-label="Service user sections"
              data-testid="service-user-edit-tabs"
            >
              {MAIN_TABS.map(tab => {
                const Icon = tab.Icon
                const isActive = tab.id === mainTab
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-testid={`service-user-edit-tab-${tab.id}`}
                    onClick={() => setMainTab(tab.id)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors md:w-full',
                      isActive
                        ? 'bg-card text-foreground shadow-sm ring-1 ring-border md:border-l-2 md:border-l-primary md:pl-[10px] md:ring-0'
                        : 'text-muted-foreground hover:bg-card/70 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                )
              })}
            </nav>

            <div className="min-w-0 flex-1 space-y-6 p-5">
              {mainTab === 'personal' && (
                lookups ? (
                  <>
                    <ServiceUserPersonalDetailsForm
                      detail={detail}
                      lookups={lookups}
                      locations={locations}
                      serviceUserId={serviceUserId}
                      onSaved={invalidateProfile}
                    />
                    <ServiceUserPortalAccessSection serviceUserId={serviceUserId} defaultEmail={detail.email} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                )
              )}

              {mainTab === 'contacts' && (
                lookups ? (
                  <ServiceUserContactsTab
                    serviceUserId={serviceUserId}
                    detail={detail}
                    lookups={lookups}
                    onSaved={invalidateProfile}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                )
              )}

              {mainTab === 'about' && (
                <ServiceUserAboutMeForm serviceUserId={serviceUserId} detail={detail} onSaved={invalidateProfile} />
              )}

              {mainTab === 'photos' && <ServiceUserPhotosTab detail={detail} />}

              {mainTab === 'inventory' && <ServiceUserInventoryTab serviceUserId={serviceUserId} />}

              {mainTab === 'allergies' && (
                <ServiceUserAllergiesTab serviceUserId={serviceUserId} allergyCatalog={lookups?.allergies ?? []} />
              )}

              {mainTab === 'absences' && (
                <ServiceUserAbsencesTab
                  serviceUserId={serviceUserId}
                  absenceReasons={lookups?.absenceReasons ?? []}
                />
              )}

              {mainTab === 'calendar' && <ServiceUserCalendarTab serviceUserId={serviceUserId} />}

              {mainTab === 'privacy' && <PlaceholderTab title="Privacy" />}

              {mainTab === 'dom' && <ServiceUserDomCareTab serviceUserId={serviceUserId} />}

              {mainTab === 'assessment' && (
                <ServiceUserInitialAssessmentEnterpriseTab
                  serviceUserId={serviceUserId}
                  displayName={(detail?.preferredName?.trim() || detail?.firstName || 'Client').trim()}
                />
              )}

              {mainTab === 'funding' && (
                <ServiceUserFundingTab
                  serviceUserId={serviceUserId}
                  displayName={(detail.preferredName?.trim() || [detail.firstName, detail.lastName].filter(Boolean).join(' ')).trim()}
                  contacts={detail.contacts}
                  initialNhsNumber={detail.nhsNumber}
                  initialSocialServicesRef={detail.socialServicesRef}
                  onDetailPatch={invalidateProfile}
                />
              )}

              {mainTab === 'charge-card' && <ServiceUserEditChargeCardPanel serviceUserId={serviceUserId} />}

              {mainTab === 'visits' && <ServiceUserEditVisitsPanel serviceUserId={serviceUserId} />}

              {mainTab === 'invoices' && <ServiceUserEditInvoicesPanel serviceUserId={serviceUserId} />}

              {mainTab === 'livein' && (
                <ServiceUserLiveInProfileTab serviceUserId={serviceUserId} contacts={detail.contacts ?? []} />
              )}
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
