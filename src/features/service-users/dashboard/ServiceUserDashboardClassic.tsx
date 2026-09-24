import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  ArrowRight,
  Bell,
  ScanLine,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Circle,
  ClipboardList,
  Coins,
  FileCheck,
  Files,
  HeartPulse,
  History,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MessageCircle,
  Pencil,
  Pill,
  Shield,
  Stethoscope,
  UserPen,
  Users,
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
import { homeAccessMethodLabel } from '@/features/service-users/home-access'
import { Loader2 } from 'lucide-react'
import { ServiceUserAllergiesManageDialog } from '@/features/service-users/components/ServiceUserAllergiesManageDialog'
import {
  ageFromDob,
  employeeDisplayName,
  formatDobLong,
  formatFlashUntil,
  formatShortUk,
  hasDiabetesAllergyFlag,
  initialsFromName,
  isHighRisk,
  riskMeterPercent,
} from '@/features/service-users/dashboard/service-user-dashboard-utils'

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
  icon: React.ReactNode
}

type ModuleTab = {
  id: string
  label: string
  icon: React.ReactNode
  to?: '/service-users/$serviceUserId/view' | '/service-users/$serviceUserId/observations' | '/service-users/$serviceUserId/care-plan' | '/service-users/$serviceUserId/medication' | '/service-users/$serviceUserId/body-map' | '/service-users/$serviceUserId'
  search?: Record<string, string>
  disabled?: boolean
}

const MODULE_TABS: ModuleTab[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" />, to: '/service-users/$serviceUserId/view' },
  { id: 'observations', label: 'Observations', icon: <Stethoscope className="h-4 w-4" />, to: '/service-users/$serviceUserId/observations' },
  { id: 'care-plan', label: 'Care plan', icon: <ClipboardList className="h-4 w-4" />, to: '/service-users/$serviceUserId/care-plan' },
  { id: 'medication', label: 'Medication', icon: <Pill className="h-4 w-4" />, to: '/service-users/$serviceUserId/medication' },
  { id: 'body-map', label: 'Body map', icon: <ScanLine className="h-4 w-4" />, to: '/service-users/$serviceUserId/body-map' },
  { id: 'calendar', label: 'Calendar', icon: <Calendar className="h-4 w-4" />, to: '/service-users/$serviceUserId', search: { tab: 'calendar' } },
  { id: 'documents', label: 'Documents', icon: <Files className="h-4 w-4" />, to: '/service-users/$serviceUserId', search: { tab: 'documents' } },
  { id: 'comms', label: 'Comms', icon: <MessageCircle className="h-4 w-4" />, disabled: true },
  { id: 'alerts', label: 'Alerts', icon: <Bell className="h-4 w-4" />, disabled: true },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 mt-5 flex items-center gap-1 text-sm font-semibold uppercase tracking-wider text-slate-400 first:mt-0">
      {children}
    </div>
  )
}

function BentoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-slate-200 dark:border-border bg-white p-4 shadow-sm dark:bg-card sm:p-[18px]">
      <div className="mb-3 flex items-center gap-1.5 text-base font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}

