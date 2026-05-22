import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, ChevronDown, Loader2, Pill, Plus, User } from 'lucide-react'
import { ServiceUserModuleTabs } from '@/components/service-user/ServiceUserModuleTabs'
import { cn } from '@/lib/utils'
import { getApiBaseUrl } from '@/lib/api-base'
import { ApiError } from '@/lib/api-client'
import { resolveMediaUrl } from '@/lib/media-url'
import { CarePlanCard } from '@/features/service-users/care-plan/CarePlanCard'
import { CarePlanIconsShowcase } from '@/features/service-users/care-plan/CarePlanIconsShowcase'
import {
  fetchServiceUser,
  fetchServiceUserDocuments,
  listServiceUserAllergies,
  type ServiceUserAllergyRow,
  type ServiceUserDetail,
  type ServiceUserDocumentsBundle,
} from '@/lib/service-users-api'
import {
  fetchFormSelections,
  listSelectableForms,
  type SelectableForm,
} from '@/features/care-pathway/api/form-selection.api'
import {
  filterCarePlansByFormSelection,
  isActiveCarePlanName,
  sortCarePlansByCatalogOrder,
} from '@/features/service-users/care-plan/care-plan-catalog'

function formatDob(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function displayName(d: ServiceUserDetail | null): string {
  if (!d) return 'Service user'
  const legal = [d.firstName, d.lastName].filter(Boolean).join(' ').trim()
  if (d.preferredName?.trim()) {
    return legal ? `${legal} (${d.preferredName.trim()})` : d.preferredName.trim()
  }
  return legal || 'Service user'
}

function givenName(d: ServiceUserDetail | null): string {
  if (!d) return 'this service user'
  return d.preferredName?.trim() || d.firstName?.trim() || 'this service user'
}

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

  const [detail, setDetail] = React.useState<ServiceUserDetail | null>(null)
  const [documents, setDocuments] = React.useState<ServiceUserDocumentsBundle | null>(null)
  const [allergies, setAllergies] = React.useState<ServiceUserAllergyRow[]>([])
  const [carePlanForms, setCarePlanForms] = React.useState<SelectableForm[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!apiConfigured || !serviceUserId) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const d = await fetchServiceUser(serviceUserId)
        if (cancelled) return
        setDetail(d)
        const [docR, alR, selR, cpR] = await Promise.allSettled([
          fetchServiceUserDocuments(serviceUserId),
          listServiceUserAllergies(serviceUserId),
          fetchFormSelections(),
          listSelectableForms('care-plans', { limit: 100 }),
        ])
        if (cancelled) return
        if (docR.status === 'fulfilled') setDocuments(docR.value)
        if (alR.status === 'fulfilled') setAllergies(alR.value)
        if (selR.status === 'fulfilled' && cpR.status === 'fulfilled') {
          const selectedIds = selR.value.carePlans.map(s => s.formId)
          setCarePlanForms(filterCarePlansByFormSelection(cpR.value, selectedIds))
        } else {
          setCarePlanForms([])
        }
      } catch (e) {
        if (!cancelled) {
          setDetail(null)
          setError(e instanceof ApiError ? e.message : 'Failed to load care plan')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiConfigured, serviceUserId])

  const photoSrc = resolveMediaUrl(detail?.profilePhoto?.fileUrl ?? detail?.profilePhotoUrl)
  const legal = documents?.legal
  const dnacpr = legal?.dnacprInPlace === true
  const diabetesAllergy = allergies.some(a => /diabet/i.test(a.allergyName))
  const name = givenName(detail)

  const inactiveCarePlans = React.useMemo(
    () =>
      sortCarePlansByCatalogOrder(
        carePlanForms.filter(f => !isActiveCarePlanName(f.name)),
      ),
    [carePlanForms],
  )

  const openCarePlanForm = (formId: string) => {
    void navigate({
      to: '/service-users/$serviceUserId/care-plan/forms/$formId',
      params: { serviceUserId, formId },
    })
  }

  const activeCarePlans = React.useMemo(
    () => sortCarePlansByCatalogOrder(carePlanForms.filter(f => isActiveCarePlanName(f.name))),
    [carePlanForms],
  )

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
    <div className="flex min-h-full flex-col bg-[#f4f6f8] pb-12 dark:bg-background">
      <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center overflow-hidden rounded-full border-2 border-muted bg-muted text-[7px] text-muted-foreground">
              {photoSrc ? (
                <img src={photoSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <>
                  <User className="mb-0.5 h-9 w-9" strokeWidth={1.2} />
                  <span className="px-1 text-center font-medium leading-tight">NO IMAGE AVAILABLE</span>
                </>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{displayName(detail)}</h1>
              <p className="mt-1 text-sm">
                <span className="font-medium text-destructive">DOB {formatDob(detail?.dateOfBirth ?? null)}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dnacpr && (
                  <span className="rounded-md bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">For Resus</span>
                )}
                {diabetesAllergy && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                    <Pill className="h-3 w-3" />
                    Diabetes
                  </span>
                )}
                {detail?.riskLevel?.name && (
                  <span className="rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {detail.riskLevel.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-teal-800 dark:text-teal-300">
            <Link to="/service-users/calendar" className="hover:underline">
              Service User Tasks
            </Link>
            <Link to="/service-users/$serviceUserId/view" params={{ serviceUserId }} className="hover:underline">
              About
            </Link>
            <Link to="/service-users/calendar" className="hover:underline">
              Calendar
            </Link>
            <Link
              to="/service-users/all"
              className="inline-flex items-center gap-1 font-normal text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All service users
            </Link>
          </div>
        </div>
      </div>

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

            <CarePlanAccordion title={`${name}'s Assessments`} tone="teal" />
            <CarePlanAccordion title="Consent and Mental Capacity" tone="teal" />
            <CarePlanAccordion title="Risk Profile" tone="teal" />

            <CarePlanAccordion title={`Active Care Plans for ${name}`} tone="sky" defaultOpen>
              {activeCarePlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {carePlanForms.length === 0
                    ? 'No care plans match your form selection.'
                    : 'No active care plans in your current form selection.'}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {activeCarePlans.map(plan => (
                    <CarePlanCard
                      key={plan.id}
                      title={plan.name}
                      pictureUrl={plan.pictureUrl}
                      onOpen={() => openCarePlanForm(plan.id)}
                    />
                  ))}
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
                  {inactiveCarePlans.map(plan => (
                    <CarePlanCard
                      key={plan.id}
                      title={plan.name}
                      pictureUrl={plan.pictureUrl}
                      onOpen={() => openCarePlanForm(plan.id)}
                    />
                  ))}
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
