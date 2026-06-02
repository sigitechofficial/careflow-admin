import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import type { ServiceUserDetail } from '@/features/service-users/types'
import type { BodyMapSummary } from '@/features/service-users/body-map/types'

type Props = {
  serviceUserId: string
  profile: ServiceUserDetail | null | undefined
  summary: BodyMapSummary | undefined
}

function displayName(d: ServiceUserDetail | null | undefined): string {
  if (!d) return 'Service user'
  const legal = [d.firstName, d.lastName].filter(Boolean).join(' ').trim()
  if (d.preferredName?.trim()) {
    return legal ? `${legal} (${d.preferredName.trim()})` : d.preferredName.trim()
  }
  return legal || 'Service user'
}

function QuickLink({
  to,
  params,
  children,
}: {
  to: string
  params?: Record<string, string>
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      params={params}
      className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  )
}

export function BodyMapCompactHeader({ serviceUserId, profile, summary }: Props) {
  const initials = profile
    ? [profile.firstName?.[0], profile.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?'
    : '?'
  const photoSrc = profile?.profilePhotoUrl
    ? profile.profilePhotoUrl.startsWith('http')
      ? profile.profilePhotoUrl
      : `${getApiBaseUrl()}${profile.profilePhotoUrl}`
    : null

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Link
        to="/service-users/$serviceUserId"
        params={{ serviceUserId }}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Back to profile"
      >
        <ChevronLeft className="size-5" />
      </Link>
      {photoSrc ? (
        <img
          src={photoSrc}
          alt=""
          className="hidden size-9 shrink-0 rounded-full border border-border object-cover sm:block"
        />
      ) : (
        <span className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white sm:flex">
          {initials}
        </span>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold sm:text-base">{displayName(profile)}</h1>
        <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
          Body map
          {profile?.serviceUserNumber ? ` · ${profile.serviceUserNumber}` : ''}
          {(summary?.safeguardingCount ?? 0) > 0
            ? ` · ${summary!.safeguardingCount} safeguarding`
            : ''}
        </p>
      </div>
      <nav className="ml-auto hidden items-center gap-1 lg:flex">
        <QuickLink to="/body-map/review-queue">Queue</QuickLink>
        <QuickLink to="/service-users/$serviceUserId/medication" params={{ serviceUserId }}>
          MAR
        </QuickLink>
        <QuickLink to="/service-users/$serviceUserId/care-plan" params={{ serviceUserId }}>
          Care plan
        </QuickLink>
      </nav>
    </div>
  )
}
