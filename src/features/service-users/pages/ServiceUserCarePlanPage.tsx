import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ChevronDown, Loader2, Search } from 'lucide-react'
import {
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { cn, formatDate } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { serviceUserGivenName } from '@/features/service-users/lib/service-user-display'
import { CarePlanCard } from '@/features/service-users/care-plan/CarePlanCard'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { ServiceUserSafetySummary } from '@/features/alerts/components/ServiceUserSafetySummary'
import { CarePlanDeclinedHistory } from '@/features/service-users/care-plan/CarePlanDeclinedHistory'
import type { ServiceUserDetail } from '@/features/service-users/types'
import type { SelectableForm } from '@/features/care-pathway/types/care-pathway.types'
import {
  filterCarePlansByFormSelection,
  mergeFormsWithCarePlanInstances,
  sortCarePlansByCatalogOrder,
} from '@/features/service-users/care-plan/care-plan-catalog'
import {
  AVAILABLE_CARE_PLANS_SEARCH_THRESHOLD,
  CARE_PLAN_PAGE_SECTION_ORDER,
  displayStateForForm,
  filterCarePlansByNameSearch,
  groupFormsByDisplayState,
  groupPendingRecommendationsByForm,
  pendingRecommendationsForRecommendedSection,
  recommendationStatusForForm,
} from '@/features/service-users/care-plan/care-plan-display-state'
import {
  carePlanInstancesByFormId,
} from '@/features/service-users/care-plans/care-plan-instance-status'
import type { CarePlanInstance } from '@/features/service-users/care-plans/types'
import { CarePlanReviewBadge } from '@/features/service-users/care-plans/components/CarePlanReviewBadge'
import { useCarePlanInstances, useCarePlanReviewSummary } from '@/features/service-users/care-plans/hooks/useServiceUserCarePlanInstances'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useServiceUserCarePlan } from '@/features/service-users/hooks/useServiceUserCarePlan'
import { useCarePlanRecommendations } from '@/features/service-users/hooks/useCarePlanRecommendations'
import { ServiceUserAssessmentsPanel } from '@/features/service-users/assessments/components/ServiceUserAssessmentsPanel'
import {
  CarePlanIaRecommendationsBody,
  CarePlanRiskProfileBody,
  useCarePlanIaAccordionTitles,
} from '@/features/service-users/care-plan/CarePlanIaSourcePanels'
import {
  contentHelperClass,
  contentTitleClass,
} from '@/shared/ui/content-section'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'

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

