import * as React from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { Calendar, LayoutDashboard, Loader2, Pencil, User, Zap } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import type { ServiceUserDolsRow } from '@/features/service-users/types'
import { Button } from '@/shared/ui/button'
import { useServiceUserDetail } from '@/features/service-users/hooks/useServiceUser'

const CARD_HEADER = 'bg-teal-800 px-3 py-2 text-sm font-semibold text-white dark:bg-teal-900'

function formatDob(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function DashCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={CARD_HEADER}>{title}</div>
      <div className="space-y-2 p-4 text-sm">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function DocumentOpenLink({ storedUrl, label = 'Open' }: { storedUrl: string | null | undefined; label?: string }) {
  const href = resolveMediaUrl(storedUrl)
  if (!href) return <span className="text-muted-foreground">—</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-sky-600 underline underline-offset-2 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
    >
      {label}
    </a>
  )
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return 'record'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatFlashDisplayUntil(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function CheckOrDash(ok: boolean) {
  return ok ? <span className="text-emerald-600">✓</span> : <span className="text-muted-foreground">—</span>
}

function PlaceholderNote() {
  return <p className="text-xs italic text-muted-foreground">Further modules will appear here as they are added to CareAdmin.</p>
}

export function ServiceUserDashboardWednesday({ serviceUserId }: { serviceUserId: string }) {
  const search = useSearch({ strict: false }) as { focus?: string }
  const apiConfigured = Boolean(getApiBaseUrl())
  const flashSectionRef = React.useRef<HTMLDivElement>(null)

  const { profile, documents, allergies, inventory, initialAssessment, flashMessage } =
    useServiceUserDetail(serviceUserId ?? '')

  const detail = profile.data ?? null
  const flashData = flashMessage.data ?? null
  const documentsData = documents.data ?? null
  const allergiesData = allergies.data ?? []
  const inventoryData = inventory.data ?? []
  const initialAssessmentData = initialAssessment.data ?? null

  const loading = profile.isLoading
  const error = profile.error
    ? profile.error instanceof Error
      ? profile.error.message
      : 'Failed to load service user'
    : null

  // Scroll to flash section when navigated with ?focus=flash
  React.useEffect(() => {
    if (search.focus !== 'flash' || loading) return
    const el = flashSectionRef.current
    if (!el) return
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => window.clearTimeout(t)
  }, [search.focus, loading, flashData])

  const displayName = detail
    ? [detail.firstName, detail.lastName].filter(Boolean).join(' ').trim() ||
      detail.preferredName?.trim() ||
      'Service user'
    : 'Service user'
  const photoSrc = resolveMediaUrl(detail?.profilePhoto?.fileUrl ?? detail?.profilePhotoUrl)

  const legal = documentsData?.legal
  const docEvidenceCount =
    (legal?.dnacprCertificateUrl ? 1 : 0) +
    (legal?.lpaHealthCertificateUrl ? 1 : 0) +
    (legal?.lpaFinanceCertificateUrl ? 1 : 0) +
    (documentsData?.dols?.length ?? 0)

  return (
    <div className="flex min-h-full flex-col bg-muted/20 pb-12">
      <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 gap-4">
            <div
              className="flex h-20 w-20 shrink-0 flex-col items-center justify-center overflow-hidden rounded-full border-2 border-muted bg-muted text-[7px] text-muted-foreground"
              style={{ minWidth: '5rem' }}
            >
              {photoSrc ? (
                <img src={photoSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <>
                  <User className="mb-0.5 h-8 w-8" strokeWidth={1.2} />
                  <span className="px-1 text-center font-medium leading-tight">NO IMAGE</span>
                </>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{displayName}</h1>
              <p className="mt-1 text-sm">
                <span className="text-destructive font-medium">DOB {formatDob(detail?.dateOfBirth ?? null)}</span>
                {detail?.serviceUserNumber && (
                  <span className="text-muted-foreground"> · #{detail.serviceUserNumber}</span>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {detail?.riskLevel?.name && (
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      detail.riskLevel.code === 'HIGH' || detail.riskLevel.code === 'CRITICAL'
                        ? 'bg-amber-500/20 text-amber-900 dark:text-amber-100'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    {detail.riskLevel.name}
                  </span>
                )}
                {detail?.careType?.name && (
                  <span className="rounded-full bg-teal-800/15 px-2.5 py-0.5 text-xs font-medium text-teal-900 dark:bg-teal-400/20 dark:text-teal-100">
                    {detail.careType.name}
                  </span>
                )}
                {detail?.status?.name && (
                  <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                    {detail.status.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/service-users/calendar"
              className="text-sm font-semibold text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
            >
              Service user tasks
            </Link>
            <Button variant="outline" size="sm" asChild>
              <Link to="/service-users/all" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Service users
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/service-users/calendar" className="gap-2">
                <Calendar className="h-4 w-4" />
                Calendar
              </Link>
            </Button>
            <Button className="bg-teal-800 hover:bg-teal-900" size="sm" asChild>
              <Link to="/service-users/$serviceUserId" params={{ serviceUserId }} className="gap-2">
                <Pencil className="h-4 w-4" />
                Edit profile
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {!loading && (
        <div
          ref={flashSectionRef}
          id="flash-message"
          className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-4"
          data-testid="service-user-flash-message-section"
        >
          {flashData ? (
            <div
              className={cn(
                'flex gap-3 rounded-lg border-2 border-amber-400/80 bg-amber-50 px-4 py-3 shadow-sm',
                'dark:border-amber-600/60 dark:bg-amber-950/40',
                search.focus === 'flash' && 'ring-2 ring-amber-500/50 ring-offset-2',
              )}
              role="alert"
            >
              <Zap className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                  Flash message
                  <span className="ml-2 font-normal normal-case text-amber-800/90 dark:text-amber-300/90">
                    until {formatFlashDisplayUntil(flashData.displayUntil)}
                  </span>
                </p>
                <p className="mt-1 text-sm font-medium text-amber-950 dark:text-amber-50">{flashData.message}</p>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-2.5 text-sm text-muted-foreground">
              No active flash message.
            </p>
          )}
        </div>
      )}

      {!apiConfigured && (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            Set <code className="rounded bg-muted px-1">VITE_API_BASE_URL</code> to load this dashboard.
          </div>
        </div>
      )}

      {error && (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && detail && (
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <DashCard title="Personal details">
              <Row label="Core profile" value={CheckOrDash(Boolean(detail.firstName && detail.lastName))} />
              <Row label="Contacts" value={detail.contacts?.length ?? 0} />
              <Row label="Allergies" value={allergiesData.length} />
              <Row label="Personal inventory" value={`${inventoryData.length} item${inventoryData.length === 1 ? '' : 's'}`} />
              <Row
                label="DNACPR"
                value={
                  legal?.dnacprCertificateUrl ? (
                    <DocumentOpenLink storedUrl={legal.dnacprCertificateUrl} label="Open certificate" />
                  ) : legal?.dnacprInPlace ? (
                    'On file (no certificate uploaded)'
                  ) : (
                    'Not recorded'
                  )
                }
              />
              <Row label="About me" value={detail.notes?.trim() ? 'Notes on file' : '—'} />
              <Row
                label="Flash message"
                value={
                  flashData ? (
                    <span className="max-w-[14rem] text-left sm:text-right">{flashData.message}</span>
                  ) : (
                    '—'
                  )
                }
              />
            </DashCard>

            <DashCard title="Assessments">
              {initialAssessmentData ? (
                <>
                  <Row label="Initial assessment" value={CheckOrDash(true)} />
                  <Row label="Carers (planned)" value={initialAssessmentData.numberOfCarers} />
                  <p className="text-xs text-muted-foreground">
                    Open <strong>Edit profile</strong> → Initial Assessment for full detail.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No initial assessment on file.</p>
              )}
              <PlaceholderNote />
            </DashCard>

            <DashCard title="Documents">
              <Row label="DNACPR form" value={<DocumentOpenLink storedUrl={legal?.dnacprCertificateUrl} />} />
              <Row label="LPA certificate (health)" value={<DocumentOpenLink storedUrl={legal?.lpaHealthCertificateUrl} />} />
              <Row label="LPA certificate (finance)" value={<DocumentOpenLink storedUrl={legal?.lpaFinanceCertificateUrl} />} />
              <div className="border-b border-border/60 py-1.5 last:border-0">
                <div className="mb-1 text-muted-foreground">DoLS certificates</div>
                {!documentsData?.dols?.length ? (
                  <p className="text-right text-muted-foreground">No records</p>
                ) : (
                  <ul className="space-y-1.5 text-right">
                    {documentsData.dols.map((row: ServiceUserDolsRow) => (
                      <li key={row.id} className="flex flex-wrap items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          {row.isCurrent ? 'Current' : 'Past'} · {formatShortDate(row.issueDate ?? row.applicationDate)}
                        </span>
                        <DocumentOpenLink storedUrl={row.certificateUrl} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Row label="Evidence files on file (count)" value={docEvidenceCount} />
              <p className="text-xs text-muted-foreground">Use Edit profile → Documents for uploads.</p>
            </DashCard>

            <DashCard title="Care plan">
              <p className="text-muted-foreground">Care plans will appear here when the Care Plan module is connected.</p>
              <PlaceholderNote />
            </DashCard>

            <DashCard title="Visits">
              <p className="text-muted-foreground">
                Configure the call pattern on the{' '}
                <Link
                  to="/service-users/$serviceUserId"
                  params={{ serviceUserId }}
                  search={{ tab: 'visit-plan' }}
                  className="font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-200"
                >
                  Visit Plan
                </Link>{' '}
                tab, then generate rota visits.
              </p>
            </DashCard>

            <DashCard title="Conditions & alerts">
              <Row label="Risk level" value={detail.riskLevel?.name ?? '—'} />
              <Row label="Funding type" value={detail.fundingType?.name ?? '—'} />
              <Row label="NHS number" value={detail.nhsNumber?.trim() || '—'} />
              <PlaceholderNote />
            </DashCard>

            <DashCard title="Risk assessment">
              <p className="text-sm text-muted-foreground">
                Structured risk rows will list here when the Risk Assessment module is available. Current summary:{' '}
                <strong className="text-foreground">{detail.riskLevel?.name ?? 'Not set'}</strong>.
              </p>
            </DashCard>
          </div>
        </div>
      )}
    </div>
  )
}
