import * as React from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import {
  ArrowRight,
  Loader2,
  Pencil,
  Zap,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn, formatDateTime } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import type { ServiceUserDolsRow, ServiceUserDetail, ServiceUserListRow } from '@/features/service-users/types'
import { useServiceUserDetail } from '@/features/service-users/hooks/useServiceUser'
import { useServiceUserCarePlan } from '@/features/service-users/hooks/useServiceUserCarePlan'
import { useCarePlanInstances, useCarePlanReviewSummary } from '@/features/service-users/care-plans/hooks/useServiceUserCarePlanInstances'
import { useBodyMapSummary } from '@/features/service-users/body-map/hooks/useBodyMap'
import { useServiceUserMedications } from '@/features/service-users/hooks/useServiceUserMedications'
import { useWorkingServiceUserVisitPlan } from '@/features/service-users/visit-plan/hooks'
import {
  parseWeeklyContractedHours,
  summarizeVisitPlanWeeklyHours,
} from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'
import { useEcmExceptions } from '@/features/ecm/hooks/useEcm'
import { useServiceUserVisitActivity } from '@/features/service-users/activity/hooks'
import {
  fetchServiceUserDomCare,
  listServiceUserEnterpriseFundings,
} from '@/features/service-users/api'
import { serviceUserKeys } from '@/features/service-users/keys'
import { useAuthStore } from '@/features/auth/store'
import { homeAccessMethodLabel } from '@/features/service-users/home-access'
import {
  employeeDisplayName,
  formatFlashUntil,
  formatShortUk,
  hasDiabetesAllergyFlag,
  riskMeterPercent,
} from '@/features/service-users/dashboard/service-user-dashboard-utils'
import {
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { EditFlashMessageDialog } from '@/features/service-users/components/EditFlashMessageDialog'
import { Button } from '@/shared/ui/button'
import { ServiceUserAllergiesManageDialog } from '@/features/service-users/components/ServiceUserAllergiesManageDialog'
import { Progress } from '@/shared/ui/misc'
import {
  serviceUserMissingItems,
  serviceUserProfileCompletion,
} from '@/features/service-users/dashboard/service-user-missing-items'
import { serviceUserChecklist } from '@/features/service-users/dashboard/service-user-checklist'
import {
  GetReadyForCare,
  OverviewCard,
  OverviewLink,
  PathwaysRow,
  Row,
  SafeguardingTile,
  SafetyTile,
  StatusTile,
  SurveysTile,
  profileTab,
  valueOrDash,
} from '@/features/service-users/dashboard/ServiceUserOverviewParts'
import { useResolveServiceUserChargeCard } from '@/features/billing/hooks/useChargeCards'
type AttentionSeverity = 'red' | 'amber' | 'blue'

type AttentionItem = {
  id: string
  severity: AttentionSeverity
  title: string
  detail: string
  linkLabel: string
  to?: string
  params?: { serviceUserId: string }
  search?: Record<string, string>
  /** Same-page action (e.g. scroll to flash). Prefer over Link when already on target. */
  onAction?: () => void
}

const ECM_OPEN_LIFECYCLES = new Set([
  'DETECTED',
  'ALERT_GENERATED',
  'ASSIGNED',
  'ACKNOWLEDGED',
  'INVESTIGATING',
  'ACTION_TAKEN',
])

function DocumentOpenLink({
  storedUrl,
  label = 'View',
}: {
  storedUrl: string | null | undefined
  label?: string
}) {
  const href = resolveMediaUrl(storedUrl)
  if (!href) return <span className="text-muted-foreground">—</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-teal-700 hover:underline dark:text-teal-400"
    >
      {label}
    </a>
  )
}

function visitStatusLabel(status: string): string {
  if (status === 'PARTIALLY_COMPLETED') return 'Partially completed'
  if (status === 'COMPLETED') return 'Completed'
  return status.replace(/_/g, ' ')
}

