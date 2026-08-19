import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ChevronDown, Loader2, Plus } from 'lucide-react'
import {
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { serviceUserGivenName } from '@/features/service-users/lib/service-user-display'
import { CarePlanCard } from '@/features/service-users/care-plan/CarePlanCard'
import { CarePlanIconsShowcase } from '@/features/service-users/care-plan/CarePlanIconsShowcase'
import type { ServiceUserDetail } from '@/features/service-users/types'
import type { SelectableForm } from '@/features/care-pathway/types/care-pathway.types'
import {
  filterCarePlansByFormSelection,
  isServiceUserActiveCarePlan,
  sortCarePlansByCatalogOrder,
} from '@/features/service-users/care-plan/care-plan-catalog'
import {
  carePlanInstancesByFormId,
  carePlanStatusLabel,
} from '@/features/service-users/care-plans/care-plan-instance-status'
import { useCarePlanInstances } from '@/features/service-users/care-plans/hooks/useServiceUserCarePlanInstances'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useServiceUserCarePlan } from '@/features/service-users/hooks/useServiceUserCarePlan'
import { ServiceUserAssessmentsPanel } from '@/features/service-users/assessments/components/ServiceUserAssessmentsPanel'
import {
  CarePlanIaRecommendationsBody,
  CarePlanRiskProfileBody,
  useCarePlanIaAccordionTitles,
} from '@/features/service-users/care-plan/CarePlanIaSourcePanels'

function CarePlanAccordion({
  title,
  tone,
  defaultOpen = false,
  children,
}: {
  title: string
  tone: 'teal' | 'sky'
  defaultOpen?: boolean
  children?: React.ReactNode
}) {
  const headerClass =
    tone === 'teal'
      ? 'bg-[#0f766e] text-white'
      : 'bg-[#b8d9eb] text-[#0f2942]'

  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-sm border border-border/80 bg-card shadow-sm"
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden',
          headerClass,
        )}
      >
        <span>{title}</span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      {children ? (
        <div className="border-t border-[#c5cdd6] bg-[#f8fafc] p-3 sm:p-4">{children}</div>
      ) : null}
    </details>
  )
}

export default function ServiceUserCarePlanPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const navigate = useNavigate()
  const serviceUserId = params.serviceUserId ?? ''
  const apiConfigured = Boolean(getApiBaseUrl())

  const profileQuery = useServiceUser(serviceUserId)
  const { formSelections, carePlanCatalogue, acceptedCarePlans } = useServiceUserCarePlan(serviceUserId)
  const instancesQuery = useCarePlanInstances(serviceUserId, apiConfigured)
  const { riskTitle, recTitle } = useCarePlanIaAccordionTitles(serviceUserId)

  const detail: ServiceUserDetail | null = profileQuery.data ?? null
  const loading =
    profileQuery.isLoading ||
    formSelections.isLoading ||
    carePlanCatalogue.isLoading ||
    acceptedCarePlans.isLoading ||
    instancesQuery.isLoading
  const error = profileQuery.error instanceof Error ? profileQuery.error.message : null

  const carePlanForms: SelectableForm[] = React.useMemo(() => {
    if (!formSelections.data || !carePlanCatalogue.data) return []
    const selectedIds = formSelections.data.carePlans.map((s) => s.formId)
    return filterCarePlansByFormSelection(carePlanCatalogue.data, selectedIds)
  }, [formSelections.data, carePlanCatalogue.data])

  const name = serviceUserGivenName(detail)

  const acceptedFormIds = React.useMemo(
    () => new Set((acceptedCarePlans.data?.items ?? []).map((item) => item.formId)),
    [acceptedCarePlans.data],
  )

  const instancesByFormId = React.useMemo(
    () => carePlanInstancesByFormId(instancesQuery.data),
    [instancesQuery.data],
  )

  const inactiveCarePlans = React.useMemo(
    () =>
      sortCarePlansByCatalogOrder(
        carePlanForms.filter((f) => !isServiceUserActiveCarePlan(f, acceptedFormIds)),
      ),
    [carePlanForms, acceptedFormIds],
  )

  const openCarePlanForm = (formId: string) => {
    void navigate({
      to: '/service-users/$serviceUserId/care-plan/forms/$formId',
      params: { serviceUserId, formId },
    })
  }

  const activeCarePlans = React.useMemo(
    () =>
      sortCarePlansByCatalogOrder(
        carePlanForms.filter((f) => isServiceUserActiveCarePlan(f, acceptedFormIds)),
      ),
    [carePlanForms, acceptedFormIds],
  )

  const renderCarePlanCard = (plan: SelectableForm) => {
    const instance = instancesByFormId.get(plan.id)
    return (
      <CarePlanCard
        key={plan.id}
        title={plan.name}
        pictureUrl={plan.pictureUrl}
        onOpen={() => openCarePlanForm(plan.id)}
        statusLabel={carePlanStatusLabel(instance)}
        displayStatus={instance?.displayStatus}
        review={instance?.review}
      />
    )
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
      <ServiceUserModuleHeader serviceUserId={serviceUserId} detail={detail} />

      <ServiceUserModuleTabs serviceUserId={serviceUserId} />

      <div className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-4">
        {!apiConfigured && (
          <p className="text-sm text-muted-foreground">API base URL is not configured.</p>
        )}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && !loading && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && detail && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 rounded-sm bg-teal-800 px-4 py-2.5 text-white dark:bg-teal-900">
              <h2 className="text-sm font-semibold sm:text-base">How we support {name}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Add (coming soon)"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
                  R
                </span>
              </div>
            </div>

            <CarePlanAccordion title={`${name}'s Assessments`} tone="teal">
              <ServiceUserAssessmentsPanel serviceUserId={serviceUserId} serviceUserName={name} />
            </CarePlanAccordion>
            <CarePlanAccordion title="Consent and Mental Capacity" tone="teal" />
            <CarePlanAccordion title={riskTitle} tone="teal" defaultOpen>
              <CarePlanRiskProfileBody serviceUserId={serviceUserId} />
            </CarePlanAccordion>
            <CarePlanAccordion title={recTitle} tone="teal" defaultOpen>
              <CarePlanIaRecommendationsBody serviceUserId={serviceUserId} />
            </CarePlanAccordion>

            <CarePlanAccordion title={`Active Care Plans for ${name}`} tone="sky" defaultOpen>
              {activeCarePlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {carePlanForms.length === 0
                    ? 'No care plans match your form selection.'
                    : 'No active care plans in your current form selection.'}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {activeCarePlans.map(renderCarePlanCard)}
                </div>
              )}
            </CarePlanAccordion>

            <CarePlanAccordion title={`Monitor Care Plans for ${name}`} tone="sky" />
            <CarePlanAccordion title={`Inactive Care Plans for ${name}`} tone="sky" defaultOpen>
              {inactiveCarePlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {carePlanForms.length === 0
                    ? 'No care plans match your form selection.'
                    : 'No inactive care plans in your current form selection.'}
                </p>
              ) : (
                <div
                  className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                  data-testid="inactive-care-plans-grid"
                >
                  {inactiveCarePlans.map(renderCarePlanCard)}
                </div>
              )}
            </CarePlanAccordion>

            <CarePlanAccordion title="Care plan icons (reference)" tone="sky">
              <CarePlanIconsShowcase />
            </CarePlanAccordion>
          </div>
        )}
      </div>
    </div>
  )
}
