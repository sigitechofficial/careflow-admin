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
import { homeAccessMethodLabel } from '@/features/service-users/home-access'
import {
  employeeDisplayName,
  formatFlashUntil,
  formatShortUk,
  hasDiabetesAllergyFlag,
  isHighRisk,
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
import { ServiceUserSafetySummary } from '@/features/alerts/components/ServiceUserSafetySummary'
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

function SimpleCard({
  title,
  children,
  className,
  action,
}: {
  title: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}) {
  return (
    <section
      className={cn('rounded-lg border border-border bg-card p-4 shadow-sm', className)}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function InfoRow({
  label,
  value,
  tone,
}: {
  label: string
  value: React.ReactNode
  tone?: 'ok' | 'warn' | 'danger'
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-right font-medium text-foreground',
          tone === 'ok' && 'text-green-700',
          tone === 'warn' && 'text-amber-700',
          tone === 'danger' && 'text-red-700',
        )}
      >
        {value}
      </span>
    </div>
  )
}

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

function CardLink({
  to,
  serviceUserId,
  children,
}: {
  to:
    | '/service-users/$serviceUserId/visit-plan'
    | '/service-users/$serviceUserId/care-plan'
    | '/service-users/$serviceUserId/medication'
    | '/service-users/$serviceUserId/ecm'
    | '/service-users/$serviceUserId/activity'
    | '/service-users/$serviceUserId/body-map'
  serviceUserId: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      params={{ serviceUserId }}
      className="inline-flex items-center gap-0.5 text-xs font-medium text-teal-700 hover:underline dark:text-teal-300"
    >
      {children}
      <ArrowRight className="h-3 w-3" />
    </Link>
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

  const highRisk = isHighRisk(detail)
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

  return (
    <div
      className={cn(SERVICE_USER_MODULE_PAGE_CLASS, highRisk && 'border-l-4 border-l-red-500')}
      data-testid="service-user-dashboard"
    >
      <ServiceUserModuleHeader
        serviceUserId={serviceUserId}
        detail={detail}
        badges={
          detail.status?.name ? (
            <span className="rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
              {detail.status.name}
            </span>
          ) : null
        }
        actions={
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
        }
      />
      <ServiceUserModuleTabs serviceUserId={serviceUserId} />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        {!apiConfigured ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Set VITE_API_BASE_URL to load live dashboard data.
          </p>
        ) : null}

        {flashData ? (
          <div
            ref={flashSectionRef}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:bg-amber-950/30"
            role="alert"
            data-testid="service-user-dashboard-flash"
          >
            <Zap className="h-4 w-4 shrink-0 text-amber-700" />
            <p className="min-w-0 flex-1 text-sm font-medium text-amber-950 dark:text-amber-50">
              {flashData.message}
            </p>
            <span className="text-xs text-amber-800">
              Until {formatFlashUntil(flashData.displayUntil)}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-amber-300 bg-white/80 text-amber-950"
              onClick={() => setFlashDialogOpen(true)}
            >
              Edit
            </Button>
          </div>
        ) : null}

        <ServiceUserSafetySummary
          serviceUserId={serviceUserId}
          omitFlashFromImmediate={Boolean(flashData)}
        />

        {attentionItems.length > 0 ? (
          <SimpleCard title="Needs attention">
            <ul className="space-y-2">
              {attentionItems.map((item) => {
                const rowClass =
                  'flex w-full items-start gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/50'
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
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-teal-700">
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
                      <Link
                        to={item.to!}
                        params={item.params}
                        search={item.search}
                        className={rowClass}
                      >
                        {body}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </SimpleCard>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SimpleCard
            title="Visit package"
            action={
              <CardLink to="/service-users/$serviceUserId/visit-plan" serviceUserId={serviceUserId}>
                Visit plan
              </CardLink>
            }
          >
            <InfoRow
              label="Status"
              value={visitPlan?.status ?? 'Not set up'}
              tone={
                visitPlan?.status === 'ACTIVE'
                  ? 'ok'
                  : visitPlan?.status === 'SUSPENDED'
                    ? 'warn'
                    : visitPlan
                      ? undefined
                      : 'warn'
              }
            />
            <InfoRow
              label="Carers per visit"
              value={carersPerVisit ?? '—'}
            />
            <InfoRow
              label="Enabled calls"
              value={visitPlan ? enabledSlots : '—'}
            />
            <InfoRow
              label="Weekly contracted"
              value={contractedHours != null ? `${contractedHours}h` : '—'}
            />
            <InfoRow
              label="Weekly planned"
              value={
                weeklyHours
                  ? formatPlannedHours(weeklyHours.plannedMinutes)
                  : '—'
              }
              tone={weeklyHours?.isOverContract ? 'warn' : undefined}
            />
            <InfoRow label="Effective from" value={formatShortUk(visitPlan?.effectiveFrom)} />
          </SimpleCard>

          <SimpleCard
            title="Care delivery"
            action={
              <CardLink to="/service-users/$serviceUserId/care-plan" serviceUserId={serviceUserId}>
                Care plan
              </CardLink>
            }
          >
            <InfoRow
              label="Care plans"
              value={carePlanSummary}
              tone={publishedCount > 0 || acceptedItems.length > 0 ? 'ok' : 'warn'}
            />
            <InfoRow label="Care type" value={detail.careType?.name ?? '—'} />
            <InfoRow label="Service start" value={formatShortUk(detail.serviceStartDate)} />
            <InfoRow label="Personal inventory" value={`${inventory.data?.length ?? 0} items`} />
            <InfoRow
              label="Initial assessment"
              value={ia ? 'On file' : 'Not recorded'}
              tone={ia ? 'ok' : 'warn'}
            />
          </SimpleCard>

          <SimpleCard
            title="Medication"
            action={
              <CardLink to="/service-users/$serviceUserId/medication" serviceUserId={serviceUserId}>
                Meds
              </CardLink>
            }
          >
            <InfoRow label="Active medicines" value={activeMeds.length} />
            <InfoRow label="PRN" value={prnMeds.length} />
            <InfoRow
              label="Controlled"
              value={controlledMeds.length}
              tone={controlledMeds.length > 0 ? 'warn' : undefined}
            />
            {activeMeds.length > 0 ? (
              <p className="pt-1 text-xs text-muted-foreground">
                {activeMeds
                  .slice(0, 3)
                  .map((m) => m.medicationName)
                  .join(', ')}
                {activeMeds.length > 3 ? '…' : ''}
              </p>
            ) : (
              <p className="pt-1 text-xs text-muted-foreground">No active medicines on file.</p>
            )}
          </SimpleCard>

          <SimpleCard
            title="ECM & attendance"
            action={
              <CardLink to="/service-users/$serviceUserId/ecm" serviceUserId={serviceUserId}>
                ECM
              </CardLink>
            }
          >
            <InfoRow
              label="Open exceptions"
              value={openEcmExceptions.length}
              tone={openEcmExceptions.length > 0 ? 'warn' : 'ok'}
            />
            <InfoRow
              label="Overdue responses"
              value={overdueEcm}
              tone={overdueEcm > 0 ? 'danger' : undefined}
            />
            {openEcmExceptions[0] ? (
              <p className="pt-1 text-xs text-muted-foreground">
                Latest: {openEcmExceptions[0].title}
              </p>
            ) : (
              <p className="pt-1 text-xs text-muted-foreground">No open attendance exceptions.</p>
            )}
          </SimpleCard>

          <SimpleCard
            title="Clinical & safety"
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => setAllergiesOpen(true)}>
                Manage allergies
              </Button>
            }
          >
            <InfoRow label="Risk level" value={detail.riskLevel?.name ?? 'Not set'} />
            {detail.riskLevel ? (
              <div className="mb-2 px-0.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                    style={{ width: `${riskMeterPercent(detail)}%` }}
                  />
                </div>
              </div>
            ) : null}
            <InfoRow label="Allergies" value={`${allergyRows.length} recorded`} />
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
            <InfoRow label="Body map — active" value={bm?.activeCount ?? 0} />
            <InfoRow
              label="Body map — reviews due"
              value={bm?.reviewDueCount ?? 0}
              tone={(bm?.reviewDueCount ?? 0) > 0 ? 'danger' : undefined}
            />
            {medMissingSites > 0 || overduePatches > 0 ? (
              <InfoRow
                label="Body map — med alerts"
                value={`${medMissingSites} missing site · ${overduePatches} overdue patch`}
                tone="warn"
              />
            ) : null}
            {legal?.dnacprInPlace ? (
              <InfoRow label="DNACPR" value="In place" tone="warn" />
            ) : null}
          </SimpleCard>

          <SimpleCard title="People & funding">
            <InfoRow
              label="Key worker"
              value={employeeDisplayName(detail.keyWorker) ?? 'Not assigned'}
            />
            <InfoRow
              label="Named nurse"
              value={employeeDisplayName(detail.namedNurse) ?? '—'}
            />
            <InfoRow
              label="Location"
              value={
                addr
                  ? [addr.addressLine1, addr.town, addr.postcode].filter(Boolean).join(', ') ||
                    detail.location?.name ||
                    '—'
                  : (detail.location?.name ?? '—')
              }
            />
            <InfoRow
              label="Access method"
              value={homeAccessMethodLabel(addr?.accessMethod) || '—'}
            />
            <InfoRow
              label="Key safe location"
              value={addr?.keySafeLocation?.trim() || '—'}
            />
            <InfoRow
              label="Key safe code"
              value={addr?.keySafeNumber?.trim() || '—'}
            />
            <InfoRow
              label="How to enter"
              value={addr?.accessInstructions?.trim() || '—'}
            />
            <InfoRow
              label="Funding"
              value={primaryFunding?.fundingType.name ?? detail.fundingType?.name ?? '—'}
            />
            <InfoRow
              label="Funding review"
              value={formatShortUk(primaryFunding?.reviewDate)}
              tone={fundingReviewOverdue ? 'danger' : undefined}
            />
            <InfoRow label="Contacts" value={`${contactsTotal} on file`} />
            {primaryContacts.length > 0 ? (
              <ul className="mt-1 space-y-1.5 text-xs text-muted-foreground">
                {primaryContacts.map((c) => (
                  <li key={c.id}>
                    {c.firstName} {c.lastName ?? ''}
                    {c.isPrimary ? ' · Primary' : ''}
                    {c.phone ? ` · ${c.phone}` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </SimpleCard>

          <SimpleCard
            title="Recent visits"
            className="md:col-span-2 xl:col-span-3"
            action={
              <CardLink to="/service-users/$serviceUserId/activity" serviceUserId={serviceUserId}>
                Activity
              </CardLink>
            }
          >
            {activityQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading recent visits…</p>
            ) : recentVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed visits in recent history.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {recentVisits.map((visit) => (
                  <li
                    key={visit.id}
                    className="flex flex-wrap items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{visit.visitName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(visit.scheduledStartDateTime)}
                      </p>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {visitStatusLabel(visit.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SimpleCard>

          <SimpleCard title="Legal documents">
            <InfoRow
              label="DNACPR certificate"
              value={<DocumentOpenLink storedUrl={legal?.dnacprCertificateUrl} />}
            />
            <InfoRow
              label="LPA — Health & welfare"
              value={<DocumentOpenLink storedUrl={legal?.lpaHealthCertificateUrl} />}
            />
            <InfoRow
              label="LPA — Finance"
              value={<DocumentOpenLink storedUrl={legal?.lpaFinanceCertificateUrl} />}
            />
            {(documents.data?.dols ?? []).length > 0 ? (
              (documents.data?.dols ?? []).slice(0, 2).map((row: ServiceUserDolsRow) => (
                <InfoRow
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
              <InfoRow label="DoLS" value="No records" />
            )}
          </SimpleCard>

          <SimpleCard title="Record">
            <InfoRow
              label="Service user #"
              value={detail.serviceUserNumber ?? detail.id.slice(0, 8)}
            />
            {detail.updatedAt ? (
              <InfoRow label="Profile updated" value={formatShortUk(detail.updatedAt)} />
            ) : null}
          </SimpleCard>
        </div>

        <SimpleCard title="Quick links">
          <div className="flex flex-wrap gap-2">
            <QuickLink to="/service-users/$serviceUserId/visit-plan" serviceUserId={serviceUserId}>
              Visit plan
            </QuickLink>
            <QuickLink to="/service-users/$serviceUserId/tasks-planner" serviceUserId={serviceUserId}>
              Tasks planner
            </QuickLink>
            <QuickLink to="/service-users/$serviceUserId/ecm" serviceUserId={serviceUserId}>
              ECM
            </QuickLink>
            <QuickLink to="/service-users/$serviceUserId/activity" serviceUserId={serviceUserId}>
              Activity
            </QuickLink>
            <QuickLink to="/service-users/$serviceUserId/observations" serviceUserId={serviceUserId}>
              Observations
            </QuickLink>
            <QuickLink to="/service-users/$serviceUserId/care-plan" serviceUserId={serviceUserId}>
              Care plan
            </QuickLink>
            <QuickLink to="/service-users/$serviceUserId/medication" serviceUserId={serviceUserId}>
              Medication
            </QuickLink>
            <QuickLink to="/service-users/$serviceUserId/alerts" serviceUserId={serviceUserId}>
              Medical & Alerts
            </QuickLink>
            <QuickLink to="/service-users/$serviceUserId/body-map" serviceUserId={serviceUserId}>
              Body map
            </QuickLink>
            <QuickLink to="/service-users/$serviceUserId/documents" serviceUserId={serviceUserId}>
              Documents
            </QuickLink>
            <QuickLink
              to="/service-users/$serviceUserId"
              serviceUserId={serviceUserId}
              search={{ tab: 'assessment' }}
            >
              Initial assessment
            </QuickLink>
          </div>
        </SimpleCard>
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

function QuickLink({
  children,
  to,
  serviceUserId,
  search,
}: {
  children: React.ReactNode
  to:
    | '/service-users/$serviceUserId/observations'
    | '/service-users/$serviceUserId/care-plan'
    | '/service-users/$serviceUserId/medication'
    | '/service-users/$serviceUserId/body-map'
    | '/service-users/$serviceUserId/documents'
    | '/service-users/$serviceUserId/visit-plan'
    | '/service-users/$serviceUserId/tasks-planner'
    | '/service-users/$serviceUserId/ecm'
    | '/service-users/$serviceUserId/activity'
    | '/service-users/$serviceUserId/alerts'
    | '/service-users/$serviceUserId'
  serviceUserId: string
  search?: Record<string, string>
}) {
  return (
    <Link
      to={to}
      params={{ serviceUserId }}
      search={search}
      className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
    >
      {children}
    </Link>
  )
}
