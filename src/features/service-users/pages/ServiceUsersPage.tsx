import * as React from 'react'
import {
  Search,
  SlidersHorizontal,
  User,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { ApiError } from '@/shared/api/api-client'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { EditFlashMessageDialog } from '@/features/service-users/components/EditFlashMessageDialog'
import {
  ServiceUserQuickSelectBar,
  type QuickSelectListId,
  type QuickSelectRiskId,
} from '@/features/service-users/components/ServiceUserQuickSelectBar'
import { ServiceUserRowActionStrip } from '@/features/service-users/components/ServiceUserRowActionStrip'
import {
  type ServiceUserListRow,
} from '@/features/service-users/types'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useUploadServiceUserPhoto } from '@/features/service-users/hooks/useServiceUserPhoto'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { serviceUserKeys } from '@/features/service-users/keys'
import {
  buildServiceUsersListParams,
  DEFAULT_SERVICE_USER_STATUS_CODE,
  statusFilterForQuickSelect,
  statusFilterLabel,
  type StatusFilterValue,
} from '@/features/service-users/utils/service-users-list-query'
import { SERVICE_USER_MANAGEMENT_NAME_TO } from '@/features/service-users/service-user-profile-tabs'

const TEAL = '#4db8c8'

const RISK_BORDER: Record<string, string> = {
  LOW: '#2a9d8f',
  MEDIUM: '#e9a825',
  HIGH: '#e11d48',
  CRITICAL: '#7f1d1d',
}

function employeeLabel(b: ServiceUserListRow['keyWorker']): string {
  if (!b) return ''
  const a = [b.firstName, b.lastName].filter(Boolean).join(' ').trim()
  return a || b.id
}

function displayName(row: ServiceUserListRow): string {
  const legal = [row.firstName, row.lastName].filter(Boolean).join(' ').trim()
  if (row.preferredName?.trim()) {
    return legal ? `${legal} (${row.preferredName.trim()})` : row.preferredName.trim()
  }
  return legal || '—'
}