function RowItem({
  label,
  value,
  tone,
}: {
  label: string
  value: React.ReactNode
  tone?: 'ok' | 'warn' | 'danger'
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-base last:border-0 dark:border-border/60">
      <span className="text-slate-600 dark:text-slate-300 dark:text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-right font-medium text-slate-900 dark:text-slate-100 dark:text-foreground',
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

function DocRow({
  ok,
  label,
  trailing,
}: {
  ok: boolean
  label: string
  trailing?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 py-2 text-base last:border-0 dark:border-border/60">
      {ok ? (
        <CheckCircle2 className="h-[15px] w-[15px] shrink-0 text-green-700" aria-hidden />
      ) : (
        <Circle className="h-[15px] w-[15px] shrink-0 text-slate-300" aria-hidden />
      )}
      <span className={cn('flex-1', !ok && 'text-muted-foreground')}>{label}</span>
      {trailing}
    </div>
  )
}

function DocumentOpenLink({ storedUrl, label = 'View PDF' }: { storedUrl: string | null | undefined; label?: string }) {
  const href = resolveMediaUrl(storedUrl)
  if (!href) return <span className="text-sm text-muted-foreground">Not recorded</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
    >
      {label}
    </a>
  )
}

export function ServiceUserDashboardClassic({ serviceUserId }: { serviceUserId: string }) {
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

  const displayName = detail
    ? [detail.firstName, detail.lastName].filter(Boolean).join(' ').trim() || 'Service user'
    : 'Service user'
  const preferred = detail?.preferredName?.trim()
  const photoSrc = resolveMediaUrl(detail?.profilePhoto?.fileUrl ?? detail?.profilePhotoUrl)
  const age = ageFromDob(detail?.dateOfBirth ?? null)
  const highRisk = isHighRisk(detail)
  const diabetesFlag = hasDiabetesAllergyFlag(allergyRows.map(a => a.allergyName))
  const [allergiesOpen, setAllergiesOpen] = React.useState(false)

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
        icon: <ScanLine className="h-[18px] w-[18px] shrink-0 text-red-500" />,
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
        icon: <ClipboardList className="h-[18px] w-[18px] shrink-0 text-amber-500" />,
      })
    }
    if (flashData) {
      items.push({
        id: 'flash',
        severity: 'amber',
        title: 'Active flash message',
        detail: flashData.message.length > 72 ? `${flashData.message.slice(0, 72)}…` : flashData.message,
        linkLabel: 'View on overview',
        to: '/service-users/$serviceUserId/view',
        params: { serviceUserId },
        search: { focus: 'flash' },
        icon: <Zap className="h-[18px] w-[18px] shrink-0 text-amber-500" />,
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
        icon: <FileCheck className="h-[18px] w-[18px] shrink-0 text-blue-500" />,
      })
    }
    return items
  }, [acceptedItems.length, bm, flashData, ia, serviceUserId])

  const primaryContacts = (detail?.contacts ?? []).filter(c => c.isPrimary || c.isEmergencyContact).slice(0, 3)
  const contactsTotal = detail?.contacts?.length ?? 0

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#f4f6f8] dark:bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="p-6 text-base text-destructive" role="alert">
        {error ?? 'Service user not found.'}
      </div>
    )
  }

  const addr = detail.address

  return (
    <div
      className={cn('min-h-full bg-[#f4f6f8] pb-10 dark:bg-background', highRisk && 'border-l-4 border-l-red-500')}
      data-testid="service-user-dashboard"
    >
      {/* Sticky identity bar */}
      <div className="sticky top-0 z-50 bg-[#115E59] shadow-md">
        <div className="mx-auto flex max-w-[1200px] items-start gap-4 px-5 pb-3.5 pt-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/30 bg-[#1e8a82] text-2xl font-semibold tracking-tight text-white">
            {photoSrc ? (
              <img src={photoSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              initialsFromName(detail.firstName, detail.lastName)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold leading-tight text-white sm:text-[26px]">
              {displayName}
              {preferred ? (
                <span className="ml-2 text-lg font-light opacity-70">&quot;{preferred}&quot;</span>
              ) : null}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-base font-medium text-red-200">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
              DOB: {formatDobLong(detail.dateOfBirth)}
              {age != null ? ` · Age ${age}` : ''}
              {detail.nhsNumber?.trim() ? ` · NHS: ${detail.nhsNumber.trim()}` : ''}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {detail.riskLevel?.name ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-sm font-medium text-red-700">
                  <Shield className="h-2.5 w-2.5" />
                  {detail.riskLevel.name}
                </span>
              ) : null}
              {detail.careType?.name ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-sm font-medium text-white">
                  <MapPin className="h-2.5 w-2.5" />
                  {detail.careType.name}
                </span>
              ) : null}
              {detail.status?.name ? (
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium',
                    detail.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'border border-white/20 bg-white/15 text-white',
                  )}
                >
                  {detail.isActive ? '● ' : ''}
                  {detail.status.name}
                </span>
              ) : null}
              {detail.serviceUserNumber ? (
                <span className="font-mono text-sm text-white/90">#{detail.serviceUserNumber}</span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              to="/service-users/calendar"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/20"
              title="Service user tasks"
            >
              <ListChecks className="h-4 w-4" />
            </Link>
            <Link
              to="/service-users/$serviceUserId"
              params={{ serviceUserId }}
              search={{ tab: 'calendar' }}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-white/20"
            >
              <Calendar className="h-3.5 w-3.5" />
              Calendar
            </Link>
            <Link
              to="/service-users/all"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-white/20"
            >
              <Users className="h-3.5 w-3.5" />
              All users
            </Link>
            <Link
              to="/service-users/$serviceUserId"
              params={{ serviceUserId }}
              search={{ tab: 'personal' }}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 text-sm font-medium text-[#115E59] hover:bg-teal-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit profile
            </Link>
          </div>
        </div>

        {/* Clinical chips */}
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-1.5 border-t border-white/10 px-5 py-2.5">
          {legal?.dnacprInPlace ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-sm font-medium text-red-900">
              <HeartPulse className="h-3 w-3" />
              DNACPR in place
            </span>
          ) : null}
          {diabetesFlag ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-900">
              Diabetes — allergy flag
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-sm font-medium text-emerald-100">
            <MapPin className="h-3 w-3" />
            {detail.isActive ? 'Active on service' : 'Inactive'}
          </span>
          {bm && bm.reviewDueCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-900">
              <ScanLine className="h-3 w-3" />
              {bm.reviewDueCount} body map review{bm.reviewDueCount === 1 ? '' : 's'} due
            </span>
          ) : null}
          {acceptedItems.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-sm font-medium text-sky-100">
              <ClipboardList className="h-3 w-3" />
              {acceptedItems.length} care plan{acceptedItems.length === 1 ? '' : 's'} accepted
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-900">
              <ClipboardList className="h-3 w-3" />
              Care plan — set up required
            </span>
          )}
          {ia ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-sm font-medium text-sky-100">
              {ia.numberOfCarers} carer{ia.numberOfCarers === 1 ? '' : 's'} planned
            </span>
          ) : null}
        </div>
      </div>

      {/* Module strip */}
      <div className="sticky top-[116px] z-40 border-b border-slate-200 dark:border-border bg-white dark:bg-card">
        <div className="mx-auto flex max-w-[1200px] items-center gap-0.5 overflow-x-auto px-5">
          {MODULE_TABS.map(tab => {
            const inner = (
              <>
                {tab.icon}
                {tab.label}
              </>
            )
            const className = cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-base font-medium transition-colors',
              tab.id === 'overview'
                ? 'border-[#115E59] text-[#115E59]'
                : tab.disabled
                  ? 'cursor-default border-transparent text-muted-foreground opacity-60'
                  : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 dark:text-muted-foreground',
            )
            if (tab.disabled || !tab.to) {
              return (
                <span key={tab.id} className={className}>
                  {inner}
                </span>
              )
            }
            return (
              <Link
                key={tab.id}
                to={tab.to}
                params={{ serviceUserId }}
                search={tab.search}
                className={className}
              >
                {inner}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 pt-4">
        {!apiConfigured && (
          <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Set VITE_API_BASE_URL to load live dashboard data.
          </p>
        )}

        {/* Flash */}
        {flashData ? (
          <div
            className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[10px] border-[1.5px] border-amber-400 bg-amber-50 px-4 py-3 dark:bg-amber-950/30"
            role="alert"
            data-testid="service-user-dashboard-flash"
          >
            <Zap className="h-[18px] w-[18px] shrink-0 text-amber-700" />
            <p className="min-w-0 flex-1 text-base font-medium text-amber-950 dark:text-amber-50">
              <strong>Important:</strong> {flashData.message}
            </p>
            <span className="rounded-full border border-amber-400 bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-900">
              Until {formatFlashUntil(flashData.displayUntil)}
            </span>
            <Link
              to="/service-users/$serviceUserId"
              params={{ serviceUserId }}
              search={{ tab: 'personal' }}
              className="inline-flex items-center gap-1 rounded-md border border-amber-400 px-2.5 py-1 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Link>
          </div>
        ) : (
          <p className="mb-4 rounded-[10px] border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card px-4 py-2.5 text-base text-muted-foreground">
            No active flash message.
          </p>
        )}

        {/* Attention */}
        <SectionLabel>
          <Shield className="mr-1 h-3.5 w-3.5" />
          Needs attention today
        </SectionLabel>
        {attentionItems.length === 0 ? (
          <p className="mb-2 rounded-[10px] border border-slate-200 dark:border-border bg-white dark:bg-card px-4 py-6 text-center text-base text-muted-foreground">
            No urgent items right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {attentionItems.map(item => (
              <Link
                key={item.id}
                to={item.to}
                params={item.params}
                search={item.search}
                className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-slate-200 dark:border-border bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md dark:bg-card"
              >
                <div
                  className={cn(
                    'w-1 shrink-0 self-stretch rounded-sm',
                    item.severity === 'red' && 'bg-red-500',
                    item.severity === 'amber' && 'bg-amber-500',
                    item.severity === 'blue' && 'bg-blue-500',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100 dark:text-foreground">{item.title}</div>
                  <div className="mt-0.5 text-sm text-slate-600 dark:text-slate-300 dark:text-muted-foreground">{item.detail}</div>
                  <span className="mt-1.5 inline-flex items-center gap-0.5 text-sm font-medium text-teal-700">
                    {item.linkLabel}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
                {item.icon}
              </Link>
            ))}
          </div>
        )}

        {/* Bento */}
        <SectionLabel>Service overview</SectionLabel>
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          <BentoCard title="Care overview" icon={<HeartPulse className="h-3.5 w-3.5" />}>
            <RowItem
              label="Care plan status"
              value={acceptedItems.length > 0 ? `${acceptedItems.length} accepted` : 'None accepted'}
              tone={acceptedItems.length > 0 ? 'ok' : 'warn'}
            />
            <RowItem label="Care type" value={detail.careType?.name ?? '—'} />
            <RowItem label="Service start" value={formatShortUk(detail.serviceStartDate)} />
            <RowItem
              label="Carers per visit"
              value={
                domCareQuery.data?.numberOfCarers ??
                ia?.numberOfCarers ??
                '—'
              }
            />
            <RowItem label="Personal inventory" value={`${inventory.data?.length ?? 0} items`} />
            <hr className="my-2.5 border-slate-100 dark:border-border" />
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Today&apos;s visits
            </p>
            <p className="text-sm text-muted-foreground">
              Configure the authorised call pattern on the{' '}
              <Link
                to="/service-users/$serviceUserId/visit-plan"
                params={{ serviceUserId }}
                className="font-medium text-[#115E59] underline-offset-2 hover:underline"
              >
                Visit Plan
              </Link>{' '}
              module, then generate rota visits for this service user.
            </p>
          </BentoCard>

          <BentoCard title="Clinical & safety" icon={<Shield className="h-3.5 w-3.5" />}>
            <div className="mb-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-red-700">{detail.riskLevel?.name ?? 'Risk not set'}</span>
                {detail.riskLevel ? (
                  <span className="text-sm text-muted-foreground">{riskMeterPercent(detail)}%</span>
                ) : null}
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                  style={{ width: `${riskMeterPercent(detail)}%` }}
                />
              </div>
              {detail.notes?.trim() ? (
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{detail.notes}</p>
              ) : null}
            </div>
            <hr className="my-2 border-slate-100 dark:border-border" />
            <div className="my-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Allergies — {allergyRows.length} recorded
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-teal-700 hover:underline"
                    onClick={() => setAllergiesOpen(true)}
                  >
                    Add / edit
                  </button>
                  <Link
                    to="/service-users/$serviceUserId"
                    params={{ serviceUserId }}
                    search={{ tab: 'allergies' }}
                    className="text-sm font-medium text-teal-700 hover:underline"
                  >
                    Profile
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allergyRows.length === 0 ? (
                  <span className="text-sm text-muted-foreground">None recorded</span>
                ) : (
                  allergyRows.slice(0, 5).map(a => (
                    <span
                      key={a.id}
                      className={cn(
                        'rounded-full border px-2.5 py-0.5 text-sm font-medium',
                        /severe|anaphyl/i.test(a.comment)
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-amber-200 bg-amber-50 text-amber-800',
                      )}
                    >
                      {a.allergyName}
                    </span>
                  ))
                )}
              </div>
              {diabetesFlag ? (
                <p className="mt-2 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900">
                  Includes diabetes-related allergy — inform prescribing clinicians
                </p>
              ) : null}
            </div>
            <hr className="my-2 border-slate-100 dark:border-border" />
            <p className="mb-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">Body map — active records</p>
            <RowItem label="Active records" value={bm?.activeCount ?? 0} />
            <RowItem
              label="Reviews due"
              value={bm?.reviewDueCount ?? 0}
              tone={(bm?.reviewDueCount ?? 0) > 0 ? 'danger' : undefined}
            />
            <RowItem
              label="High / urgent"
              value={bm?.highRiskCount ?? 0}
              tone={(bm?.highRiskCount ?? 0) > 0 ? 'warn' : undefined}
            />
          </BentoCard>

          <BentoCard title="People & admin" icon={<Users className="h-3.5 w-3.5" />}>
            <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Assigned staff</p>
            {employeeDisplayName(detail.keyWorker) ? (
              <StaffMini name={employeeDisplayName(detail.keyWorker)!} role="Key worker" tone="teal" />
            ) : (
              <p className="text-sm text-muted-foreground">No key worker assigned</p>
            )}
            {employeeDisplayName(detail.namedNurse) ? (
              <StaffMini name={employeeDisplayName(detail.namedNurse)!} role="Named nurse" tone="blue" />
            ) : null}
            <hr className="my-2.5 border-slate-100 dark:border-border" />
            <p className="mb-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">Location</p>
            {addr ? (
              <address className="text-sm not-italic leading-relaxed text-slate-900 dark:text-slate-100 dark:text-foreground">
                {[addr.addressLine1, addr.addressLine2, addr.town, addr.postcode].filter(Boolean).join(', ') ||
                  detail.location?.name ||
                  '—'}
              </address>
            ) : (
              <p className="text-sm">{detail.location?.name ?? '—'}</p>
            )}
            {addr?.keySafeNumber ||
            addr?.accessInstructions ||
            addr?.accessMethod ||
            addr?.keySafeLocation ? (
              <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                {[
                  homeAccessMethodLabel(addr.accessMethod),
                  addr.keySafeLocation && `Key safe: ${addr.keySafeLocation}`,
                  addr.keySafeNumber && `Code: ${addr.keySafeNumber}`,
                  addr.accessInstructions,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
            <hr className="my-2.5 border-slate-100 dark:border-border" />
            <RowItem label="Funding type" value={primaryFunding?.fundingType.name ?? detail.fundingType?.name ?? '—'} />
            <RowItem
              label="Weekly budget"
              value={primaryFunding?.weeklyBudget ? `£${primaryFunding.weeklyBudget}` : '—'}
            />
            <RowItem
              label="Funding review"
              value={formatShortUk(primaryFunding?.reviewDate)}
              tone={primaryFunding?.reviewDate ? 'warn' : undefined}
            />
            <hr className="my-2.5 border-slate-100 dark:border-border" />
            <p className="mb-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Contacts {contactsTotal > 0 ? `(${contactsTotal})` : ''}
            </p>
            {primaryContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts on file</p>
            ) : (
              primaryContacts.map(c => (
                <div key={c.id} className="flex items-center gap-2.5 border-b border-slate-100 py-1.5 last:border-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-800">
                    {initialsFromName(c.firstName, c.lastName ?? '', '?')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {c.firstName} {c.lastName ?? ''}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {c.relationshipType?.name ?? 'Contact'}
                      {c.isPrimary ? ' · Primary' : ''}
                      {c.phone ? ` · ${c.phone}` : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </BentoCard>
        </div>

        {/* Legal docs */}
        <SectionLabel>Legal &amp; documents</SectionLabel>
        <BentoCard title="Legal documentation checklist" icon={<Files className="h-3.5 w-3.5" />}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <DocRow
                ok={Boolean(legal?.dnacprInPlace || legal?.dnacprCertificateUrl)}
                label="DNACPR in place"
                trailing={<DocumentOpenLink storedUrl={legal?.dnacprCertificateUrl} />}
              />
              <DocRow
                ok={Boolean(legal?.lpaHealthCertificateUrl)}
                label="LPA — Health & welfare"
                trailing={<DocumentOpenLink storedUrl={legal?.lpaHealthCertificateUrl} />}
              />
              <DocRow ok={Boolean(legal?.lpaFinanceCertificateUrl)} label="LPA — Finance & property" trailing={<DocumentOpenLink storedUrl={legal?.lpaFinanceCertificateUrl} label="View" />} />
            </div>
            <div>
              {(documents.data?.dols ?? []).length === 0 ? (
                <DocRow ok={false} label="DoLS — current order" trailing={<span className="text-sm text-muted-foreground">No records</span>} />
              ) : (
                (documents.data?.dols ?? []).slice(0, 2).map((row: ServiceUserDolsRow) => (
                  <DocRow
                    key={row.id}
                    ok={Boolean(row.certificateUrl)}
                    label={`DoLS — ${row.isCurrent ? 'current' : 'past'}`}
                    trailing={
                      <DocumentOpenLink
                        storedUrl={row.certificateUrl}
                        label={row.isCurrent ? `Renewal ${formatShortUk(row.renewalDate)}` : 'View'}
                      />
                    }
                  />
                ))
              )}
              <DocRow ok={Boolean(ia)} label="Initial assessment on file" trailing={ia ? <Link to="/service-users/$serviceUserId" params={{ serviceUserId }} search={{ tab: 'assessment' }} className="text-sm font-medium text-teal-700">Review</Link> : undefined} />
            </div>
            <div>
              <DocRow ok={Boolean(detail.riskLevel)} label="Risk level recorded" trailing={detail.riskLevel?.name} />
              <DocRow ok={(inventory.data?.length ?? 0) > 0} label="Personal inventory" trailing={`${inventory.data?.length ?? 0} items`} />
              <DocRow ok={contactsTotal > 0} label="Emergency contacts" trailing={`${contactsTotal} on file`} />
            </div>
          </div>
        </BentoCard>

        {/* Modules */}
        <SectionLabel>Modules</SectionLabel>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
          <ModuleTile
            icon={<Activity className="h-[18px] w-[18px]" />}
            iconBg="bg-teal-50 text-teal-800"
            title="Observations"
            sub="NEWS2 · Wellbeing"
            to="/service-users/$serviceUserId/observations"
            serviceUserId={serviceUserId}
          />
          <ModuleTile
            icon={<ClipboardList className="h-[18px] w-[18px]" />}
            iconBg="bg-blue-50 text-blue-800"
            title="Care plan"
            sub={acceptedItems.length > 0 ? `${acceptedItems.length} accepted` : 'Set up required'}
            badge={acceptedItems.length === 0 ? '!' : undefined}
            badgeTone="amber"
            to="/service-users/$serviceUserId/care-plan"
            serviceUserId={serviceUserId}
          />
          <ModuleTile
            icon={<Pill className="h-[18px] w-[18px]" />}
            iconBg="bg-red-50 text-red-800"
            title="Medication (MAR)"
            sub="Records & calendar"
            to="/service-users/$serviceUserId/medication"
            serviceUserId={serviceUserId}
          />
          <ModuleTile
            icon={<ScanLine className="h-[18px] w-[18px]" />}
            iconBg="bg-amber-50 text-amber-900"
            title="Body map"
            sub={bm ? `${bm.activeCount} active` : 'Clinical chart'}
            badge={bm && bm.reviewDueCount > 0 ? String(bm.reviewDueCount) : undefined}
            to="/service-users/$serviceUserId/body-map"
            serviceUserId={serviceUserId}
          />
          <ModuleTile
            icon={<UserPen className="h-[18px] w-[18px]" />}
            iconBg="bg-teal-50 text-teal-800"
            title="Edit profile"
            sub="Personal · Documents"
            to="/service-users/$serviceUserId"
            search={{ tab: 'personal' }}
            serviceUserId={serviceUserId}
          />
          <ModuleTile
            icon={<CalendarCheck className="h-[18px] w-[18px]" />}
            iconBg="bg-green-50 text-green-800"
            title="Calendar"
            sub="Events & visits"
            to="/service-users/$serviceUserId"
            search={{ tab: 'calendar' }}
            serviceUserId={serviceUserId}
          />
          <ModuleTile
            icon={<FileCheck className="h-[18px] w-[18px]" />}
            iconBg="bg-violet-50 text-violet-800"
            title="Initial assessment"
            sub={ia ? 'On file' : 'Not recorded'}
            badge={!ia ? '!' : undefined}
            badgeTone="blue"
            to="/service-users/$serviceUserId"
            search={{ tab: 'assessment' }}
            serviceUserId={serviceUserId}
          />
          <ModuleTile
            icon={<Coins className="h-[18px] w-[18px]" />}
            iconBg="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            title="Funding"
            sub={primaryFunding?.reviewDate ? `Review ${formatShortUk(primaryFunding.reviewDate)}` : 'Packages'}
            to="/service-users/$serviceUserId"
            search={{ tab: 'funding' }}
            serviceUserId={serviceUserId}
          />
          <ModuleTile disabled icon={<MessageCircle className="h-[18px] w-[18px]" />} iconBg="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" title="Comms" sub="Coming soon" />
          <ModuleTile disabled icon={<Bell className="h-[18px] w-[18px]" />} iconBg="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" title="Alerts" sub="Coming soon" />
          <ModuleTile disabled icon={<History className="h-[18px] w-[18px]" />} iconBg="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" title="History" sub="Coming soon" />
        </div>

        {/* Activity placeholder */}
        <SectionLabel>Recent activity</SectionLabel>
        <BentoCard title="Last events" icon={<Activity className="h-3.5 w-3.5" />}>
          <p className="text-base text-muted-foreground">
            Cross-module activity timeline will appear here as medication, observations, body map, and care plan events
            are unified.
          </p>
          {detail.updatedAt ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Profile last updated {formatShortUk(detail.updatedAt)}
            </p>
          ) : null}
        </BentoCard>

        <p className="mt-7 pb-5 text-center text-sm text-slate-400">
          CareAdmin · Service user {detail.serviceUserNumber ? `#${detail.serviceUserNumber}` : detail.id.slice(0, 8)}
          {detail.updatedAt ? ` · Last synced ${formatShortUk(detail.updatedAt)}` : ''}
        </p>
      </div>
      <ServiceUserAllergiesManageDialog
        serviceUserId={serviceUserId}
        open={allergiesOpen}
        onOpenChange={setAllergiesOpen}
      />
    </div>
  )
}

function StaffMini({
  name,
  role,
  tone,
}: {
  name: string
  role: string
  tone: 'teal' | 'blue'
}) {
  const parts = name.split(/\s+/).filter(Boolean)
  const ini = initialsFromName(parts[0], parts[1])
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold',
          tone === 'teal' && 'bg-teal-100 text-teal-800',
          tone === 'blue' && 'bg-blue-100 text-blue-800',
        )}
      >
        {ini}
      </div>
      <div>
        <div className="text-sm font-medium leading-tight">{name}</div>
        <div className="text-sm text-muted-foreground">{role}</div>
      </div>
    </div>
  )
}

function ModuleTile({
  title,
  sub,
  icon,
  iconBg,
  to,
  search,
  serviceUserId,
  badge,
  badgeTone = 'red',
  disabled,
}: {
  title: string
  sub: string
  icon: React.ReactNode
  iconBg: string
  to?: '/service-users/$serviceUserId/view' | '/service-users/$serviceUserId/observations' | '/service-users/$serviceUserId/care-plan' | '/service-users/$serviceUserId/medication' | '/service-users/$serviceUserId/body-map' | '/service-users/$serviceUserId'
  search?: Record<string, string>
  serviceUserId?: string
  badge?: string
  badgeTone?: 'red' | 'amber' | 'blue'
  disabled?: boolean
}) {
  const inner = (
    <>
      {badge ? (
        <span
          className={cn(
            'absolute right-2.5 top-2.5 min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-sm font-bold text-white',
            badgeTone === 'amber' && 'bg-amber-500',
            badgeTone === 'blue' && 'bg-blue-500',
            badgeTone === 'red' && 'bg-red-500',
          )}
        >
          {badge}
        </span>
      ) : null}
      {disabled ? (
        <span className="absolute right-2.5 top-2.5 rounded-full bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-sm text-muted-foreground">
          Soon
        </span>
      ) : null}
      <div className={cn('mb-1 flex h-9 w-9 items-center justify-center rounded-md', iconBg)}>{icon}</div>
      <div className="text-base font-semibold text-slate-900 dark:text-slate-100 dark:text-foreground">{title}</div>
      <div className="text-sm leading-snug text-muted-foreground">{sub}</div>
    </>
  )
  const className = cn(
    'relative flex flex-col items-start rounded-[14px] border border-slate-200 dark:border-border bg-white p-3.5 transition-all dark:bg-card',
    disabled ? 'cursor-default opacity-55' : 'hover:border-teal-600 hover:shadow-md',
  )
  if (disabled || !to || !serviceUserId) {
    return <div className={className}>{inner}</div>
  }
  return (
    <Link
      to={to}
      params={{ serviceUserId }}
      search={search}
      className={className}
    >
      {inner}
    </Link>
  )
}
