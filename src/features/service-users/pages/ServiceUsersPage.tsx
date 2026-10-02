import * as React from 'react'
import {
  Search,
  User,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { cn, formatDate, formatDateTime } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { ApiError } from '@/shared/api/api-client'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { EditFlashMessageDialog } from '@/features/service-users/components/EditFlashMessageDialog'
import { ServiceUserQuickSelectBar } from '@/features/service-users/components/ServiceUserQuickSelectBar'
import { ServiceUserRowActionStrip } from '@/features/service-users/components/ServiceUserRowActionStrip'
import {
  type ServiceUserListRow,
} from '@/features/service-users/types'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useDeleteServiceUser } from '@/features/service-users/hooks/useServiceUserMutations'
import { useUploadServiceUserPhoto } from '@/features/service-users/hooks/useServiceUserPhoto'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import { MultiSelect, type MultiSelectOption } from '@/shared/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { serviceUserKeys } from '@/features/service-users/keys'
import {
  buildServiceUsersListParams,
  clearAdvancedFilterChip,
  countActiveAdvancedFilters,
  DEFAULT_SERVICE_USER_STATUS_CODE,
  describeAdvancedFilterChips,
  EMPTY_SERVICE_USERS_ADVANCED_FILTERS,
  statusFilterForQuickSelect,
  statusFilterLabel,
  type ServiceUsersAdvancedFilters,
} from '@/features/service-users/utils/service-users-list-query'
import { exportServiceUsersListCsv } from '@/features/service-users/utils/service-users-list-export'
import {
  buildServiceUsersListSearch,
  enrichServiceUsersListUrlState,
  parseServiceUsersListSearch,
  type ServiceUsersListSearch,
  type ServiceUsersListUrlState,
} from '@/features/service-users/utils/service-users-list-url-state.util'
import {
  ServiceUsersAdvancedFiltersPanel,
  ServiceUsersFilterToggleButton,
  ServiceUsersStatusFilter,
} from '@/features/service-users/components/ServiceUsersAdvancedFiltersPanel'
import { SERVICE_USER_MANAGEMENT_NAME_TO } from '@/features/service-users/service-user-profile-tabs'


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

function formatCreatedAt(iso: string | null | undefined): string {
  return formatDateTime(iso)
}