function formatDobList(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function highRiskAlert(r: ServiceUserListRow): boolean {
  return r.riskLevel?.code === 'HIGH' || r.riskLevel?.code === 'CRITICAL'
}

import { formatServiceUserBranchLabel } from '@/features/settings/location-management/format-service-user-branch-label'

function SuUserDetailsBlock({
  user,
  archived,
}: {
  user: ServiceUserListRow
  archived?: boolean
}) {
  const kw = employeeLabel(user.keyWorker)
  const nn = employeeLabel(user.namedNurse)
  const loc = formatServiceUserBranchLabel({
    locationId: user.location?.id,
    locationName: user.location?.name,
    zoneName: user.location?.zoneName,
    branchName: user.location?.branchName,
    branchLayers: user.location?.branchLayers,
    displayLabel: user.location?.displayLabel,
  })
  const risk = highRiskAlert(user)

  return (
    <div className="min-w-0 space-y-1 pr-2">
      <div className="font-medium leading-snug text-foreground">
        {archived ? (
          <span>{displayName(user)}</span>
        ) : (
          <Link
            to={SERVICE_USER_MANAGEMENT_NAME_TO}
            params={{ serviceUserId: user.id }}
            className="hover:underline"
            data-testid="su-list-name-link"
          >
            {displayName(user)}
          </Link>
        )}
        {user.serviceUserNumber && (
          <span className="text-muted-foreground font-normal"> · #{user.serviceUserNumber}</span>
        )}
        {user.status?.name && (
          <span className="text-muted-foreground font-normal"> · {user.status.name}</span>
        )}
        {risk && (
          <span className="text-destructive font-normal"> · {user.riskLevel?.name ?? 'Risk'}</span>
        )}
        {archived && <span className="font-normal text-destructive"> · Deleted</span>}
      </div>
      <div className="space-y-0.5 text-sm text-muted-foreground leading-relaxed">
        <div>
          <span className="text-foreground/80">DOB:</span> {formatDobList(user.dateOfBirth)}
        </div>
        <div>
          <span className="text-foreground/80">Location:</span> {loc || '—'}
        </div>
        <div>
          <span className="text-foreground/80">Key worker:</span> {kw || '—'}
        </div>
        <div>
          <span className="text-foreground/80">Named nurse:</span> {nn || '—'}
        </div>
      </div>
    </div>
  )
}

function avatarBorder(row: ServiceUserListRow): string {
  const code = row.riskLevel?.code?.toUpperCase()
  if (code && RISK_BORDER[code]) return RISK_BORDER[code]
  const c = row.riskLevel?.color?.trim()
  if (c && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return c
  const colors = ['#2a9d8f', '#e9a825', '#9ca3af']
  let h = 0
  for (let i = 0; i < row.id.length; i++) h = (h + row.id.charCodeAt(i)) % 3
  return colors[h] ?? '#9ca3af'
}

const SU_PHOTO_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'] as const

function SuAvatar({
  row,
  onPhotoUploaded,
  readOnly,
}: {
  row: ServiceUserListRow
  onPhotoUploaded: (userId: string, profilePhotoUrl: string) => void
  readOnly?: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const uploadPhoto = useUploadServiceUserPhoto()
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const src = resolveMediaUrl(row.profilePhotoUrl)
  const border = avatarBorder(row)
  const uploading = uploadPhoto.isPending && uploadPhoto.variables?.serviceUserId === row.id

  const openPicker = () => {
    if (readOnly) return
    setUploadError(null)
    inputRef.current?.click()
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!SU_PHOTO_ACCEPT.includes(file.type as (typeof SU_PHOTO_ACCEPT)[number])) {
      setUploadError('Use JPEG, PNG, or WebP.')
      return
    }
    setUploadError(null)
    try {
      const { profilePhotoUrl } = await uploadPhoto.mutateAsync({ serviceUserId: row.id, file })
      onPhotoUploaded(row.id, profilePhotoUrl)
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed.')
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <input
        ref={inputRef}
        type="file"
        accept={SU_PHOTO_ACCEPT.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={onFileChange}
        aria-hidden
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={uploading || readOnly}
        title={readOnly ? 'Photo upload unavailable for deleted records' : 'Upload profile photo (JPEG, PNG, WebP)'}
        className={cn(
          'h-16 w-16 rounded-full flex flex-col items-center justify-center border-2 overflow-hidden p-0',
          'bg-muted transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          uploading ? 'cursor-wait opacity-70' : readOnly ? 'cursor-default opacity-80' : 'cursor-pointer',
        )}
        style={{ borderColor: border }}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Uploading" />
        ) : src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            <User className="h-6 w-6 text-muted-foreground mb-0.5" strokeWidth={1.5} />
            <span className="text-[6.5px] text-muted-foreground font-medium text-center leading-tight px-1">
              NO IMAGE
              <br />
              AVAILABLE
            </span>
          </>
        )}
      </button>
      {uploadError ? (
        <p className="max-w-[5.5rem] text-center text-[10px] leading-tight text-destructive" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  )
}

export default function ServiceUsersPage() {
  const apiConfigured = Boolean(getApiBaseUrl())
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = React.useState('')
  const [searchApi, setSearchApi] = React.useState('')
  const [kwSearch, setKwSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilterValue>(DEFAULT_SERVICE_USER_STATUS_CODE)
  const [listFilter, setListFilter] = React.useState<QuickSelectListId | null>(null)
  const [riskFilter, setRiskFilter] = React.useState<QuickSelectRiskId | null>(null)
  const [unassignedOnly, setUnassignedOnly] = React.useState(false)
  const [onHoldOnly, setOnHoldOnly] = React.useState(false)
  const viewingDeleted = listFilter === 'deleted'
  const [page, setPage] = React.useState(1)
  const [flashMessageUser, setFlashMessageUser] = React.useState<ServiceUserListRow | null>(null)

  const handleFlashClick = React.useCallback((user: ServiceUserListRow) => {
    setFlashMessageUser(user)
  }, [])

  const { locationId: globalLocationId } = useGlobalLocationScope()

  // Debounce search to avoid a query per keystroke
  React.useEffect(() => {
    const t = window.setTimeout(() => setSearchApi(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1)
  }, [searchApi, statusFilter, listFilter, onHoldOnly, globalLocationId])

  // Lookups (statuses, risk levels, etc.) — prefetched by route loader
  const lookupsQuery = useServiceUserLookups()
  const lookups = lookupsQuery.data ?? null

  // Derive list params from filter state + resolved lookups
  const listParams = React.useMemo(
    () =>
      buildServiceUsersListParams(lookups, {
        page,
        search: searchApi,
        listFilter,
        statusFilter,
        onHoldOnly,
        locationId: globalLocationId ?? undefined,
      }),
    [lookups, listFilter, statusFilter, onHoldOnly, page, searchApi, globalLocationId],
  )

  const listQuery = useServiceUsers(listParams, lookupsQuery.isSuccess)
  const rows = listQuery.data?.rows ?? []
  const meta = listQuery.data?.meta ?? {
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  }
  const loading = listQuery.isFetching
  const loadError = listQuery.error
    ? listQuery.error instanceof Error
      ? listQuery.error.message
      : 'Failed to load service users'
    : null

  const triggerReload = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: serviceUserKeys.lists() })
  }, [queryClient])

  const filteredRows = React.useMemo(() => {
    let list = rows
    if (riskFilter) {
      list = list.filter((r) => r.riskLevel?.code === riskFilter)
    }
    if (unassignedOnly) {
      list = list.filter((r) => !r.keyWorker)
    }
    const q = kwSearch.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) => {
      const kw = employeeLabel(r.keyWorker).toLowerCase()
      const nn = employeeLabel(r.namedNurse).toLowerCase()
      return kw.includes(q) || nn.includes(q)
    })
  }, [rows, kwSearch, riskFilter, unassignedOnly])

  const onProfilePhotoUploaded = React.useCallback(
    (_userId: string, _profilePhotoUrl: string) => {
      // Invalidate so the list reflects the new photo on next navigation
      void queryClient.invalidateQueries({ queryKey: serviceUserKeys.lists() })
    },
    [queryClient],
  )

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col" data-testid="service-users-page">
      <div className="p-3 sm:p-4">
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="space-y-1.5 p-4 sm:p-5">
            <h1
              data-testid="service-users-page-title"
              className="flex items-center gap-2 text-sm font-semibold"
            >
              <Filter className="h-4 w-4 text-muted-foreground" />
              Service User Management
            </h1>
            <p className="text-sm text-muted-foreground">
              {[
                'Search, filter, and manage service users (live data from CareAdmin API).',
                globalLocationId
                  ? 'Showing service users for the selected header location.'
                  : null,
              ]
                .filter(Boolean)
                .join(' ')}
            </p>
          </div>
        </div>
      </div>

      {!apiConfigured && (
        <div className="px-3 pb-2 sm:px-4">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            Set <code className="rounded bg-muted px-1">VITE_API_BASE_URL</code> and sign in to load service users.
          </div>
        </div>
      )}
      {loadError && (
        <div className="px-3 pb-2 sm:px-4">
          <div
            role="alert"
            data-testid="service-users-error"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {loadError}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-b border-border bg-background px-3 py-3 sm:px-4 md:flex-row md:flex-wrap md:items-center md:gap-2 md:py-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch md:items-center">
          <button
            type="button"
            className="h-9 w-9 shrink-0 self-start rounded border border-border text-muted-foreground transition-colors hover:bg-muted sm:h-8 sm:w-8 md:self-auto"
          >
            <span className="flex h-full w-full items-center justify-center">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
          </button>

          <div className="flex min-w-0 w-full flex-1 sm:max-w-md md:w-52 md:flex-initial md:max-w-none">
            <input
              data-testid="service-users-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, NHS no., phone…"
              className="h-9 min-w-0 flex-1 rounded-l-md border border-border border-r-0 bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span
              className="flex h-9 shrink-0 items-center justify-center rounded-r-md border border-l-0 px-3 text-white"
              style={{ background: TEAL, borderColor: TEAL }}
              title="Search runs as you type"
            >
              <Search className="h-4 w-4" />
            </span>
          </div>

          <div className="flex min-w-0 w-full flex-1 sm:max-w-md md:w-48 md:flex-initial md:max-w-none">
            <input
              value={kwSearch}
              onChange={(e) => setKwSearch(e.target.value)}
              placeholder="Filter key worker / nurse (this page)"
              className="h-9 min-w-0 flex-1 rounded-l-md border border-border border-r-0 bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span
              className="flex h-9 shrink-0 items-center justify-center rounded-r-md border border-l-0 px-3 text-white"
              style={{ background: TEAL, borderColor: TEAL }}
              title="Filters the current result page only"
            >
              <Search className="h-4 w-4" />
            </span>
          </div>
        </div>

        <ServiceUserQuickSelectBar
          listFilter={listFilter}
          onListFilterChange={(id) => {
            setListFilter(id)
            setStatusFilter(statusFilterForQuickSelect(id))
            if (id !== 'deleted') {
              setOnHoldOnly(false)
            }
          }}
          riskFilter={riskFilter}
          onRiskFilterChange={setRiskFilter}
          unassignedOnly={unassignedOnly}
          onUnassignedOnlyChange={setUnassignedOnly}
          onHoldOnly={onHoldOnly}
          onOnHoldOnlyChange={(on) => {
            setOnHoldOnly(on)
            if (on) {
              setListFilter(null)
              setStatusFilter('ON_HOLD')
            }
          }}
          disabled={!apiConfigured || loading}
        />

        <div className="flex w-full min-w-0 items-center gap-2 md:ml-auto md:w-auto md:shrink-0">
          <span className="shrink-0 text-sm font-medium text-muted-foreground">Status</span>
          <select
            data-testid="service-users-status-filter"
            value={statusFilter}
            disabled={viewingDeleted || lookupsQuery.isLoading}
            onChange={(e) => {
              setListFilter(null)
              setOnHoldOnly(false)
              setStatusFilter(e.target.value)
            }}
            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60 md:flex-initial"
          >
            <option value="all">All</option>
            {(lookups?.statuses ?? []).map((s) => (
              <option key={s.id} value={s.code}>
                {statusFilterLabel(s.code, s.name)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {viewingDeleted && (
        <div className="px-3 pb-2 sm:px-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            Showing soft-deleted service users. Select <strong>Active users</strong> to return to the live list.
          </div>
        </div>
      )}

      <div className="min-w-0 p-3 sm:p-4">
        <div className="relative rounded-lg border border-border bg-card">
          {loading && (
            <div
              data-testid="service-users-loading"
              className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60"
            >
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!apiConfigured ? (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground sm:px-4">
              API is not configured.
            </div>
          ) : filteredRows.length === 0 && !loading ? (
            <div
              data-testid="service-users-empty-state"
              className="px-3 py-12 text-center text-sm text-muted-foreground sm:px-4"
            >
              {rows.length === 0
                ? viewingDeleted
                  ? 'No deleted service users match your search.'
                  : 'No service users match your filters.'
                : 'No rows match key worker filter on this page.'}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-sm" data-testid="service-users-table">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {[
                        { label: 'Picture', filter: false },
                        { label: 'Service user', filter: true },
                        { label: 'Actions', filter: false },
                      ].map((col) => (
                        <th
                          key={col.label}
                          className={cn(
                            'px-2 py-2.5 text-left text-xs font-medium text-muted-foreground sm:px-3 sm:text-sm',
                            col.label === 'Picture' && 'w-[5.5rem]',
                            col.label === 'Actions' && 'w-0 text-right',
                          )}
                        >
                          <div className={cn('flex items-center gap-1', col.label === 'Actions' && 'justify-end')}>
                            {col.label}
                            {col.filter && <Filter className="h-3 w-3 opacity-60" />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((user) => (
                      <tr
                        key={user.id}
                        data-testid={`service-user-row-${user.id}`}
                        className="border-b border-border transition-colors last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-2 py-3 align-middle sm:px-3">
                          <SuAvatar row={user} onPhotoUploaded={onProfilePhotoUploaded} readOnly={viewingDeleted} />
                        </td>
                        <td className="min-w-0 px-2 py-3 align-middle sm:px-3">
                          <SuUserDetailsBlock user={user} archived={viewingDeleted} />
                        </td>
                        <td className="px-2 py-3 align-middle text-right sm:px-3">
                          <div className="inline-block max-w-[min(100vw,28rem)] min-w-0 overflow-x-auto touch-pan-x md:max-w-none">
                            <ServiceUserRowActionStrip
                              user={user}
                              archived={viewingDeleted}
                              onFlashClick={handleFlashClick}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-border md:hidden">
                {filteredRows.map((user) => (
                  <article
                    key={user.id}
                    className="space-y-3 px-3 py-3 first:rounded-t-lg last:rounded-b-lg hover:bg-muted/15"
                  >
                    <div className="flex gap-3">
                      <SuAvatar row={user} onPhotoUploaded={onProfilePhotoUploaded} readOnly={viewingDeleted} />
                      <div className="min-w-0 flex-1">
                        <SuUserDetailsBlock user={user} archived={viewingDeleted} />
                      </div>
                    </div>
                    <div className="-mx-1 overflow-x-auto px-1 pb-0.5 touch-pan-x">
                      <ServiceUserRowActionStrip
                        user={user}
                        className="min-w-min justify-start"
                        archived={viewingDeleted}
                        onFlashClick={handleFlashClick}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>

        {apiConfigured && meta.total > 0 && (
          <div className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span className="min-w-0 text-center sm:text-left">
              Page {meta.page} of {meta.totalPages} · {meta.total} service user{meta.total === 1 ? '' : 's'}
            </span>
            <div className="flex items-center justify-center gap-2 sm:justify-end">
              <button
                type="button"
                disabled={!meta.hasPrevPage || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex min-h-10 min-w-[5.5rem] items-center justify-center gap-1 rounded-md border border-border bg-background px-3 py-2 hover:bg-muted disabled:opacity-50 sm:min-h-0 sm:min-w-0 sm:py-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                disabled={!meta.hasNextPage || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex min-h-10 min-w-[5.5rem] items-center justify-center gap-1 rounded-md border border-border bg-background px-3 py-2 hover:bg-muted disabled:opacity-50 sm:min-h-0 sm:min-w-0 sm:py-1.5"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <EditFlashMessageDialog
        user={flashMessageUser}
        open={Boolean(flashMessageUser)}
        onOpenChange={(open) => {
          if (!open) setFlashMessageUser(null)
        }}
      />
    </div>
  )
}