function CarePlanLifecycleSection({
  title,
  description,
  testId,
  headingId,
  children,
}: {
  title: string
  description?: string
  testId: string
  headingId: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2" data-testid={testId} aria-labelledby={headingId}>
      <div>
        <h3 id={headingId} className={contentTitleClass}>
          {title}
        </h3>
        {description ? <p className={cn('mt-0.5', contentHelperClass)}>{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

function liveCardMeta(instance?: CarePlanInstance): string | null {
  if (!instance) return null
  const bits: string[] = []
  const publishedAt = instance.latestPublishedVersion?.publishedAt
  const version = instance.latestPublishedVersion?.versionNumber
  if (publishedAt) bits.push(`Published ${formatDate(publishedAt)}`)
  if (version) bits.push(`Version ${version}`)
  return bits.length ? bits.join(' · ') : null
}

const CARE_PLAN_GRID = 'grid gap-2 sm:grid-cols-2 lg:grid-cols-4'

export default function ServiceUserCarePlanPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const navigate = useNavigate()
  const serviceUserId = params.serviceUserId ?? ''
  const apiConfigured = Boolean(getApiBaseUrl())

  const profileQuery = useServiceUser(serviceUserId)
  const { formSelections, carePlanCatalogue, acceptedCarePlans } = useServiceUserCarePlan(serviceUserId)
  const instancesQuery = useCarePlanInstances(serviceUserId, apiConfigured)
  const reviewSummaryQuery = useCarePlanReviewSummary(serviceUserId, apiConfigured)
  const carePlanRecs = useCarePlanRecommendations(serviceUserId)
  const { riskTitle } = useCarePlanIaAccordionTitles(serviceUserId)
  const [availableSearch, setAvailableSearch] = React.useState('')

  const detail: ServiceUserDetail | null = profileQuery.data ?? null
  const loading =
    profileQuery.isLoading ||
    formSelections.isLoading ||
    carePlanCatalogue.isLoading ||
    acceptedCarePlans.isLoading ||
    instancesQuery.isLoading ||
    carePlanRecs.isLoading
  const error = profileQuery.error instanceof Error ? profileQuery.error.message : null

  const carePlanForms: SelectableForm[] = React.useMemo(() => {
    if (!formSelections.data || !carePlanCatalogue.data) return []
    const selectedIds = formSelections.data.carePlans.map((s) => s.formId)
    const selectionFiltered = filterCarePlansByFormSelection(
      carePlanCatalogue.data,
      selectedIds,
    )
    // Published / draft instances must appear in Live / In Progress even when the
    // form is outside company Form Selection (IA recommendations are not gated).
    return mergeFormsWithCarePlanInstances(
      selectionFiltered,
      carePlanCatalogue.data,
      instancesQuery.data ?? [],
    )
  }, [formSelections.data, carePlanCatalogue.data, instancesQuery.data])

  const name = serviceUserGivenName(detail)

  const acceptedFormIds = React.useMemo(
    () => new Set((acceptedCarePlans.data?.items ?? []).map((item) => item.formId)),
    [acceptedCarePlans.data],
  )

  const instancesByFormId = React.useMemo(
    () => carePlanInstancesByFormId(instancesQuery.data),
    [instancesQuery.data],
  )

  const recommendations = carePlanRecs.recommendations

  const buckets = React.useMemo(() => {
    const grouped = groupFormsByDisplayState(carePlanForms, (form) =>
      displayStateForForm(
        form.id,
        instancesByFormId.get(form.id)?.displayStatus,
        recommendations,
        acceptedFormIds,
      ),
    )
    return {
      recommended: sortCarePlansByCatalogOrder(grouped.recommended),
      inProgress: sortCarePlansByCatalogOrder(grouped.inProgress),
      live: sortCarePlansByCatalogOrder(grouped.live),
      available: sortCarePlansByCatalogOrder(grouped.available),
    }
  }, [carePlanForms, instancesByFormId, recommendations, acceptedFormIds])

  React.useEffect(() => {
    if (!import.meta.env.DEV || loading) return
    // Temporary overview debug — remove once Live refresh is confirmed in QA.
    // eslint-disable-next-line no-console
    console.debug('[Care Plans overview]', {
      recommended: groupPendingRecommendationsByForm(
        pendingRecommendationsForRecommendedSection(
          recommendations,
          new Set(buckets.recommended.map((f) => f.id)),
          new Set(carePlanForms.map((f) => f.id)),
        ),
      ).map((g) => g.name),
      inProgress: buckets.inProgress.map((f) => f.name),
      live: buckets.live.map((f) => f.name),
      instances: (instancesQuery.data ?? []).map((row) => ({
        formName: row.formName,
        status: row.status,
        displayStatus: row.displayStatus,
        carePathwayFormId: row.carePathwayFormId,
      })),
    })
  }, [
    loading,
    buckets.recommended,
    buckets.inProgress,
    buckets.live,
    carePlanForms,
    recommendations,
    instancesQuery.data,
  ])

  const cataloguedFormIds = React.useMemo(
    () => new Set(carePlanForms.map((form) => form.id)),
    [carePlanForms],
  )
  const recommendedFormIds = React.useMemo(
    () => new Set(buckets.recommended.map((form) => form.id)),
    [buckets.recommended],
  )

  const visiblePendingRecs = React.useMemo(
    () =>
      pendingRecommendationsForRecommendedSection(
        recommendations,
        recommendedFormIds,
        cataloguedFormIds,
      ),
    [recommendations, recommendedFormIds, cataloguedFormIds],
  )

  const filteredAvailable = React.useMemo(
    () => filterCarePlansByNameSearch(buckets.available, availableSearch),
    [buckets.available, availableSearch],
  )

  const openCarePlanForm = (formId: string) => {
    void navigate({
      to: '/service-users/$serviceUserId/care-plan/forms/$formId',
      params: { serviceUserId, formId },
    })
  }

  const recommendedCount = groupPendingRecommendationsByForm(visiblePendingRecs).length
  const inProgressCount = buckets.inProgress.length
  const liveCount = buckets.live.length

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
        <PolicyContextPanel moduleType="CARE_PLAN" className="mb-4" />
        <ServiceUserSafetySummary
          serviceUserId={serviceUserId}
          className="mb-4"
        />
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
          <div className="space-y-5" data-care-plan-section-order={CARE_PLAN_PAGE_SECTION_ORDER.join(',')}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h2 className="text-sm font-semibold sm:text-base">Care Plans</h2>
              <p
                className="flex flex-wrap items-center gap-1.5"
                data-testid="care-plans-summary"
              >
                <Badge variant="warning" size="sm" className="font-normal">
                  {recommendedCount} Recommended
                </Badge>
                <Badge variant="info" size="sm" className="font-normal">
                  {inProgressCount} In Progress
                </Badge>
                <Badge variant="success" size="sm" className="font-normal">
                  {liveCount} Live
                </Badge>
              </p>
            </div>

            <CarePlanLifecycleSection
              title="Recommended"
              description="Care plans recommended from medical conditions and the latest Initial Assessment."
              testId="recommended-care-plans"
              headingId="care-plans-recommended"
            >
              <CarePlanIaRecommendationsBody
                serviceUserId={serviceUserId}
                layout="lifecycle"
                includePendingFormIds={recommendedFormIds}
                cataloguedFormIds={cataloguedFormIds}
              />
            </CarePlanLifecycleSection>

            <CarePlanLifecycleSection
              title="In Progress"
              testId="in-progress-care-plans"
              headingId="care-plans-in-progress"
            >
              {buckets.inProgress.length === 0 ? (
                <p className={contentHelperClass}>No care plans in progress.</p>
              ) : (
                <div className={CARE_PLAN_GRID}>
                  {buckets.inProgress.map((plan) => {
                    const instance = instancesByFormId.get(plan.id)
                    const recStatus = recommendationStatusForForm(recommendations, plan.id)
                    const isDraft = instance?.displayStatus === 'DRAFT'
                    return (
                      <CarePlanCard
                        key={plan.id}
                        title={plan.name}
                        pictureUrl={plan.pictureUrl}
                        onOpen={() => openCarePlanForm(plan.id)}
                        displayState="IN_PROGRESS"
                        displayStatus={instance?.displayStatus}
                        statusLabel={isDraft ? 'Draft' : 'In Progress'}
                        review={instance?.review}
                        note={isDraft && recStatus === 'pending' ? 'Recommendation pending' : null}
                        meta={
                          instance?.updatedAt ? `Updated ${formatDate(instance.updatedAt)}` : null
                        }
                        actionLabel={isDraft ? 'Continue editing' : 'Create Plan'}
                      />
                    )
                  })}
                </div>
              )}
            </CarePlanLifecycleSection>

            <CarePlanLifecycleSection
              title="Live Care Plans"
              testId="live-care-plans"
              headingId="care-plans-live"
            >
              {buckets.live.length === 0 ? (
                <p className={contentHelperClass}>No published care plans yet.</p>
              ) : (
                <div className={CARE_PLAN_GRID}>
                  {buckets.live.map((plan) => {
                    const instance = instancesByFormId.get(plan.id)
                    const withDraft = instance?.displayStatus === 'PUBLISHED_WITH_DRAFT'
                    return (
                      <CarePlanCard
                        key={plan.id}
                        title={plan.name}
                        pictureUrl={plan.pictureUrl}
                        onOpen={() => openCarePlanForm(plan.id)}
                        displayState={withDraft ? 'LIVE_WITH_DRAFT' : 'LIVE'}
                        displayStatus={instance?.displayStatus}
                        statusLabel="Live"
                        secondaryBadge={withDraft ? 'Update in progress' : null}
                        review={instance?.review}
                        meta={liveCardMeta(instance)}
                        actionLabel={withDraft ? 'Continue editing' : 'View plan'}
                      />
                    )
                  })}
                </div>
              )}
            </CarePlanLifecycleSection>

            <section
              className="space-y-2"
              data-testid="monitor-care-plans"
              aria-labelledby="care-plans-monitor"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 id="care-plans-monitor" className={contentTitleClass}>
                    Monitor Care Plans
                  </h3>
                  <p className={cn('mt-0.5', contentHelperClass)}>
                    Review dates for this service user’s published care plans.
                  </p>
                </div>
                <Link
                  to="/care-plans/reviews"
                  className="text-sm font-medium text-[#0f766e] hover:underline"
                >
                  All care plan reviews
                </Link>
              </div>
              {reviewSummaryQuery.data?.carePlanReviewRequired ? (
                <p className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Care plan review required — at least one published care plan is overdue.
                </p>
              ) : null}
              <CarePlanAccordion title="Care plan reviews" tone="sky" defaultOpen>
                {(() => {
                  const published = (instancesQuery.data ?? []).filter(
                    (row) =>
                      row.displayStatus === 'PUBLISHED' ||
                      row.displayStatus === 'PUBLISHED_WITH_DRAFT',
                  )
                  if (published.length === 0) {
                    return (
                      <p className={contentHelperClass}>No published care plans to monitor yet.</p>
                    )
                  }
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-2 py-1.5">Care plan</th>
                            <th className="px-2 py-1.5">Next review</th>
                            <th className="px-2 py-1.5">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {published.map((row) => (
                            <tr key={row.id} className="border-t border-border">
                              <td className="px-2 py-2">
                                <button
                                  type="button"
                                  className="font-medium text-[#0f766e] hover:underline"
                                  onClick={() => openCarePlanForm(row.carePathwayFormId)}
                                >
                                  {row.formName ?? 'Care plan'}
                                </button>
                              </td>
                              <td className="px-2 py-2 text-muted-foreground">
                                {row.nextReviewDueAt ? formatDate(row.nextReviewDueAt) : '—'}
                              </td>
                              <td className="px-2 py-2">
                                <CarePlanReviewBadge review={row.review} compact />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </CarePlanAccordion>
            </section>

            <section
              className="space-y-2"
              data-testid="assessment-risk-information"
              aria-labelledby="care-plans-assessment-risk"
            >
              <div>
                <h3 id="care-plans-assessment-risk" className={contentTitleClass}>
                  Assessment & Risk Information
                </h3>
                <p className={cn('mt-0.5', contentHelperClass)}>
                  Supporting context from assessments, the risk profile, and the action register.
                </p>
              </div>
              <CarePlanAccordion title={`${name}'s Assessments`} tone="teal">
                <ServiceUserAssessmentsPanel serviceUserId={serviceUserId} serviceUserName={name} />
              </CarePlanAccordion>
              <CarePlanAccordion title={riskTitle} tone="teal">
                <CarePlanRiskProfileBody serviceUserId={serviceUserId} />
              </CarePlanAccordion>
            </section>

            <CarePlanLifecycleSection
              title="Available Care Plans"
              description="Additional care-plan templates available when needed."
              testId="available-care-plans"
              headingId="care-plans-available"
            >
              {buckets.available.length === 0 ? (
                <p className={contentHelperClass}>
                  {carePlanForms.length === 0
                    ? 'No care plans match your form selection.'
                    : 'No additional care-plan templates in your current form selection.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {buckets.available.length >= AVAILABLE_CARE_PLANS_SEARCH_THRESHOLD ? (
                    <div className="max-w-sm">
                      <label htmlFor="available-care-plans-search" className="sr-only">
                        Search care plans
                      </label>
                      <Input
                        id="available-care-plans-search"
                        type="search"
                        placeholder="Search care plans..."
                        value={availableSearch}
                        onChange={(e) => setAvailableSearch(e.target.value)}
                        leftElement={<Search className="h-4 w-4" aria-hidden />}
                        autoComplete="off"
                        data-testid="available-care-plans-search"
                      />
                    </div>
                  ) : null}
                  {filteredAvailable.length === 0 ? (
                    <p className={contentHelperClass}>No care plans match your search.</p>
                  ) : (
                    <div className={CARE_PLAN_GRID} data-testid="available-care-plans-grid">
                      {filteredAvailable.map((plan) => (
                        <CarePlanCard
                          key={plan.id}
                          title={plan.name}
                          pictureUrl={plan.pictureUrl}
                          onOpen={() => openCarePlanForm(plan.id)}
                          displayState="AVAILABLE"
                          appearance="available"
                          actionLabel="Create Plan"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CarePlanLifecycleSection>

            <div data-testid="declined-recommendations">
              <CarePlanDeclinedHistory recommendations={recommendations} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
