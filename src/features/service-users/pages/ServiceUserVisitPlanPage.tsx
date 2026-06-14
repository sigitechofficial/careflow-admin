import * as React from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Loader2, Pencil } from 'lucide-react'
import {
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { ServiceUserVisitPlanTab } from '@/features/service-users/visit-plan/ServiceUserVisitPlanTab'
import { VisitPlanDetailsView } from '@/features/service-users/visit-plan/VisitPlanDetailsView'
import { VisitPlanCalendarTab } from '@/features/service-users/visit-plan/VisitPlanCalendarTab'
import {
  useActiveServiceUserVisitPlan,
  useServiceUserVisitPlans,
} from '@/features/service-users/visit-plan/hooks'
import { useVisitPlanCareContext } from '@/features/service-users/visit-plan/hooks/useVisitPlanCareContext'
import { VisitPlanHistoryPanel } from '@/features/service-users/visit-plan/VisitPlanHistoryPanel'
import { VisitPlanCarePathwayContextPanel } from '@/features/service-users/visit-plan/VisitPlanCarePathwayContextPanel'
import { assignedEmployeeIdsFromSlots } from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import type { ServiceUserVisitPlan } from '@/features/service-users/visit-plan/types'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { Button } from '@/shared/ui/button'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'

type VisitPlanView = 'configure' | 'details'
type VisitPlanDetailsTab = 'summary' | 'calendar' | 'history'

const VIEW_TABS: { id: VisitPlanView; label: string }[] = [
  { id: 'configure', label: 'Configure' },
  { id: 'details', label: 'Plan details' },
]

const DETAILS_TABS: { id: VisitPlanDetailsTab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'history', label: 'History' },
]

function planStatusClass(status: ServiceUserVisitPlan['status']) {
  const styles: Record<ServiceUserVisitPlan['status'], string> = {
    DRAFT: 'border-amber-300 bg-amber-50 dark:bg-amber-950/30',
    ACTIVE: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30',
    SUSPENDED: 'border-orange-300 bg-orange-50 dark:bg-orange-950/30',
    ENDED: 'border-border bg-muted/30',
  }
  return styles[status]
}

export default function ServiceUserVisitPlanPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const search = useSearch({ strict: false }) as { planId?: string; view?: string; detailsTab?: string }
  const navigate = useNavigate()
  const serviceUserId = params.serviceUserId ?? ''
  const apiConfigured = Boolean(getApiBaseUrl())

  const view: VisitPlanView = search.view === 'details' ? 'details' : 'configure'
  const detailsTab: VisitPlanDetailsTab =
    view === 'details' && search.detailsTab === 'calendar'
      ? 'calendar'
      : view === 'details' && search.detailsTab === 'history'
        ? 'history'
        : 'summary'

  const profileQuery = useServiceUser(serviceUserId)
  const { data: plans, isLoading: plansLoading } = useServiceUserVisitPlans(serviceUserId)
  const { data: activePlan, isLoading: activeLoading } = useActiveServiceUserVisitPlan(serviceUserId)

  const loading = profileQuery.isLoading || plansLoading || activeLoading
  const error = profileQuery.error instanceof Error ? profileQuery.error.message : null

  const sortedPlans = React.useMemo(() => {
    const rows = [...(plans ?? [])]
    return rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [plans])

  const selectedPlan = React.useMemo(() => {
    if (search.planId) {
      return sortedPlans.find((p) => p.id === search.planId) ?? null
    }
    if (activePlan?.id) return activePlan
    const draft = sortedPlans.find((p) => p.status === 'DRAFT')
    return draft ?? sortedPlans[0] ?? null
  }, [search.planId, activePlan, sortedPlans])

  const careContext = useVisitPlanCareContext(
    serviceUserId,
    selectedPlan?.status ?? activePlan?.status ?? null,
  )

  const assignedEmployeeIds = React.useMemo(
    () => assignedEmployeeIdsFromSlots(selectedPlan?.slots ?? []),
    [selectedPlan?.slots],
  )
  const employeeNameById = useEmployeeNameMap(assignedEmployeeIds)

  const setView = (next: VisitPlanView) => {
    void navigate({
      to: '/service-users/$serviceUserId/visit-plan',
      params: { serviceUserId },
      search: {
        ...(search.planId ? { planId: search.planId } : {}),
        ...(next === 'details' ? { view: 'details' } : {}),
      },
      replace: true,
    })
  }

  const setDetailsTab = (next: VisitPlanDetailsTab) => {
    void navigate({
      to: '/service-users/$serviceUserId/visit-plan',
      params: { serviceUserId },
      search: {
        ...(search.planId ? { planId: search.planId } : {}),
        view: 'details',
        ...(next === 'calendar' ? { detailsTab: 'calendar' } : {}),
        ...(next === 'history' ? { detailsTab: 'history' } : {}),
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
        actions={
          <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
            <Link to="/service-users/$serviceUserId/view" params={{ serviceUserId }}>
              <Pencil className="h-3.5 w-3.5" />
              Edit profile
            </Link>
          </Button>
        }
      />

      <ServiceUserModuleTabs serviceUserId={serviceUserId} />

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap gap-2 border-b border-border">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                view === tab.id
                  ? 'border-teal-600 text-teal-800 dark:border-teal-400 dark:text-teal-200'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {!apiConfigured ? (
          <p className="text-sm text-muted-foreground">API is not configured.</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading && view === 'details' ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading visit plan…
          </div>
        ) : view === 'configure' ? (
          <ServiceUserVisitPlanTab serviceUserId={serviceUserId} />
        ) : !selectedPlan ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">No visit plan to show yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Configure and save a draft visit plan first, then return here to review the summary.
            </p>
            <Button type="button" className="mt-6" onClick={() => setView('configure')}>
              Configure visit plan
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedPlans.length > 1 ? (
              <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-foreground">All visit plans</h3>
                <div className="flex flex-wrap gap-2">
                  {sortedPlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() =>
                        void navigate({
                          to: '/service-users/$serviceUserId/visit-plan',
                          params: { serviceUserId },
                          search: { planId: plan.id, view: 'details' },
                        })
                      }
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        planStatusClass(plan.status),
                        selectedPlan.id === plan.id && 'ring-2 ring-sky-500 ring-offset-2',
                      )}
                    >
                      <span className="text-xs font-medium uppercase">{plan.status}</span>
                      <span className="mt-0.5 block text-muted-foreground">
                        Updated {new Date(plan.updatedAt).toLocaleDateString('en-GB')}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <VisitPlanCarePathwayContextPanel
              serviceUserId={serviceUserId}
              isLoading={careContext.isLoading}
              pathwaySteps={careContext.pathwaySteps}
              acceptedCarePlans={careContext.acceptedCarePlans}
              slots={selectedPlan.slots ?? []}
            />

            <div className="flex flex-wrap gap-2 border-b border-border">
              {DETAILS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={cn(
                    '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                    detailsTab === tab.id
                      ? 'border-sky-600 text-sky-800 dark:border-sky-400 dark:text-sky-200'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setDetailsTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {detailsTab === 'calendar' ? (
              <VisitPlanCalendarTab
                plan={selectedPlan}
                serviceUserId={serviceUserId}
                employeeNameById={employeeNameById}
                acceptedCarePlans={careContext.acceptedCarePlans}
              />
            ) : detailsTab === 'history' ? (
              <VisitPlanHistoryPanel serviceUserId={serviceUserId} selectedPlanId={selectedPlan.id} />
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
