import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Search,
  SlidersHorizontal,
  Eye,
  Heart,
  User,
  Calendar,
  Paperclip,
  Plus,
  Users,
  Trash2,
  UserCheck,
  UserX,
  Circle,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Activity,
  ClipboardCheck,
  UsersRound,
  History,
  Pill,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { getApiBaseUrl } from '@/lib/api-base'
import { ApiError } from '@/lib/api-client'
import { resolveMediaUrl } from '@/lib/media-url'
import {
  fetchServiceUserLookups,
  listServiceUsers,
  uploadServiceUserPhoto,
  type ServiceUserListRow,
  type ServiceUserListMeta,
  type ServiceUserLookupsBundle,
} from '@/lib/service-users-api'

const EMPTY_LOOKUPS: ServiceUserLookupsBundle = {
  statuses: [],
  titles: [],
  genders: [],
  maritalStatuses: [],
  careTypes: [],
  fundingTypes: [],
  riskLevels: [],
  relationshipTypes: [],
  allergies: [],
  absenceReasons: [],
}

const TEAL = '#4db8c8'

const RISK_BORDER: Record<string, string> = {
  LOW: '#2a9d8f',
  MEDIUM: '#e9a825',
  HIGH: '#e11d48',
  CRITICAL: '#7f1d1d',
}

function profileLinkClassName(): string {
  return cn(
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border p-0 leading-none transition-colors',
    'text-[#4db8c8] border-[#4db8c8] hover:bg-[#4db8c8]/10',
    '[&_svg]:block [&_svg]:shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5',
  )
}

/** Placeholder quick actions (same visual language as other row icons). */
const ROW_QUICK_ICONS: ReadonlyArray<{ title: string; Icon: LucideIcon }> = [
  { title: 'Care plan', Icon: ClipboardList },
  { title: 'Documents', Icon: FileText },
  { title: 'Observations & activity', Icon: Activity },
  { title: 'Assessments', Icon: ClipboardCheck },
  { title: 'Contacts & family', Icon: UsersRound },
  { title: 'History & timeline', Icon: History },
]

function TealCircleBtn({
  children,
  title,
  active = false,
  activeClass = '',
}: {
  children: React.ReactNode
  title?: string
  active?: boolean
  activeClass?: string
}) {
  return (
    <button
      type="button"
      title={title}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border p-0 leading-none transition-colors',
        '[&_svg]:block [&_svg]:shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5',
        active
          ? cn('text-white border-transparent', activeClass)
          : 'text-[#4db8c8] border-[#4db8c8] hover:bg-[#4db8c8]/10',
      )}
    >
      {children}
    </button>
  )
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