function formatPlannedHours(minutes: number): string {
  if (minutes <= 0) return '0h'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function isFundingReviewOverdue(iso: string | null | undefined): boolean {
  if (!iso) return false
  const day = iso.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const today = new Date().toISOString().slice(0, 10)
  return day < today
}

function listRowFromDetail(detail: ServiceUserDetail): ServiceUserListRow {
  return {
    id: detail.id,
    serviceUserNumber: detail.serviceUserNumber ?? null,
    firstName: detail.firstName,
    lastName: detail.lastName,
    preferredName: detail.preferredName ?? null,
    dateOfBirth: detail.dateOfBirth ?? null,
    isActive: detail.isActive,
    serviceStartDate: detail.serviceStartDate ?? null,
    profilePhotoUrl: detail.profilePhotoUrl ?? null,
    title: detail.title ?? null,
    gender: detail.gender ?? null,
    status: detail.status ?? null,
    careType: detail.careType ?? null,
    fundingType: detail.fundingType ?? null,
    riskLevel: detail.riskLevel ?? null,
    location: detail.location,
    keyWorker: detail.keyWorker,
    namedNurse: detail.namedNurse,
    hasActiveFlashMessage: true,
  }
}

export function ServiceUserDashboardSimple({ serviceUserId }: { serviceUserId: string }) {
  const apiConfigured = Boolean(getApiBaseUrl())
  const search = useSearch({ strict: false }) as { focus?: string }
  const flashSectionRef = React.useRef<HTMLDivElement>(null)
  const [flashDialogOpen, setFlashDialogOpen] = React.useState(false)
  const canReadPathways = useAuthStore(s => s.can)('specialist_pathways.read')
  const canReadSafeguarding = useAuthStore(s => s.can)('safeguarding.read')

  const { profile, documents, allergies, inventory, initialAssessment, flashMessage } =
    useServiceUserDetail(serviceUserId)
  const carePlan = useServiceUserCarePlan(serviceUserId)
  const carePlanInstances = useCarePlanInstances(serviceUserId, apiConfigured)
  const carePlanReviewSummary = useCarePlanReviewSummary(serviceUserId, apiConfigured)
  const bodyMapSummary = useBodyMapSummary(serviceUserId)
  const visitPlanQuery = useWorkingServiceUserVisitPlan(serviceUserId)
  const medicationsQuery = useServiceUserMedications(serviceUserId)
  const ecmExceptionsQuery = useEcmExceptions({
    limit: 50,
    serviceUserId,
    enabled: apiConfigured && Boolean(serviceUserId),
  })
  const activityQuery = useServiceUserVisitActivity(serviceUserId, { page: 1, limit: 5 })

  const fundingQuery = useQuery({
    queryKey: [...serviceUserKeys.detail(serviceUserId), 'enterprise-funding'],
    queryFn: () => listServiceUserEnterpriseFundings(serviceUserId, { limit: 20 }),
    enabled: Boolean(serviceUserId) && apiConfigured,
  })

  const chargeCardQuery = useResolveServiceUserChargeCard(serviceUserId, apiConfigured)

  const domCareQuery = useQuery({
    queryKey: [...serviceUserKeys.detail(serviceUserId), 'dom-care'],
    queryFn: () => fetchServiceUserDomCare(serviceUserId),
    enabled: Boolean(serviceUserId) && apiConfigured,
  })

  const detail: ServiceUserDetail | null = profile.data ?? null
  const loading = profile.isLoading
  const error = profile.error instanceof Error ? profile.error.message : null

  const legal = documents.data?.legal
  const allergyRows = allergies.data ?? []
  const flashData = flashMessage.data ?? null

  // Scroll to flash banner when opened via ?focus=flash (module tab / deep link).
  React.useEffect(() => {
    if (search.focus !== 'flash' || loading || !flashData) return
    const el = flashSectionRef.current
    if (!el) return
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2')
      window.setTimeout(() => {
        el.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2')
      }, 1600)
    }, 150)
    return () => window.clearTimeout(t)
  }, [search.focus, loading, flashData])

  const ia = initialAssessment.data ?? null
  const bm = bodyMapSummary.data
  const acceptedItems = carePlan.acceptedCarePlans.data?.items ?? []
  const instances = carePlanInstances.data ?? []
  const publishedCount = instances.filter(
    (row) =>
      row.displayStatus === 'PUBLISHED' || row.displayStatus === 'PUBLISHED_WITH_DRAFT',
  ).length
  const draftCount = instances.filter(
    (row) => row.displayStatus === 'DRAFT' || row.displayStatus === 'PUBLISHED_WITH_DRAFT',
  ).length
  const fundingRows = fundingQuery.data?.rows ?? []
  const primaryFunding =
    fundingRows.find((f) => f.isPrimary && f.isActive) ??
    fundingRows.find((f) => f.isActive) ??
    null
  const fundingReviewOverdue = isFundingReviewOverdue(primaryFunding?.reviewDate)

  const visitPlan = visitPlanQuery.data ?? null
  const weeklyHours = visitPlan
    ? summarizeVisitPlanWeeklyHours(visitPlan.slots ?? [], visitPlan.weeklyContractedHours)
    : null
  const contractedHours =
    weeklyHours?.contractedHours ??
    parseWeeklyContractedHours(visitPlan?.weeklyContractedHours) ??
    null
  const carersPerVisit =
    visitPlan?.numberOfCarers ??
    domCareQuery.data?.numberOfCarers ??
    ia?.numberOfCarers ??
    null
  const enabledSlots = (visitPlan?.slots ?? []).filter((s) => s.isEnabled).length

  const medications = medicationsQuery.data?.rows ?? []
  const activeMeds = medications.filter((m) => String(m.status).toUpperCase() === 'ACTIVE')
  const prnMeds = activeMeds.filter((m) => m.medicationKind === 'PRN')
  const controlledMeds = activeMeds.filter((m) => m.isControlledMedication)

  const openEcmExceptions = (ecmExceptionsQuery.data ?? []).filter((row) =>
    ECM_OPEN_LIFECYCLES.has(String(row.lifecycle).toUpperCase()),
  )
  const overdueEcm = openEcmExceptions.filter((row) => row.overdue).length

  const recentVisits = activityQuery.data?.data ?? []
  const medMissingSites = bm?.medicationAlerts?.missingBodyMapSiteCount ?? 0
  const overduePatches = bm?.medicationAlerts?.overduePatchChangeCount ?? 0

  const diabetesFlag = hasDiabetesAllergyFlag(allergyRows.map((a) => a.allergyName))
  const [allergiesOpen, setAllergiesOpen] = React.useState(false)

  const attentionItems = React.useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = []
    if (openEcmExceptions.length > 0) {
      items.push({
        id: 'ecm',
        severity: overdueEcm > 0 ? 'red' : 'amber',
        title: `ECM — ${openEcmExceptions.length} open exception${openEcmExceptions.length === 1 ? '' : 's'}`,
        detail:
          overdueEcm > 0
            ? `${overdueEcm} overdue response${overdueEcm === 1 ? '' : 's'}`
            : 'Attendance exceptions need review',
        linkLabel: 'Open ECM',
        to: '/service-users/$serviceUserId/ecm',
        params: { serviceUserId },
      })
    }
    if (bm && bm.reviewDueCount > 0) {
      items.push({
        id: 'body-map',
        severity: 'red',
        title: `Body map — ${bm.reviewDueCount} review${bm.reviewDueCount === 1 ? '' : 's'} due`,
        detail: `${bm.activeCount} active record${bm.activeCount === 1 ? '' : 's'} on chart`,
        linkLabel: 'Open body map',
        to: '/service-users/$serviceUserId/body-map',
        params: { serviceUserId },
      })
    }
    if (medMissingSites > 0 || overduePatches > 0) {
      items.push({
        id: 'body-map-meds',
        severity: 'amber',
        title: 'Body map — medication alerts',
        detail: [
          medMissingSites > 0 ? `${medMissingSites} missing site` : null,
          overduePatches > 0 ? `${overduePatches} overdue patch` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        linkLabel: 'Open body map',
        to: '/service-users/$serviceUserId/body-map',
        params: { serviceUserId },
      })
    }
    if (carePlanReviewSummary.data?.carePlanReviewRequired) {
      items.push({
        id: 'care-plan-review-required',
        severity: 'red',
        title: 'Care plan review required',
        detail: `${carePlanReviewSummary.data.overdueCount} published care plan${
          carePlanReviewSummary.data.overdueCount === 1 ? '' : 's'
        } overdue`,
        linkLabel: 'Open care plan',
        to: '/service-users/$serviceUserId/care-plan',
        params: { serviceUserId },
      })
    }
    if (acceptedItems.length === 0 && publishedCount === 0) {
      items.push({
        id: 'care-plan',
        severity: 'amber',
        title: 'Care plan — none published',
        detail:
          draftCount > 0
            ? `${draftCount} draft${draftCount === 1 ? '' : 's'} in progress`
            : 'Link care plans from initial assessment or care pathway',
        linkLabel: 'Go to care plan',
        to: '/service-users/$serviceUserId/care-plan',
        params: { serviceUserId },
      })
    }
    if (visitPlan?.status === 'SUSPENDED') {
      items.push({
        id: 'visit-plan-suspended',
        severity: 'amber',
        title: 'Visit plan — suspended',
        detail: visitPlan.pauseReasonCatalog?.name ?? 'Care package is paused',
        linkLabel: 'Open visit plan',
        to: '/service-users/$serviceUserId/visit-plan',
        params: { serviceUserId },
      })
    } else if (!visitPlan) {
      items.push({
        id: 'visit-plan-missing',
        severity: 'blue',
        title: 'Visit plan — not set up',
        detail: 'Create a visit plan to generate rota',
        linkLabel: 'Open visit plan',
        to: '/service-users/$serviceUserId/visit-plan',
        params: { serviceUserId },
      })
    }
    if (fundingReviewOverdue) {
      items.push({
        id: 'funding-review',
        severity: 'amber',
        title: 'Funding review overdue',
        detail: `Review was due ${formatShortUk(primaryFunding?.reviewDate)}`,
        linkLabel: 'Edit profile',
        to: '/service-users/$serviceUserId',
        params: { serviceUserId },
        search: { tab: 'personal' },
      })
    }
    if (flashData) {
      items.push({
        id: 'flash',
        severity: 'amber',
        title: 'Active flash message',
        detail:
          flashData.message.length > 80
            ? `${flashData.message.slice(0, 80)}…`
            : flashData.message,
        linkLabel: 'Edit message',
        onAction: () => setFlashDialogOpen(true),
      })
    }
    if (!ia) {
      items.push({
        id: 'ia-missing',
        severity: 'blue',
        title: 'Initial assessment — not on file',
        detail: 'Complete assessment before care start',
        linkLabel: 'Open assessment',
        to: '/service-users/$serviceUserId',
        params: { serviceUserId },
        search: { tab: 'assessment' },
      })
    }
    return items
  }, [
    acceptedItems.length,
    bm,
    carePlanReviewSummary.data,
    draftCount,
    flashData,
    fundingReviewOverdue,
    ia,
    medMissingSites,
    openEcmExceptions.length,
    overdueEcm,
    overduePatches,
    primaryFunding?.reviewDate,
    publishedCount,
    serviceUserId,
    visitPlan,
  ])

  const missingItems = React.useMemo(
    () =>
      detail
        ? serviceUserMissingItems({
            detail,
            allergyCount: allergyRows.length,
            activeMedicationCount: activeMeds.length,
            visitPlanStatus: visitPlan?.status,
            primaryFunding: primaryFunding
              ? { fundingTypeName: primaryFunding.fundingType?.name ?? null, reviewDate: primaryFunding.reviewDate }
              : null,
          })
        : [],
    [detail, allergyRows.length, activeMeds.length, visitPlan?.status, primaryFunding],
  )
  const profileCompletion = serviceUserProfileCompletion(missingItems)

  // A check whose data has not loaded (or is not allowed) is left out rather than shown as missing.
  const checklist = serviceUserChecklist({
    missingItems,
    funderNames: fundingQuery.isSuccess
      ? [
          ...new Set(
            fundingRows
              .filter((f) => f.isActive && f.funder?.name)
              .map((f) => f.funder!.name),
          ),
        ]
      : undefined,
    chargeCard: chargeCardQuery.isSuccess
      ? chargeCardQuery.data.chargeCard
        ? { name: chargeCardQuery.data.chargeCard.name, matched: chargeCardQuery.data.source === 'MATCHED' }
        : null
      : undefined,
    hasInitialAssessment: initialAssessment.isSuccess ? Boolean(ia) : undefined,
    carePlanCount: carePlan.acceptedCarePlans.isSuccess || carePlanInstances.isSuccess
      ? acceptedItems.length + publishedCount
      : undefined,
    visitPlanStatus: visitPlanQuery.isSuccess ? (visitPlan?.status ?? null) : undefined,
  })

  const primaryContacts = (detail?.contacts ?? [])
    .filter((c) => c.isPrimary || c.isEmergencyContact)
    .slice(0, 3)
  const contactsTotal = detail?.contacts?.length ?? 0
  const addr = detail?.address

  const carePlanSummary =
    acceptedItems.length > 0 || publishedCount > 0 || draftCount > 0
      ? [
          acceptedItems.length > 0 ? `${acceptedItems.length} accepted` : null,
          publishedCount > 0 ? `${publishedCount} published` : null,
          draftCount > 0 ? `${draftCount} draft` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : 'None published'

  if (loading) {
    return (
      <div className={SERVICE_USER_MODULE_PAGE_CLASS}>
        <ServiceUserModuleHeader serviceUserId={serviceUserId} />
        <ServiceUserModuleTabs serviceUserId={serviceUserId} />
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className={SERVICE_USER_MODULE_PAGE_CLASS}>
        <ServiceUserModuleHeader serviceUserId={serviceUserId} />
        <p className="p-6 text-sm text-destructive" role="alert">
          {error ?? 'Service user not found.'}
        </p>
      </div>
    )
  }

  const activeStatus = detail.status?.code === 'ACTIVE'
  const addressText = addr
    ? [addr.addressLine1, addr.addressLine2, addr.town, addr.postcode].filter((p) => p?.trim()).join(', ')
    : ''
  const keySafe = [addr?.keySafeLocation?.trim(), addr?.keySafeNumber?.trim()].filter(Boolean).join(' · ')
  const accessMissing = !addr?.accessMethod?.trim() || !addr?.accessInstructions?.trim()
  const hasEmergencyContact = (detail.contacts ?? []).some((c) => c.isEmergencyContact)
  const funderNames = [
    ...new Set(fundingRows.filter((f) => f.isActive && f.funder?.name).map((f) => f.funder!.name)),
  ]
  const chargeCardName = chargeCardQuery.data?.chargeCard?.name ?? null
  const dols = documents.data?.dols ?? []
  // Shown in the status strip or the checklist, so left out of "Needs attention".
  const attentionShown = attentionItems.filter(
    (item) => !['care-plan', 'visit-plan-missing', 'ia-missing', 'flash'].includes(item.id),
  )

  return (
    <div
      className={SERVICE_USER_MODULE_PAGE_CLASS}
      data-testid="service-user-dashboard"
    >
      <ServiceUserModuleHeader
        serviceUserId={serviceUserId}
        detail={detail}
        badges={
          detail.status?.name ? (
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                activeStatus
                  ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                  : 'bg-muted text-foreground',
              )}
            >
              {detail.status.name}
            </span>
          ) : null
        }
        actions={
          <>
            <div
              className="w-48"
              title={`${profileCompletion.completed} of ${profileCompletion.total} profile checks complete`}
              data-testid="service-user-profile-completion"
            >
              <p className="mb-1 flex justify-between text-xs text-muted-foreground">
                Profile complete <span className="font-semibold text-foreground">{profileCompletion.percent}%</span>
              </p>
              <Progress
                value={profileCompletion.percent}
                size="sm"
                variant={profileCompletion.percent === 100 ? 'success' : profileCompletion.percent >= 60 ? 'default' : 'warning'}
                aria-label="Profile completion"
              />
            </div>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link
                to="/service-users/$serviceUserId/profile"
                params={{ serviceUserId }}
                search={{ tab: 'personal' }}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit profile
              </Link>
            </Button>
          </>
        }
      />
      <ServiceUserModuleTabs serviceUserId={serviceUserId} />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        {!apiConfigured ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Set VITE_API_BASE_URL to load live dashboard data.
          </p>
        ) : null}

        {/* Status strip */}
        <section aria-label="Status" className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <div ref={flashSectionRef} className="rounded-xl" role={flashData ? 'alert' : undefined}>
            <StatusTile
              label="Flash message"
              value={
                flashData ? (
                  <>
                    <Zap className="mr-1 inline h-3.5 w-3.5 text-amber-700" aria-hidden />
                    {flashData.message}
                    <span className="block text-xs font-normal text-muted-foreground">
                      Until {formatFlashUntil(flashData.displayUntil)}
                    </span>
                  </>
                ) : (
                  'None active'
                )
              }
              attention={Boolean(flashData)}
              testId="service-user-dashboard-flash"
              action={
                <button type="button" className="text-[13px] font-medium text-teal-700 hover:underline dark:text-teal-400" onClick={() => setFlashDialogOpen(true)}>
                  {flashData ? 'Edit' : 'Add'}
                </button>
              }
            />
          </div>
          <SafetyTile serviceUserId={serviceUserId} />
          <SurveysTile serviceUserId={serviceUserId} />
          {canReadSafeguarding ? <SafeguardingTile serviceUserId={serviceUserId} /> : null}
        </section>

        <div className="flex flex-wrap items-start gap-5">
          {/* Main column */}
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
            {attentionShown.length > 0 ? (
              <OverviewCard title="Needs attention">
                <ul className="mt-1 space-y-2">
                  {attentionShown.map((item) => {
                    const rowClass =
                      'flex w-full items-start gap-3 rounded-[10px] border border-border px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40'
                    const body = (
                      <>
                        <span
                          className={cn(
                            'mt-1 h-8 w-1 shrink-0 rounded-full',
                            item.severity === 'red' && 'bg-red-500',
                            item.severity === 'amber' && 'bg-amber-500',
                            item.severity === 'blue' && 'bg-blue-500',
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="mt-0.5 text-[13px] text-muted-foreground">{item.detail}</p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-teal-700 dark:text-teal-400">
                          {item.linkLabel}
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </>
                    )
                    return (
                      <li key={item.id}>
                        {item.onAction ? (
                          <button type="button" onClick={item.onAction} className={rowClass}>
                            {body}
                          </button>
                        ) : (
                          <Link to={item.to!} params={item.params} search={item.search} className={rowClass}>
                            {body}
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </OverviewCard>
            ) : null}

            <GetReadyForCare serviceUserId={serviceUserId} items={checklist} />

            {/* Summary cards */}
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              <OverviewCard
                title="Visits"
                action={
                  <OverviewLink serviceUserId={serviceUserId} target={{ to: '/service-users/$serviceUserId/visit-plan' }}>
                    Visit plan →
                  </OverviewLink>
                }
              >
                <Row
                  label="Status"
                  value={
                    visitPlan?.status
                      ? `${visitPlan.status.charAt(0)}${visitPlan.status.slice(1).toLowerCase()}`
                      : 'Not set up'
                  }
                  tone={visitPlan?.status === 'ACTIVE' ? 'ok' : visitPlan && visitPlan.status !== 'SUSPENDED' ? undefined : 'warn'}
                />
                <Row label="Carers per visit" {...valueOrDash(carersPerVisit != null ? String(carersPerVisit) : null)} />
                {visitPlan ? <Row label="Enabled calls" value={enabledSlots} /> : null}
                <Row label="Weekly contracted" {...valueOrDash(contractedHours != null ? `${contractedHours}h` : null)} />
                <Row
                  label="Weekly planned"
                  value={weeklyHours ? formatPlannedHours(weeklyHours.plannedMinutes) : '—'}
                  tone={weeklyHours?.isOverContract ? 'warn' : weeklyHours ? undefined : 'muted'}
                />
                <Row
                  label="Recent visits"
                  value={activityQuery.isLoading ? '…' : recentVisits.length === 0 ? 'None yet' : `${recentVisits.length} recent`}
                  tone={recentVisits.length === 0 ? 'muted' : undefined}
                />
                {recentVisits.length > 0 ? (
                  <ul className="mt-1 space-y-1.5">
                    {recentVisits.slice(0, 3).map((visit) => (
                      <li key={visit.id} className="flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="min-w-0 truncate text-foreground">
                          {visit.visitName}
                          <span className="text-muted-foreground"> · {formatDateTime(visit.scheduledStartDateTime)}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{visitStatusLabel(visit.status)}</span>
                      </li>
                    ))}
                    <li>
                      <OverviewLink serviceUserId={serviceUserId} target={{ to: '/service-users/$serviceUserId/activity' }}>
                        All activity →
                      </OverviewLink>
                    </li>
                  </ul>
                ) : null}
              </OverviewCard>

              <OverviewCard
                title="Care delivery"
                action={
                  <OverviewLink serviceUserId={serviceUserId} target={{ to: '/service-users/$serviceUserId/care-plan' }}>
                    Care plan →
                  </OverviewLink>
                }
              >
                <Row
                  label="Care plans"
                  value={carePlanSummary}
                  tone={publishedCount > 0 || acceptedItems.length > 0 ? 'ok' : 'warn'}
                />
                <Row label="Initial assessment" value={ia ? 'On file' : 'Not recorded'} tone={ia ? 'ok' : 'warn'} />
                <Row label="Care type" {...valueOrDash(detail.careType?.name)} />
                <Row label="Service start" {...valueOrDash(detail.serviceStartDate ? formatShortUk(detail.serviceStartDate) : null)} />
                <Row label="Personal inventory" value={`${inventory.data?.length ?? 0} items`} />
                {canReadPathways ? <PathwaysRow serviceUserId={serviceUserId} /> : null}
              </OverviewCard>

              <OverviewCard
                title="Medication"
                action={
                  <OverviewLink serviceUserId={serviceUserId} target={{ to: '/service-users/$serviceUserId/medication' }}>
                    Meds →
                  </OverviewLink>
                }
              >
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {[
                    { n: activeMeds.length, label: 'Active' },
                    { n: prnMeds.length, label: 'PRN' },
                    { n: controlledMeds.length, label: 'Controlled' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg bg-muted/60 p-3">
                      <div className="text-[22px] font-semibold tabular-nums text-foreground">{s.n}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[13px] text-muted-foreground">
                  {activeMeds.length > 0
                    ? `${activeMeds
                        .slice(0, 3)
                        .map((m) => m.medicationName)
                        .join(', ')}${activeMeds.length > 3 ? '…' : ''}`
                    : 'No active medicines on file.'}
                </p>
              </OverviewCard>

              <OverviewCard
                title="Clinical & safety"
                action={
                  <button
                    type="button"
                    className="text-[13px] font-medium text-teal-700 hover:underline dark:text-teal-400"
                    onClick={() => setAllergiesOpen(true)}
                  >
                    Allergies →
                  </button>
                }
              >
                <Row label="Risk level" value={detail.riskLevel?.name ?? 'Not set'} tone={detail.riskLevel ? undefined : 'warn'} />
                {detail.riskLevel ? (
                  <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                      style={{ width: `${riskMeterPercent(detail)}%` }}
                    />
                  </div>
                ) : null}
                <Row label="Allergies" value={`${allergyRows.length} recorded`} />
                {allergyRows.length > 0 ? (
                  <p className="pb-2 text-xs text-muted-foreground">
                    {allergyRows
                      .slice(0, 4)
                      .map((a) => a.allergyName)
                      .join(', ')}
                    {allergyRows.length > 4 ? '…' : ''}
                  </p>
                ) : null}
                {diabetesFlag ? (
                  <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                    Diabetes flag from allergy names — confirm clinically
                  </p>
                ) : null}
                <Row label="Body map — active" value={bm?.activeCount ?? 0} />
                <Row
                  label="Body map — reviews due"
                  value={bm?.reviewDueCount ?? 0}
                  tone={(bm?.reviewDueCount ?? 0) > 0 ? 'danger' : undefined}
                />
                {medMissingSites > 0 || overduePatches > 0 ? (
                  <Row
                    label="Body map — med alerts"
                    value={`${medMissingSites} missing site · ${overduePatches} overdue patch`}
                    tone="warn"
                  />
                ) : null}
                {legal?.dnacprInPlace ? <Row label="DNACPR" value="In place" tone="warn" /> : null}
              </OverviewCard>

              <OverviewCard
                title="Attendance (ECM)"
                action={
                  <OverviewLink serviceUserId={serviceUserId} target={{ to: '/service-users/$serviceUserId/ecm' }}>
                    ECM →
                  </OverviewLink>
                }
              >
                <Row
                  label="Open exceptions"
                  value={openEcmExceptions.length}
                  tone={openEcmExceptions.length > 0 ? 'warn' : undefined}
                />
                <Row label="Overdue responses" value={overdueEcm} tone={overdueEcm > 0 ? 'danger' : undefined} />
                <p className="mt-2 text-[13px] text-muted-foreground">
                  {openEcmExceptions[0] ? `Latest: ${openEcmExceptions[0].title}` : 'No open attendance exceptions.'}
                </p>
              </OverviewCard>

              <OverviewCard
                title="Legal documents"
                action={
                  <OverviewLink serviceUserId={serviceUserId} target={{ to: '/service-users/$serviceUserId/documents' }}>
                    Documents →
                  </OverviewLink>
                }
              >
                <Row label="DNACPR" value={<DocumentOpenLink storedUrl={legal?.dnacprCertificateUrl} />} />
                <Row label="LPA — Health & welfare" value={<DocumentOpenLink storedUrl={legal?.lpaHealthCertificateUrl} />} />
                <Row label="LPA — Finance" value={<DocumentOpenLink storedUrl={legal?.lpaFinanceCertificateUrl} />} />
                {dols.length > 0 ? (
                  dols.slice(0, 2).map((row: ServiceUserDolsRow) => (
                    <Row
                      key={row.id}
                      label={`DoLS${row.isCurrent ? ' (current)' : ''}`}
                      value={
                        <DocumentOpenLink
                          storedUrl={row.certificateUrl}
                          label={row.isCurrent ? formatShortUk(row.renewalDate) : 'View'}
                        />
                      }
                    />
                  ))
                ) : (
                  <Row label="DoLS" value="No records" />
                )}
              </OverviewCard>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
            <OverviewCard title="Home & access">
              <p className={cn('text-sm leading-relaxed', addressText ? 'text-foreground' : 'text-muted-foreground')}>
                {addressText || detail.location?.name || 'No address recorded'}
              </p>
              <div className="mt-3">
                <Row label="Access method" {...valueOrDash(homeAccessMethodLabel(addr?.accessMethod))} />
                <Row label="Key safe" {...valueOrDash(keySafe)} />
                <Row label="How to enter" {...valueOrDash(addr?.accessInstructions)} />
              </div>
              <OverviewLink
                serviceUserId={serviceUserId}
                target={profileTab('dom', 'How to enter the home')}
                className="mt-2.5 inline-block"
              >
                {accessMissing ? 'Add access details' : 'Edit access details'}
              </OverviewLink>
            </OverviewCard>

            <OverviewCard
              title="People"
              action={
                <OverviewLink serviceUserId={serviceUserId} target={profileTab('contacts')}>
                  Contacts →
                </OverviewLink>
              }
            >
              <Row
                label="Key worker"
                value={
                  employeeDisplayName(detail.keyWorker) ?? (
                    <OverviewLink serviceUserId={serviceUserId} target={profileTab('personal', 'Key Worker (search employees)')}>
                      Assign
                    </OverviewLink>
                  )
                }
              />
              <Row label="Named nurse" {...valueOrDash(employeeDisplayName(detail.namedNurse))} />
              {primaryContacts.length > 0 ? (
                primaryContacts.map((c) => (
                  <div key={c.id} className="mt-2.5 rounded-lg bg-muted/60 p-3">
                    <div className="text-sm font-medium text-foreground">
                      {c.firstName} {c.lastName ?? ''}
                    </div>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">
                      {[c.isPrimary ? 'Primary contact' : null, c.isEmergencyContact ? 'Emergency contact' : null, c.phone]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                    {!hasEmergencyContact && c.isPrimary ? (
                      <div className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">Not marked as emergency contact</div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="mt-2.5 text-[13px] text-muted-foreground">
                  {contactsTotal > 0 ? `${contactsTotal} contacts on file` : 'No contacts recorded.'}
                </p>
              )}
            </OverviewCard>

            <OverviewCard
              title="Funding"
              action={
                <OverviewLink serviceUserId={serviceUserId} target={profileTab('funding')}>
                  Funding →
                </OverviewLink>
              }
            >
              <Row label="Route" {...valueOrDash(primaryFunding?.fundingType.name ?? detail.fundingType?.name)} />
              <Row
                label="Charge card"
                value={
                  chargeCardName ?? (
                    <OverviewLink serviceUserId={serviceUserId} target={profileTab('charge-card')}>
                      {chargeCardQuery.isLoading ? '…' : 'Assign'}
                    </OverviewLink>
                  )
                }
              />
              <Row
                label="Funder"
                value={
                  funderNames.length ? (
                    funderNames.join(', ')
                  ) : (
                    <OverviewLink serviceUserId={serviceUserId} target={profileTab('funding')}>
                      Add
                    </OverviewLink>
                  )
                }
              />
              <Row
                label="Review date"
                value={primaryFunding?.reviewDate ? formatShortUk(primaryFunding.reviewDate) : '—'}
                tone={fundingReviewOverdue ? 'danger' : primaryFunding?.reviewDate ? undefined : 'muted'}
              />
            </OverviewCard>

            <OverviewCard title="Record">
              <Row label="Service user #" value={detail.serviceUserNumber ?? detail.id.slice(0, 8)} />
              {detail.updatedAt ? <Row label="Profile updated" value={formatShortUk(detail.updatedAt)} /> : null}
            </OverviewCard>
          </aside>
        </div>
      </div>
      <ServiceUserAllergiesManageDialog
        serviceUserId={serviceUserId}
        open={allergiesOpen}
        onOpenChange={setAllergiesOpen}
      />
      <EditFlashMessageDialog
        user={detail ? listRowFromDetail(detail) : null}
        open={flashDialogOpen && Boolean(detail)}
        onOpenChange={setFlashDialogOpen}
      />
    </div>
  )
}
