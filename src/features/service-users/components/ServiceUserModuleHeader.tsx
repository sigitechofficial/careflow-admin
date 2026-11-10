import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Pill, User } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import type { ServiceUserDetail } from '@/features/service-users/types'
import { useAuthStore } from '@/features/auth/store'
import { useServiceUserMedicalConditions } from '@/features/alerts/hooks/useMedicalClinical'
import {
  formatServiceUserDob,
  serviceUserDisplayName,
} from '@/features/service-users/lib/service-user-display'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useServiceUserCarePlanExtras } from '@/features/service-users/hooks/useServiceUserCarePlanExtras'

export type ServiceUserModuleShellLayout = 'default' | 'wide'

export type ServiceUserModuleHeaderProps = {
  serviceUserId: string
  /** When omitted, profile is loaded via useServiceUser. */
  detail?: ServiceUserDetail | null
  /** Optional buttons shown under the nav links on the right (e.g. Add medication). */
  actions?: React.ReactNode
  /** Extra badges after DNACPR / diabetes / risk level. */
  badges?: React.ReactNode
  /** default: max-w-7xl · wide: max-w-screen-2xl (matches Employee Management pages). */
  shellLayout?: ServiceUserModuleShellLayout
}

export function serviceUserModuleShellClass(
  layout: ServiceUserModuleShellLayout = 'default',
  options?: { horizontalPadding?: boolean },
): string {
  const horizontalPadding = options?.horizontalPadding !== false
  return cn(
    'mx-auto w-full',
    layout === 'wide' ? 'max-w-screen-2xl' : 'max-w-7xl',
    horizontalPadding && (layout === 'wide' ? 'px-3.5 md:px-8' : 'px-4 sm:px-6'),
  )
}

export function ServiceUserModuleHeader({
  serviceUserId,
  detail: detailProp,
  actions,
  badges,
  shellLayout = 'default',
}: ServiceUserModuleHeaderProps) {
  const profileQuery = useServiceUser(serviceUserId, detailProp === undefined)
  const { documents } = useServiceUserCarePlanExtras(serviceUserId)
  const canConditions = useAuthStore((s) => s.can('service_users.medical_conditions.read'))
  const conditions = useServiceUserMedicalConditions(serviceUserId, canConditions)

  const detail = detailProp === undefined ? (profileQuery.data ?? null) : (detailProp ?? null)
  const photoSrc = resolveMediaUrl(detail?.profilePhoto?.fileUrl ?? detail?.profilePhotoUrl)
  const legal = documents.data?.legal
  const dnacpr = legal?.dnacprInPlace === true
  // Diabetes is a medical condition, not an allergy.
  const diabetes = (conditions.data ?? []).some(
    (c) => c.status === 'ACTIVE' && c.isActive && /diabet/i.test(`${c.condition?.code ?? ''} ${c.condition?.name ?? ''}`),
  )

  return (
    <div className={cn('border-b border-border bg-card py-4', shellLayout === 'default' && 'px-4 sm:px-6')}>
      <div
        className={cn(
          'flex flex-wrap items-start justify-between gap-4',
          serviceUserModuleShellClass(shellLayout, { horizontalPadding: shellLayout === 'wide' }),
        )}
      >
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
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {serviceUserDisplayName(detail)}
              {detail?.serviceUserNumber && (
                <span className="ml-2 text-lg font-normal text-muted-foreground">
                  #{detail.serviceUserNumber}
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm">
              <span className="font-medium text-destructive">
                DOB {formatServiceUserDob(detail?.dateOfBirth ?? null)}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {dnacpr && (
                <span className="rounded-md bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  DNACPR
                </span>
              )}
              {diabetes && (
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
              {badges}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-teal-800 dark:text-teal-300">
            <Link
              to="/service-users/all"
              className="inline-flex items-center gap-1 font-normal text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All service users
            </Link>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  )
}

/** Shared page shell background used by service-user module pages. */
export const SERVICE_USER_MODULE_PAGE_CLASS =
  'flex min-h-full flex-col bg-[#f4f6f8] pb-12 dark:bg-background'

/** Main content area — wide layout matches AppLayout / Employee Management. */
export const SERVICE_USER_MODULE_CONTENT_WIDE_CLASS = cn(
  serviceUserModuleShellClass('wide'),
  'flex-1 py-4 md:py-4',
)