function formatDobList(iso: string | null): string {
  if (!iso) return '—'
  const trimmed = iso.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return formatDate(trimmed)
  return formatDate(trimmed, { utc: true })
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
        <div>
          <span className="text-foreground/80">Created by:</span> {user.createdByName?.trim() || '—'}
        </div>
        <div>
          <span className="text-foreground/80">Created:</span> {formatCreatedAt(user.createdAt)}
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
  const navigate = useNavigate()
  const routeSearch = useSearch({ strict: false }) as ServiceUsersListSearch
  const canDelete = useAuthStore((s) => s.can('service_users.delete'))
  const deleteMutation = useDeleteServiceUser()

  const lookupsQuery = useServiceUserLookups()
  const lookups = lookupsQuery.data ?? null

  const urlState = React.useMemo(
    () => enrichServiceUsersListUrlState(parseServiceUsersListSearch(routeSearch), lookups),
    [routeSearch, lookups],
  )

  const {
    search: searchApi,
    kwSearch,
    statusFilter,
    listFilter,
    riskFilter,
    unassignedOnly,
    onHoldOnly,
    page,
    advanced: advancedFilters,
    zoneId,
    branchIds,
  } = urlState

  // Zone / branch filter: chosen branches, else every branch in the chosen zone.
  const locationTreeQuery = useLocationManagementTree()
  const zones = locationTreeQuery.data?.zones ?? []
  const selectedZone = zones.find((z) => z.id === zoneId)
  const branchOptions = React.useMemo<MultiSelectOption[]>(
    () =>
      (selectedZone?.branches ?? [])
        .filter((b): b is typeof b & { locationId: string } => b.locationId != null)
        .map((b) => ({ value: b.locationId, label: b.name })),
    [selectedZone],
  )
  const filterLocationIds = React.useMemo(
    () => (branchIds.length ? branchIds : branchOptions.map((o) => o.value)),
    [branchIds, branchOptions],
  )

  const [searchInput, setSearchInput] = React.useState(searchApi)
  const [kwSearchInput, setKwSearchInput] = React.useState(kwSearch)
  const [advancedOpen, setAdvancedOpen] = React.useState(false)
  const viewingDeleted = listFilter === 'deleted'
  const [flashMessageUser, setFlashMessageUser] = React.useState<ServiceUserListRow | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set())
  const [bulkWorking, setBulkWorking] = React.useState(false)

  React.useEffect(() => {
    setSearchInput(searchApi)
  }, [searchApi])

  React.useEffect(() => {
    setKwSearchInput(kwSearch)
  }, [kwSearch])

  const applyUrlState = React.useCallback(
    (next: ServiceUsersListUrlState) => {
      void navigate({
        to: '/service-users/all',
        search: buildServiceUsersListSearch(next),
        replace: true,
      })
    },
    [navigate],
  )

  const patchUrlState = React.useCallback(
    (patch: Partial<ServiceUsersListUrlState> & { advanced?: ServiceUsersAdvancedFilters }) => {
      applyUrlState({
        ...urlState,
        ...patch,
        advanced: patch.advanced ?? urlState.advanced,
        page: patch.page ?? 1,
      })
    },
    [applyUrlState, urlState],
  )

  const handleFlashClick = React.useCallback((user: ServiceUserListRow) => {
    setFlashMessageUser(user)
  }, [])

  const { locationId: globalLocationId } = useGlobalLocationScope()

  // Debounce name search into the URL
  React.useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === searchApi) return
    const t = window.setTimeout(() => {
      patchUrlState({ search: trimmed })
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput, searchApi, patchUrlState])

  // Debounce key-worker filter into the URL (client-side page filter)
  React.useEffect(() => {
    const trimmed = kwSearchInput.trim()
    if (trimmed === kwSearch) return
    const t = window.setTimeout(() => {
      patchUrlState({ kwSearch: trimmed })
    }, 350)
    return () => clearTimeout(t)
  }, [kwSearchInput, kwSearch, patchUrlState])

  const advancedFilterCount = countActiveAdvancedFilters(advancedFilters)
  const advancedFilterChips = React.useMemo(
    () => describeAdvancedFilterChips(advancedFilters),
    [advancedFilters],
  )

  // Derive list params from URL filter state + resolved lookups
  const listParams = React.useMemo(
    () =>
      buildServiceUsersListParams(lookups, {
        page,
        search: searchApi,
        listFilter,
        statusFilter,
        onHoldOnly,
        locationId: globalLocationId ?? undefined,
        locationIds: zoneId ? filterLocationIds : undefined,
        riskLevelCode: riskFilter,
        unassignedKeyWorker: unassignedOnly,
        advanced: advancedFilters,
      }),
    [
      lookups,
      listFilter,
      statusFilter,
      onHoldOnly,
      page,
      searchApi,
      globalLocationId,
      zoneId,
      filterLocationIds,
      riskFilter,
      unassignedOnly,
      advancedFilters,
    ],
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
    const q = kwSearch.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) => {
      const kw = employeeLabel(r.keyWorker).toLowerCase()
      const nn = employeeLabel(r.namedNurse).toLowerCase()
      return kw.includes(q) || nn.includes(q)
    })
  }, [rows, kwSearch])

  // Drop selection when the visible page set changes (filters / pagination / search).
  React.useEffect(() => {
    setSelectedIds(new Set())
  }, [searchApi, statusFilter, listFilter, onHoldOnly, globalLocationId, riskFilter, unassignedOnly, advancedFilters, page, kwSearch])

  const visibleIds = React.useMemo(() => filteredRows.map((r) => r.id), [filteredRows])
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id))
  const selectedRows = React.useMemo(
    () => filteredRows.filter((r) => selectedIds.has(r.id)),
    [filteredRows, selectedIds],
  )

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev)
        for (const id of visibleIds) next.delete(id)
        return next
      }
      const next = new Set(prev)
      for (const id of visibleIds) next.add(id)
      return next
    })
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExportCsv = () => {
    const exportRows = selectedRows.length > 0 ? selectedRows : filteredRows
    if (exportRows.length === 0) return
    exportServiceUsersListCsv(
      exportRows,
      selectedRows.length > 0 ? 'service-users-selected' : 'service-users-page',
    )
    toastSuccess(
      selectedRows.length > 0
        ? `Exported ${exportRows.length} selected service user${exportRows.length === 1 ? '' : 's'}`
        : `Exported ${exportRows.length} service user${exportRows.length === 1 ? '' : 's'} on this page`,
    )
  }

  const handleBulkDelete = async () => {
    if (!canDelete || viewingDeleted || selectedRows.length === 0) return
    const n = selectedRows.length
    const ok = window.confirm(
      `Soft-delete ${n} selected service user${n === 1 ? '' : 's'}? They can be found again under Deleted.`,
    )
    if (!ok) return
    setBulkWorking(true)
    let failed = 0
    try {
      for (const row of selectedRows) {
        try {
          await deleteMutation.mutateAsync(row.id)
        } catch {
          failed += 1
        }
      }
      const deleted = n - failed
      if (deleted > 0) {
        toastSuccess(
          `Deleted ${deleted} service user${deleted === 1 ? '' : 's'}${failed > 0 ? ` (${failed} failed)` : ''}`,
        )
      }
      if (failed > 0 && deleted === 0) {
        toastApiError(new Error(`Could not delete ${failed} service user${failed === 1 ? '' : 's'}`), 'Bulk delete failed')
      }
      setSelectedIds(new Set())
      triggerReload()
    } finally {
      setBulkWorking(false)
    }
  }

  const onProfilePhotoUploaded = React.useCallback(
    (_userId: string, _profilePhotoUrl: string) => {
      // Invalidate so the list reflects the new photo on next navigation
      void queryClient.invalidateQueries({ queryKey: serviceUserKeys.lists() })
    },
    [queryClient],
  )

  const clearAllFilters = () => {
    patchUrlState({
      statusFilter: DEFAULT_SERVICE_USER_STATUS_CODE,
      listFilter: null,
      onHoldOnly: false,
      advanced: { ...EMPTY_SERVICE_USERS_ADVANCED_FILTERS },
    })
  }

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

      <div className="flex flex-col gap-2.5 border-b border-border bg-background px-3 py-3 sm:px-4">
        <div
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
          data-testid="service-users-primary-filters"
        >
          <ServiceUsersFilterToggleButton
            open={advancedOpen}
            activeCount={advancedFilterCount}
            onClick={() => setAdvancedOpen((o) => !o)}
          />

          <div className="min-w-0 w-full sm:max-w-xs sm:flex-1">
            <Input
              data-testid="service-users-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, NHS no., phone…"
              title="Search runs as you type"
              leftElement={<Search className="h-4 w-4" aria-hidden />}
            />
          </div>

          <div className="min-w-0 w-full sm:max-w-xs sm:flex-1">
            <Input
              data-testid="service-users-key-worker-filter"
              value={kwSearchInput}
              onChange={(e) => setKwSearchInput(e.target.value)}
              placeholder="Filter key worker / nurse…"
              title="Filters the current result page only"
              leftElement={<Search className="h-4 w-4" aria-hidden />}
            />
          </div>

          <div className="w-full sm:w-44" data-testid="service-users-zone-filter">
            <Select
              value={zoneId || 'all'}
              onValueChange={(v) => patchUrlState({ zoneId: v === 'all' ? '' : v, branchIds: [] })}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="All zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All zones</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {zoneId ? (
            <div className="w-full sm:w-56" data-testid="service-users-branch-filter">
              <MultiSelect
                options={branchOptions}
                value={branchIds}
                onChange={(next) => patchUrlState({ branchIds: next })}
                placeholder="All branches in zone"
                searchPlaceholder="Search branches…"
              />
            </div>
          ) : null}

          <div className="w-full sm:ml-auto sm:w-auto sm:shrink-0">
            <ServiceUsersStatusFilter
              value={statusFilter}
              options={(lookups?.statuses ?? []).map((s) => ({ code: s.code, name: s.name }))}
              disabled={viewingDeleted || lookupsQuery.isLoading || !apiConfigured}
              onChange={(next) => {
                patchUrlState({
                  listFilter: null,
                  onHoldOnly: false,
                  statusFilter: next,
                })
              }}
            />
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            disabled={!apiConfigured || loading || filteredRows.length === 0}
            onClick={handleExportCsv}
            data-testid="service-users-export-csv"
            title={
              selectedRows.length > 0
                ? `Export ${selectedRows.length} selected to CSV`
                : 'Export this page to CSV'
            }
          >
            <Download className="h-4 w-4" aria-hidden />
            {selectedRows.length > 0 ? `Export (${selectedRows.length})` : 'Export CSV'}
          </Button>
        </div>

        <ServiceUserQuickSelectBar
          listFilter={listFilter}
          onListFilterChange={(id) => {
            patchUrlState({
              listFilter: id,
              statusFilter: statusFilterForQuickSelect(id),
              onHoldOnly: id === 'deleted' ? onHoldOnly : false,
            })
          }}
          riskFilter={riskFilter}
          onRiskFilterChange={(next) => patchUrlState({ riskFilter: next })}
          unassignedOnly={unassignedOnly}
          onUnassignedOnlyChange={(next) => patchUrlState({ unassignedOnly: next })}
          onHoldOnly={onHoldOnly}
          onOnHoldOnlyChange={(on) => {
            patchUrlState({
              onHoldOnly: on,
              listFilter: on ? null : listFilter,
              statusFilter: on ? 'ON_HOLD' : statusFilter,
            })
          }}
          disabled={!apiConfigured || loading}
        />
      </div>

      {advancedFilterChips.length > 0 ||
      (statusFilter !== DEFAULT_SERVICE_USER_STATUS_CODE && !viewingDeleted) ? (
        <div
          className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-3 py-2 sm:px-4"
          data-testid="service-users-active-filter-chips"
        >
          <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
          {statusFilter !== DEFAULT_SERVICE_USER_STATUS_CODE && !viewingDeleted ? (
            <button
              type="button"
              disabled={!apiConfigured || loading}
              className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-[#4db8c8]/40 bg-[#4db8c8]/10 px-2.5 text-xs font-medium text-[#1f6f7a] transition-colors hover:bg-[#4db8c8]/20 disabled:opacity-60"
              onClick={() => {
                patchUrlState({
                  listFilter: null,
                  onHoldOnly: false,
                  statusFilter: DEFAULT_SERVICE_USER_STATUS_CODE,
                })
              }}
              title="Reset status to in service (active)"
              data-testid="service-users-status-chip"
            >
              <span className="truncate">
                Status:{' '}
                {statusFilter === 'all'
                  ? 'All'
                  : statusFilterLabel(
                      statusFilter,
                      lookups?.statuses.find((s) => s.code === statusFilter)?.name ?? statusFilter,
                    )}
              </span>
              <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            </button>
          ) : null}
          {advancedFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              disabled={!apiConfigured || loading}
              className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-[#4db8c8]/40 bg-[#4db8c8]/10 px-2.5 text-xs font-medium text-[#1f6f7a] transition-colors hover:bg-[#4db8c8]/20 disabled:opacity-60"
              onClick={() =>
                patchUrlState({ advanced: clearAdvancedFilterChip(advancedFilters, chip.key) })
              }
              title={`Remove ${chip.label}`}
            >
              <span className="truncate">{chip.label}</span>
              <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            disabled={!apiConfigured || loading}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
            onClick={clearAllFilters}
          >
            Clear all
          </button>
        </div>
      ) : null}

      {selectedIds.size > 0 ? (
        <div
          className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 sm:px-4"
          data-testid="service-users-bulk-bar"
        >
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} selected
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={bulkWorking || selectedRows.length === 0}
            onClick={handleExportCsv}
            data-testid="service-users-bulk-export"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export selected
          </Button>
          {canDelete && !viewingDeleted ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={bulkWorking || deleteMutation.isPending}
              onClick={() => void handleBulkDelete()}
              data-testid="service-users-bulk-delete"
            >
              {bulkWorking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              )}
              Soft-delete
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8"
            disabled={bulkWorking}
            onClick={() => setSelectedIds(new Set())}
            data-testid="service-users-bulk-clear"
          >
            Clear selection
          </Button>
        </div>
      ) : null}

      <ServiceUsersAdvancedFiltersPanel
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        value={advancedFilters}
        lookups={lookups}
        disabled={!apiConfigured || loading}
        onApply={(next) => {
          patchUrlState({ advanced: next })
        }}
      />

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
                      <th className="w-10 px-2 py-2.5 sm:px-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border"
                          checked={allVisibleSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected
                          }}
                          onChange={toggleSelectAllVisible}
                          disabled={filteredRows.length === 0 || loading || bulkWorking}
                          aria-label="Select all service users on this page"
                          data-testid="service-users-select-all"
                        />
                      </th>
                      {[
                        { label: 'Picture', className: 'w-[4.5rem]' },
                        { label: 'Name', filter: true },
                        { label: 'DOB' },
                        { label: 'Status' },
                        { label: 'Location' },
                        { label: 'Key Worker' },
                        { label: 'Actions', className: 'text-right' },
                      ].map((col) => (
                        <th
                          key={col.label}
                          className={cn(
                            'whitespace-nowrap px-2 py-2.5 text-left text-xs font-medium text-muted-foreground sm:px-3 sm:text-sm',
                            col.className,
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
                        className={cn(
                          'border-b border-border transition-colors last:border-0 hover:bg-muted/20',
                          selectedIds.has(user.id) && 'bg-primary/5',
                        )}
                      >
                        <td className="px-2 py-3 align-middle sm:px-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border"
                            checked={selectedIds.has(user.id)}
                            onChange={() => toggleSelectOne(user.id)}
                            disabled={bulkWorking}
                            aria-label={`Select ${displayName(user)}`}
                            data-testid={`service-users-select-${user.id}`}
                          />
                        </td>
                        <td className="px-2 py-3 align-middle sm:px-3">
                          <SuAvatar row={user} onPhotoUploaded={onProfilePhotoUploaded} readOnly={viewingDeleted} />
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 align-middle sm:px-3">
                          <div className="font-medium leading-snug text-foreground">
                            {viewingDeleted ? (
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
                          </div>
                          {user.serviceUserNumber && (
                            <span className="text-xs text-muted-foreground">#{user.serviceUserNumber}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 align-middle text-sm text-muted-foreground sm:px-3">
                          {formatDobList(user.dateOfBirth)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 align-middle sm:px-3">
                          {user.status?.name && (
                            <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                              {user.status.name}
                            </span>
                          )}
                          {highRiskAlert(user) && (
                            <span className="ml-1 inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                              {user.riskLevel?.name ?? 'Risk'}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 align-middle text-sm text-muted-foreground sm:px-3">
                          {formatServiceUserBranchLabel({
                            locationId: user.location?.id,
                            locationName: user.location?.name,
                            zoneName: user.location?.zoneName,
                            branchName: user.location?.branchName,
                            branchLayers: user.location?.branchLayers,
                            displayLabel: user.location?.displayLabel,
                          }) || '—'}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 align-middle text-sm text-muted-foreground sm:px-3">
                          {employeeLabel(user.keyWorker) || '—'}
                        </td>
                        <td className="px-2 py-3 align-middle text-right sm:px-3">
                          <ServiceUserRowActionStrip
                            user={user}
                            archived={viewingDeleted}
                            onFlashClick={handleFlashClick}
                            compact
                          />
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
                    className={cn(
                      'space-y-3 px-3 py-3 first:rounded-t-lg last:rounded-b-lg hover:bg-muted/15',
                      selectedIds.has(user.id) && 'bg-primary/5',
                    )}
                  >
                    <div className="flex gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 rounded border-border"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelectOne(user.id)}
                        disabled={bulkWorking}
                        aria-label={`Select ${displayName(user)}`}
                      />
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
                        compact
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
                onClick={() => patchUrlState({ page: Math.max(1, page - 1) })}
                className="inline-flex min-h-10 min-w-[5.5rem] items-center justify-center gap-1 rounded-md border border-border bg-background px-3 py-2 hover:bg-muted disabled:opacity-50 sm:min-h-0 sm:min-w-0 sm:py-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                disabled={!meta.hasNextPage || loading}
                onClick={() => patchUrlState({ page: page + 1 })}
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