function SuUserDetailsBlock({ user }: { user: ServiceUserListRow }) {
  const kw = employeeLabel(user.keyWorker)
  const nn = employeeLabel(user.namedNurse)
  const loc = user.location?.name?.trim()
  const risk = highRiskAlert(user)

  return (
    <div className="min-w-0 space-y-1 pr-2">
      <div className="font-medium leading-snug text-foreground">
        <Link
          to="/service-users/$serviceUserId"
          params={{ serviceUserId: user.id }}
          className="hover:underline"
        >
          {displayName(user)}
        </Link>
        {user.serviceUserNumber && (
          <span className="text-muted-foreground font-normal"> · #{user.serviceUserNumber}</span>
        )}
        {user.status?.name && (
          <span className="text-muted-foreground font-normal"> · {user.status.name}</span>
        )}
        {risk && (
          <span className="text-destructive font-normal"> · {user.riskLevel?.name ?? 'Risk'}</span>
        )}
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

function SuActionStrip({ user, className }: { user: ServiceUserListRow; className?: string }) {
  const suspended = !user.isActive
  return (
    <div className={cn('flex flex-nowrap items-center justify-end gap-1', className)}>
      <Link
        to="/service-users/$serviceUserId/view"
        params={{ serviceUserId: user.id }}
        title="View"
        className={profileLinkClassName()}
      >
        <Eye />
      </Link>
      <TealCircleBtn title="Health">
        <Heart />
      </TealCircleBtn>
      <Link
        to="/service-users/$serviceUserId"
        params={{ serviceUserId: user.id }}
        title="Profile"
        className={profileLinkClassName()}
      >
        <User />
      </Link>
      <Link
        to="/service-users/$serviceUserId/medication"
        params={{ serviceUserId: user.id }}
        title="Medication"
        className={profileLinkClassName()}
      >
        <Pill />
      </Link>
      <TealCircleBtn title="Appointments">
        <Calendar />
      </TealCircleBtn>
      <TealCircleBtn title="Documents">
        <Paperclip />
      </TealCircleBtn>
      <TealCircleBtn title="Risk / incident" active={highRiskAlert(user)} activeClass="bg-red-500">
        <Plus />
      </TealCircleBtn>
      <TealCircleBtn title="Team">
        <Users />
      </TealCircleBtn>
      <TealCircleBtn title={suspended ? 'Inactive' : 'Active'} active={suspended} activeClass="bg-red-500">
        <Trash2 />
      </TealCircleBtn>
      <div className="mx-0.5 hidden h-7 w-px shrink-0 bg-border/80 sm:block" aria-hidden />
      {ROW_QUICK_ICONS.map(({ title, Icon }) => (
        <TealCircleBtn key={title} title={`${title} (coming soon)`}>
          <Icon />
        </TealCircleBtn>
      ))}
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
}: {
  row: ServiceUserListRow
  onPhotoUploaded: (userId: string, profilePhotoUrl: string) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const src = resolveMediaUrl(row.profilePhotoUrl)
  const border = avatarBorder(row)

  const openPicker = () => {
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
    setUploading(true)
    setUploadError(null)
    try {
      const { profilePhotoUrl } = await uploadServiceUserPhoto(row.id, file)
      onPhotoUploaded(row.id, profilePhotoUrl)
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
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
        disabled={uploading}
        title="Upload profile photo (JPEG, PNG, WebP)"
        className={cn(
          'h-16 w-16 rounded-full flex flex-col items-center justify-center border-2 overflow-hidden p-0',
          'bg-muted transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          uploading ? 'cursor-wait opacity-70' : 'cursor-pointer',
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

type StatusFilter = 'in_service' | 'all' | 'discharged' | 'inactive' | 'on_hold' | 'deceased'

function statusIdForFilter(lookups: ServiceUserLookupsBundle | null, filter: StatusFilter): string | undefined {
  if (!lookups || filter === 'all') return undefined
  const codeMap: Record<Exclude<StatusFilter, 'all'>, string> = {
    in_service: 'ACTIVE',
    discharged: 'DISCHARGED',
    inactive: 'INACTIVE',
    on_hold: 'ON_HOLD',
    deceased: 'DECEASED',
  }
  const code = codeMap[filter as Exclude<StatusFilter, 'all'>]
  const row = lookups.statuses.find((s) => s.code === code)
  return row?.id
}

export default function ServiceUsersPage() {
  const apiConfigured = Boolean(getApiBaseUrl())
  const [lookups, setLookups] = React.useState<ServiceUserLookupsBundle | null>(null)
  const [rows, setRows] = React.useState<ServiceUserListRow[]>([])
  const [meta, setMeta] = React.useState<ServiceUserListMeta>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [searchInput, setSearchInput] = React.useState('')
  const [searchApi, setSearchApi] = React.useState('')
  const [kwSearch, setKwSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('in_service')
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const t = window.setTimeout(() => setSearchApi(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  React.useEffect(() => {
    setPage(1)
  }, [searchApi, statusFilter])

  React.useEffect(() => {
    if (!apiConfigured) {
      setLoading(false)
      setRows([])
      setLoadError(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        let lu = lookups
        if (!lu) {
          try {
            lu = await fetchServiceUserLookups()
            if (!cancelled) setLookups(lu)
          } catch {
            lu = EMPTY_LOOKUPS
            if (!cancelled) setLookups(EMPTY_LOOKUPS)
          }
        }
        const list = await listServiceUsers({
          page,
          limit: 25,
          search: searchApi || undefined,
          statusId: statusIdForFilter(lu, statusFilter),
          showInactive: statusFilter !== 'in_service' ? true : undefined,
          sortBy: 'lastName',
          sortOrder: 'asc',
        })
        if (cancelled) return
        setRows(list.rows)
        setMeta(list.meta)
      } catch (e) {
        if (!cancelled) {
          setRows([])
          setLoadError(e instanceof ApiError ? e.message : 'Failed to load service users')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiConfigured, page, searchApi, statusFilter, lookups])

  const filteredRows = React.useMemo(() => {
    const q = kwSearch.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const kw = employeeLabel(r.keyWorker).toLowerCase()
      const nn = employeeLabel(r.namedNurse).toLowerCase()
      return kw.includes(q) || nn.includes(q)
    })
  }, [rows, kwSearch])

  const onProfilePhotoUploaded = React.useCallback((userId: string, profilePhotoUrl: string) => {
    setRows((prev) => prev.map((r) => (r.id === userId ? { ...r, profilePhotoUrl } : r)))
  }, [])

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col">
      <div className="p-3 sm:p-4">
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="space-y-1.5 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Service User Management
            </div>
            <p className="text-sm text-muted-foreground">
              Search, filter, and manage service users (live data from CareAdmin API).
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
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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

        <div className="-mx-1 flex min-w-0 items-center gap-1.5 overflow-x-auto px-1 pb-0.5 touch-pan-x md:mx-0 md:max-w-none md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          <span className="shrink-0 text-sm font-medium text-muted-foreground">Select</span>
          {[
            { icon: <User />, title: 'All users' },
            { icon: <UserCheck />, title: 'Active users' },
            { icon: <Users />, title: 'Group' },
            { icon: <Heart />, title: 'Health' },
            { icon: <Circle />, title: 'Unassigned' },
            { icon: <Users />, title: 'Team' },
            { icon: <UserX />, title: 'Discharged' },
            { icon: <Trash2 />, title: 'Deleted' },
          ].map((item, i) => (
            <TealCircleBtn key={i} title={item.title}>
              {item.icon}
            </TealCircleBtn>
          ))}
        </div>

        <div className="flex w-full min-w-0 items-center gap-2 md:ml-auto md:w-auto md:shrink-0">
          <span className="shrink-0 text-sm font-medium text-muted-foreground">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring md:flex-initial"
          >
            <option value="in_service">In service (active)</option>
            <option value="all">All</option>
            <option value="discharged">Discharged</option>
            <option value="inactive">Inactive</option>
            <option value="on_hold">On hold</option>
            <option value="deceased">Deceased</option>
          </select>
        </div>
      </div>

      <div className="min-w-0 p-3 sm:p-4">
        <div className="relative rounded-lg border border-border bg-card">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!apiConfigured ? (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground sm:px-4">
              API is not configured.
            </div>
          ) : filteredRows.length === 0 && !loading ? (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground sm:px-4">
              {rows.length === 0 ? 'No service users match your filters.' : 'No rows match key worker filter on this page.'}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-sm">
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
                        className="border-b border-border transition-colors last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-2 py-3 align-middle sm:px-3">
                          <SuAvatar row={user} onPhotoUploaded={onProfilePhotoUploaded} />
                        </td>
                        <td className="min-w-0 px-2 py-3 align-middle sm:px-3">
                          <SuUserDetailsBlock user={user} />
                        </td>
                        <td className="px-2 py-3 align-middle text-right sm:px-3">
                          <div className="inline-block max-w-[min(100vw,28rem)] min-w-0 overflow-x-auto touch-pan-x md:max-w-none">
                            <SuActionStrip user={user} />
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
                      <SuAvatar row={user} onPhotoUploaded={onProfilePhotoUploaded} />
                      <div className="min-w-0 flex-1">
                        <SuUserDetailsBlock user={user} />
                      </div>
                    </div>
                    <div className="-mx-1 overflow-x-auto px-1 pb-0.5 touch-pan-x">
                      <SuActionStrip user={user} className="min-w-min justify-start" />
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
    </div>
  )
}
