import { Link } from '@tanstack/react-router'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { cn, formatDate } from '@/shared/lib/utils'
import type { ServiceUserDetail } from '@/features/service-users/types'
import type { BodyMapSummary } from '@/features/service-users/body-map/types'

type AllergyRow = { name: string; severity?: string | null }

type Props = {
  serviceUserId: string
  profile: ServiceUserDetail | null | undefined
  summary: BodyMapSummary | undefined
  allergies: AllergyRow[]
}

function displayName(d: ServiceUserDetail | null | undefined): string {
  if (!d) return 'Service user'
  const legal = [d.firstName, d.lastName].filter(Boolean).join(' ').trim()
  if (d.preferredName?.trim()) {
    return legal ? `${legal} (${d.preferredName.trim()})` : d.preferredName.trim()
  }
  return legal || 'Service user'
}

function formatDob(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  return `${formatDate(iso)} (${age})`
}

const FLAG_STYLES: Record<string, string> = {
  falls: 'bg-amber-100 text-amber-900',
  pressure: 'bg-pink-100 text-pink-900',
  skin: 'bg-orange-100 text-orange-900',
  safeguard: 'bg-red-100 text-red-900',
}

export function BodyMapHeader({ serviceUserId, profile, summary, allergies }: Props) {
  const initials = profile
    ? [profile.firstName?.[0], profile.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?'
    : '?'
  const photoSrc = profile?.profilePhotoUrl
    ? profile.profilePhotoUrl.startsWith('http')
      ? profile.profilePhotoUrl
      : `${getApiBaseUrl()}${profile.profilePhotoUrl}`
    : null

  const flags: { key: string; label: string }[] = []
  if (profile?.riskLevel?.name?.toLowerCase().includes('high')) {
    flags.push({ key: 'falls', label: 'High risk' })
  }
  if ((summary?.highRiskCount ?? 0) > 0) {
    flags.push({ key: 'pressure', label: 'High / urgent records' })
  }
  if ((summary?.safeguardingCount ?? 0) > 0) {
    flags.push({ key: 'safeguard', label: `${summary!.safeguardingCount} safeguarding record(s)` })
  }
  if (allergies.length > 0) {
    flags.push({ key: 'skin', label: 'Allergies on file' })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start gap-4">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt=""
            className="h-14 w-14 rounded-full border border-border object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-foreground">{displayName(profile)}</h1>
          {profile?.serviceUserNumber ? (
            <p className="text-xs text-muted-foreground">{profile.serviceUserNumber}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>DOB {formatDob(profile?.dateOfBirth)}</span>
            {profile?.careType?.name ? <span>{profile.careType.name}</span> : null}
            {summary?.lastReviewAt ? (
              <span>Last review: {formatDate(summary.lastReviewAt)}</span>
            ) : null}
            {allergies.length > 0 ? (
              <span>Allergies: {allergies.map(a => a.name).join(', ')}</span>
            ) : (
              <span>Allergies: none recorded</span>
            )}
          </div>
          {flags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {flags.map(f => (
                <span
                  key={f.key}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    FLAG_STYLES[f.key] ?? 'bg-muted text-muted-foreground',
                  )}
                >
                  {f.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {(summary?.safeguardingCount ?? 0) > 0 ? (
            <Link
              to="/body-map/review-queue"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
            >
              Review queue ({summary?.safeguardingCount})
            </Link>
          ) : (
            <Link
              to="/body-map/review-queue"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Manager review queue
            </Link>
          )}
          <Link
            to="/service-users/$serviceUserId/care-plan"
            params={{ serviceUserId }}
            className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
          >
            Care plan
          </Link>
          <Link
            to="/service-users/$serviceUserId/medication"
            params={{ serviceUserId }}
            className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
          >
            MAR / eMAR
          </Link>
          <Link
            to="/service-users/$serviceUserId"
            params={{ serviceUserId }}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
