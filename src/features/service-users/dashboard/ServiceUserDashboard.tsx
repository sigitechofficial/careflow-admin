import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Loader2,
  Pencil,
  Zap,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import type { ServiceUserDolsRow, ServiceUserDetail } from '@/features/service-users/types'
import { useServiceUserDetail } from '@/features/service-users/hooks/useServiceUser'
import { useServiceUserCarePlan } from '@/features/service-users/hooks/useServiceUserCarePlan'
import { useBodyMapSummary } from '@/features/service-users/body-map/hooks/useBodyMap'
import {
  fetchServiceUserDomCare,
  listServiceUserEnterpriseFundings,
} from '@/features/service-users/api'
import { serviceUserKeys } from '@/features/service-users/keys'
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
import { Button } from '@/shared/ui/button'

type AttentionSeverity = 'red' | 'amber' | 'blue'

type AttentionItem = {
  id: string
  severity: AttentionSeverity
  title: string
  detail: string
  linkLabel: string
  to: string
  params: { serviceUserId: string }
  search?: Record<string, string>
}

function SimpleCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn('rounded-lg border border-border bg-card p-4 shadow-sm', className)}
    >
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
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

export function ServiceUserDashboardSimple({ serviceUserId }: { serviceUserId: string }) {
  const apiConfigured = Boolean(getApiBaseUrl())

  const { profile, documents, allergies, inventory, initialAssessment, flashMessage } =
    useServiceUserDetail(serviceUserId)
  const carePlan = useServiceUserCarePlan(serviceUserId)
  const bodyMapSummary = useBodyMapSummary(serviceUserId)

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
  const ia = initialAssessment.data ?? null
  const bm = bodyMapSummary.data
  const acceptedItems = carePlan.acceptedCarePlans.data?.items ?? []
  const fundingRows = fundingQuery.data?.rows ?? []
  const primaryFunding =
    fundingRows.find(f => f.isPrimary && f.isActive) ?? fundingRows.find(f => f.isActive) ?? null

  const highRisk = isHighRisk(detail)
  const diabetesFlag = hasDiabetesAllergyFlag(allergyRows.map(a => a.allergyName))

  const attentionItems = React.useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = []
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
    if (acceptedItems.length === 0) {
      items.push({
        id: 'care-plan',
        severity: 'amber',
        title: 'Care plan — none accepted',
        detail: 'Link care plans from initial assessment or care pathway',
        linkLabel: 'Go to care plan',
        to: '/service-users/$serviceUserId/care-plan',
        params: { serviceUserId },
      })
    }
    if (flashData) {
      items.push({
        id: 'flash',
        severity: 'amber',
        title: 'Active flash message',
        detail: flashData.message.length > 80 ? `${flashData.message.slice(0, 80)}…` : flashData.message,
        linkLabel: 'Edit message',
        to: '/service-users/$serviceUserId',
        params: { serviceUserId },
        search: { tab: 'personal' },
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
  }, [acceptedItems.length, bm, flashData, ia, serviceUserId])

  const primaryContacts = (detail?.contacts ?? [])
    .filter(c => c.isPrimary || c.isEmergencyContact)
    .slice(0, 3)
  const contactsTotal = detail?.contacts?.length ?? 0
  const addr = detail?.address

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
              to="/service-users/$serviceUserId"
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
          </div>
        ) : null}

        {attentionItems.length > 0 ? (
          <SimpleCard title="Needs attention">
            <ul className="space-y-2">
              {attentionItems.map(item => (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    params={item.params}
                    search={item.search}
                    className="flex items-start gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
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
                  </Link>
                </li>
              ))}
            </ul>
          </SimpleCard>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <SimpleCard title="Care">
            <InfoRow
              label="Care plan"
              value={acceptedItems.length > 0 ? `${acceptedItems.length} accepted` : 'None accepted'}
              tone={acceptedItems.length > 0 ? 'ok' : 'warn'}
            />
            <InfoRow label="Care type" value={detail.careType?.name ?? '—'} />
            <InfoRow label="Service start" value={formatShortUk(detail.serviceStartDate)} />
            <InfoRow
              label="Carers per visit"
              value={domCareQuery.data?.numberOfCarers ?? ia?.numberOfCarers ?? '—'}
            />
            <InfoRow label="Personal inventory" value={`${inventory.data?.length ?? 0} items`} />
            <InfoRow
              label="Initial assessment"
              value={ia ? 'On file' : 'Not recorded'}
              tone={ia ? 'ok' : 'warn'}
            />
          </SimpleCard>

          <SimpleCard title="Clinical & safety">
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
                  .map(a => a.allergyName)
                  .join(', ')}
                {allergyRows.length > 4 ? '…' : ''}
              </p>
            ) : null}
            {diabetesFlag ? (
              <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                Diabetes-related allergy on file — inform prescribing clinicians
              </p>
            ) : null}
            <InfoRow label="Body map — active" value={bm?.activeCount ?? 0} />
            <InfoRow
              label="Body map — reviews due"
              value={bm?.reviewDueCount ?? 0}
              tone={(bm?.reviewDueCount ?? 0) > 0 ? 'danger' : undefined}
            />
            {legal?.dnacprInPlace ? (
              <InfoRow label="DNACPR" value="In place" tone="warn" />
            ) : null}
          </SimpleCard>

          <SimpleCard title="People & admin">
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
              label="Funding"
              value={primaryFunding?.fundingType.name ?? detail.fundingType?.name ?? '—'}
            />
            <InfoRow
              label="Funding review"
              value={formatShortUk(primaryFunding?.reviewDate)}
            />
            <InfoRow label="Contacts" value={`${contactsTotal} on file`} />
            {primaryContacts.length > 0 ? (
              <ul className="mt-1 space-y-1.5 text-xs text-muted-foreground">
                {primaryContacts.map(c => (
                  <li key={c.id}>
                    {c.firstName} {c.lastName ?? ''}
                    {c.isPrimary ? ' · Primary' : ''}
                    {c.phone ? ` · ${c.phone}` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </SimpleCard>

          <SimpleCard title="Documents">
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
            <QuickLink to="/service-users/$serviceUserId/observations" serviceUserId={serviceUserId}>
              Observations
            </QuickLink>
            <QuickLink to="/service-users/$serviceUserId/care-plan" serviceUserId={serviceUserId}>
              Care plan
            </QuickLink>
            <QuickLink to="/service-users/$serviceUserId/medication" serviceUserId={serviceUserId}>
              Medication
            </QuickLink>
            <QuickLink to="/service-users/$serviceUserId/body-map" serviceUserId={serviceUserId}>
              Body map
            </QuickLink>
            <QuickLink
              to="/service-users/$serviceUserId"
              serviceUserId={serviceUserId}
              search={{ tab: 'calendar' }}
            >
              Calendar
            </QuickLink>
            <QuickLink
              to="/service-users/$serviceUserId"
              serviceUserId={serviceUserId}
              search={{ tab: 'documents' }}
            >
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
