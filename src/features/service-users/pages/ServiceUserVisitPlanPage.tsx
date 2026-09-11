import * as React from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  ClipboardList,
  History,
  Loader2,
  Pencil,
  Settings2,
  Sparkles,
  UserPlus,
} from 'lucide-react'
import {
  SERVICE_USER_MODULE_CONTENT_WIDE_CLASS,
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { ServiceUserSafetySummary } from '@/features/alerts/components/ServiceUserSafetySummary'
import { ServiceUserVisitPlanTab } from '@/features/service-users/visit-plan/ServiceUserVisitPlanTab'
import { VisitPlanDetailsView } from '@/features/service-users/visit-plan/VisitPlanDetailsView'
import { VisitPlanCalendarTab } from '@/features/service-users/visit-plan/VisitPlanCalendarTab'
import {
  useActiveServiceUserVisitPlan,
  useServiceUserVisitPlans,
} from '@/features/service-users/visit-plan/hooks'
import { useVisitPlanCareContext } from '@/features/service-users/visit-plan/hooks/useVisitPlanCareContext'
import { VisitPlanHistoryPanel } from '@/features/service-users/visit-plan/VisitPlanHistoryPanel'
import { VisitPlanVersionPicker } from '@/features/service-users/visit-plan/VisitPlanVersionPicker'
import { VisitPlanContextBanner } from '@/features/service-users/visit-plan/VisitPlanContextBanner'
import { assignedEmployeeIdsFromSlots } from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import { sortVisitPlanVersions, resolveEditableVisitPlan } from '@/features/service-users/visit-plan/visit-plan-version.util'
import {
  contentBodyClass,
  contentTitleClass,
  ContentCard,
} from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { Button } from '@/shared/ui/button'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'

type VisitPlanPageTab = 'setup' | 'summary' | 'calendar' | 'history'

const PAGE_TABS: {
  id: VisitPlanPageTab
  label: string
  hint?: string
  icon: LucideIcon
}[] = [
  {
    id: 'setup',
    label: 'Set up visits',
    hint: 'Edit the live package, activate, generate rota',
    icon: Settings2,
  },
  {
    id: 'summary',
    label: 'Call pattern',
    hint: 'Read-only summary of slots, carers, and rules',
    icon: ClipboardList,
  },
  {
    id: 'calendar',
    label: 'Visit calendar',
    hint: 'Scheduled visits and outcomes for this plan version',
    icon: CalendarDays,
  },
  {
    id: 'history',
    label: 'Versions & audit',
    hint: 'Compare plan versions and amendment history',
    icon: History,
  },
]

function resolvePageTab(search: { view?: string; detailsTab?: string }): VisitPlanPageTab {
  if (search.view !== 'details') return 'setup'
  if (search.detailsTab === 'calendar') return 'calendar'
  if (search.detailsTab === 'history') return 'history'
  return 'summary'
}

export default function ServiceUserVisitPlanPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const search = useSearch({ strict: false }) as { planId?: string; view?: string; detailsTab?: string }
  const navigate = useNavigate()
  const serviceUserId = params.serviceUserId ?? ''
  const apiConfigured = Boolean(getApiBaseUrl())

  const activeTab = resolvePageTab(search)
  const isReviewTab = activeTab !== 'setup'

  const profileQuery = useServiceUser(serviceUserId)
  const { data: plans, isLoading: plansLoading } = useServiceUserVisitPlans(serviceUserId)
  const { data: activePlan, isLoading: activeLoading } = useActiveServiceUserVisitPlan(serviceUserId)

  const loading = profileQuery.isLoading || plansLoading || activeLoading
  const error = profileQuery.error instanceof Error ? profileQuery.error.message : null

  const sortedPlans = React.useMemo(() => sortVisitPlanVersions(plans ?? []), [plans])

  const selectedPlan = React.useMemo(() => {
    if (!plansLoading && sortedPlans.length === 0) return null
    if (search.planId) {
      return sortedPlans.find((p) => p.id === search.planId) ?? null
    }
    return resolveEditableVisitPlan(sortedPlans, activePlan, undefined, !plansLoading) ?? sortedPlans[0] ?? null
  }, [search.planId, activePlan, sortedPlans, plansLoading])

  React.useEffect(() => {
    if (plansLoading) return
    const stalePlanId =
      search.planId &&
      (sortedPlans.length === 0 || !sortedPlans.some((p) => p.id === search.planId))
    if (!stalePlanId) return
    void navigate({
      to: '/service-users/$serviceUserId/visit-plan',
      params: { serviceUserId },
      search: {
        ...(search.view === 'details'
          ? {
              view: 'details' as const,
              ...(search.detailsTab === 'calendar' ? { detailsTab: 'calendar' as const } : {}),
              ...(search.detailsTab === 'history' ? { detailsTab: 'history' as const } : {}),
            }
          : {}),
      },
      replace: true,
    })
  }, [plansLoading, search, sortedPlans, navigate, serviceUserId])

  const selectPlanForConfigure = (planId: string) => {
    void navigate({
      to: '/service-users/$serviceUserId/visit-plan',
      params: { serviceUserId },
      search: { planId },
      replace: true,
    })
  }

  const careContext = useVisitPlanCareContext(
    serviceUserId,
    selectedPlan?.status ?? activePlan?.status ?? null,
  )

  const assignedEmployeeIds = React.useMemo(
    () => assignedEmployeeIdsFromSlots(selectedPlan?.slots ?? []),
    [selectedPlan?.slots],
  )
  const employeeNameById = useEmployeeNameMap(assignedEmployeeIds)

  const setPageTab = (next: VisitPlanPageTab) => {
    void navigate({
      to: '/service-users/$serviceUserId/visit-plan',
      params: { serviceUserId },
      search: {
        ...(search.planId ? { planId: search.planId } : {}),
        ...(next === 'setup'
          ? {}
          : {
              view: 'details' as const,
              ...(next === 'calendar' ? { detailsTab: 'calendar' as const } : {}),
              ...(next === 'history' ? { detailsTab: 'history' as const } : {}),
            }),
      },
      replace: true,
    })
  }

  const selectPlanForReview = (planId: string, tab: VisitPlanPageTab = activeTab) => {
    void navigate({
      to: '/service-users/$serviceUserId/visit-plan',
      params: { serviceUserId },
      search: {
        planId,
        view: 'details',
        ...(tab === 'calendar' ? { detailsTab: 'calendar' } : {}),
        ...(tab === 'history' ? { detailsTab: 'history' } : {}),
      },
      replace: true,
    })
  }

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
        detail={profileQuery.data ?? null}
        shellLayout="wide"
        actions={
          <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
            <Link to="/service-users/$serviceUserId/view" params={{ serviceUserId }}>
              <Pencil className="h-3.5 w-3.5" />
              Edit profile
            </Link>
          </Button>
        }
      />

      <ServiceUserModuleTabs serviceUserId={serviceUserId} shellLayout="wide" />

      <div className={SERVICE_USER_MODULE_CONTENT_WIDE_CLASS}>
        <PolicyContextPanel
          className="mb-4"
          moduleType="VISIT"
          recordId={selectedPlan?.id}
        />
        <ServiceUserSafetySummary
          serviceUserId={serviceUserId}
          className="mb-4"
        />
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/20 px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
            <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            Care package
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
            Assign carers
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Generate rota
          </span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 border-b border-border">
          {PAGE_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                title={tab.hint}
                className={cn(
                  '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-800 dark:border-teal-400 dark:text-teal-200'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setPageTab(tab.id)}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {tab.label}
              </button>
            )
          })}
        </div>

        {!apiConfigured ? (
          <p className="text-sm text-muted-foreground">API is not configured.</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading && isReviewTab ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading visit plan…
          </div>
        ) : activeTab === 'setup' ? (
          <ServiceUserVisitPlanTab
            serviceUserId={serviceUserId}
            planId={search.planId}
            onSelectPlan={selectPlanForConfigure}
          />
        ) : !selectedPlan ? (
          <ContentCard className="text-center">
            <h2 className={cn(contentTitleClass, 'inline-flex items-center justify-center gap-2')}>
              <ClipboardList className="h-5 w-5 text-teal-700 dark:text-teal-300" aria-hidden />
              No visit plan to show yet
            </h2>
            <p className={cn('mx-auto mt-2 max-w-md', contentBodyClass)}>
              Configure and save a draft visit plan first, then use Call pattern to review the summary.
            </p>
            <Button type="button" className="mt-6" onClick={() => setPageTab('setup')}>
              Set up visits
            </Button>
          </ContentCard>
        ) : (
          <div className="space-y-6">
            <VisitPlanVersionPicker
              plans={sortedPlans}
              selectedPlanId={selectedPlan.id}
              onSelectPlan={(planId) => selectPlanForReview(planId)}
            />

            <VisitPlanContextBanner
              plan={selectedPlan}
              context={
                activeTab === 'calendar' ? 'calendar' : activeTab === 'history' ? 'history' : 'summary'
              }
              otherPlanCount={sortedPlans.length - 1}
            />

            {activeTab === 'calendar' ? (
              <VisitPlanCalendarTab
                plan={selectedPlan}
                serviceUserId={serviceUserId}
                employeeNameById={employeeNameById}
                acceptedCarePlans={careContext.acceptedCarePlans}
              />
            ) : activeTab === 'history' ? (
              <VisitPlanHistoryPanel
                serviceUserId={serviceUserId}
                selectedPlanId={selectedPlan.id}
                onSelectPlan={(planId) => selectPlanForReview(planId, 'summary')}
              />
            ) : (
              <VisitPlanDetailsView
                plan={selectedPlan}
                acceptedCarePlans={careContext.acceptedCarePlans}
                employeeNameById={employeeNameById}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
