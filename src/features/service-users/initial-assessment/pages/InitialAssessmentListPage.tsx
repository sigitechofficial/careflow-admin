import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Archive,
  ArrowDownWideNarrow,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock,
  Loader2,
  PlayCircle,
  Plus,
  Search,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import {
  fetchInitialAssessmentList,
  type InitialAssessmentListBucket,
  type InitialAssessmentListRow,
  type InitialAssessmentListSort,
  type InitialAssessmentListView,
} from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import { formatInitialAssessmentDate } from '@/features/service-users/initial-assessment/utils/submission-display'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { UserAvatar } from '@/shared/ui/avatar'
import { cn } from '@/shared/lib/utils'

const PAGE_SIZE = 25

type Tone = 'amber' | 'violet' | 'emerald' | 'slate' | 'red'

/** Tinted icon box, card border when selected, and status pill colours per tone (light + dark). */
const TONE: Record<Tone, { icon: string; active: string; pill: string }> = {
  amber: {
    icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    active: 'border-amber-500/70 bg-amber-500/5',
    pill: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  violet: {
    icon: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    active: 'border-violet-500/70 bg-violet-500/5',
    pill: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  emerald: {
    icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    active: 'border-emerald-500/70 bg-emerald-500/5',
    pill: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  slate: {
    icon: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
    active: 'border-slate-500/70 bg-slate-500/5',
    pill: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-200',
  },
  red: {
    icon: 'bg-red-500/15 text-red-600 dark:text-red-400',
    active: 'border-red-500/70 bg-red-500/5',
    pill: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
  },
}

type CardKey = 'in_progress' | 'waiting_review' | 'reviewed' | 'no_ia' | 'overdue_actions'

const CARDS: { key: CardKey; label: string; icon: LucideIcon; tone: Tone }[] = [
  { key: 'in_progress', label: 'In progress', icon: ClipboardList, tone: 'amber' },
  { key: 'waiting_review', label: 'Waiting for review', icon: Clock, tone: 'violet' },
  { key: 'reviewed', label: 'Reviewed', icon: Check, tone: 'emerald' },
  { key: 'no_ia', label: 'Not started (no IA yet)', icon: PlayCircle, tone: 'slate' },
  { key: 'overdue_actions', label: 'Overdue actions', icon: AlertTriangle, tone: 'red' },
]

/** Row status pill: the list's own wording (same as the cards). */
const BUCKET_PILL: Record<InitialAssessmentListBucket, { label: string; icon: LucideIcon; tone: Tone }> = {
  in_progress: { label: 'In progress', icon: Circle, tone: 'amber' },
  waiting_review: { label: 'Waiting for review', icon: Clock, tone: 'violet' },
  reviewed: { label: 'Reviewed', icon: Check, tone: 'emerald' },
  no_ia: { label: 'Not started', icon: PlayCircle, tone: 'slate' },
  archived: { label: 'Archived', icon: Archive, tone: 'slate' },
  cancelled: { label: 'Cancelled', icon: XCircle, tone: 'red' },
}

/** Statuses not covered by a card. The cards filter In progress, Waiting for review, Reviewed, Not started and Overdue. */
const VIEW_OPTIONS: { value: InitialAssessmentListView; label: string }[] = [
  { value: 'all', label: 'Active assessments' },
  { value: 'archived', label: 'Archived' },
  { value: 'cancelled', label: 'Cancelled' },
]

const SORT_OPTIONS: { value: InitialAssessmentListSort; label: string }[] = [
  { value: 'updated', label: 'Sort: Last updated' },
  { value: 'started', label: 'Sort: Started (newest)' },
  { value: 'name', label: 'Sort: Name (A–Z)' },
]

const SELECT_CLASS =
  'flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-10 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Native select with our own arrow, kept clear of the border. */
function SelectField({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative', className)}>
      <select {...props} className={SELECT_CLASS} />
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}

function serviceUserName(row: InitialAssessmentListRow): string {
  const su = row.serviceUser
  const base = `${su.firstName} ${su.lastName}`.trim()
  return su.preferredName && su.preferredName !== su.firstName ? `${base} (${su.preferredName})` : base
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return debounced
}

function StatusPill({ bucket }: { bucket: InitialAssessmentListBucket }) {
  const pill = BUCKET_PILL[bucket]
  const Icon = pill.icon
  return (
    <span
      data-testid="ia-list-status-badge"
      data-bucket={bucket}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-semibold',
        TONE[pill.tone].pill,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {pill.label}
    </span>
  )
}

/** Compact, equal-width row buttons: label and arrow sit together in the middle. */
const ROW_BUTTON = 'h-8 w-[5.75rem] justify-center gap-1 px-3 text-xs'

function RowAction({ row }: { row: InitialAssessmentListRow }) {
  const serviceUserId = row.serviceUser.id
  const arrow = <ChevronRight className="-mr-0.5 h-3.5 w-3.5" aria-hidden />
  if (!row.assessment) {
    return (
      <Button type="button" size="sm" className={cn(ROW_BUTTON, 'font-semibold')} asChild>
        <Link to="/service-users/initial-assessment" search={{ serviceUserId }} data-testid="ia-list-start">
          Start
          {arrow}
        </Link>
      </Button>
    )
  }
  const outline = cn(ROW_BUTTON, 'border-primary/50 font-medium text-foreground')
  if (row.bucket === 'waiting_review') {
    return (
      <Button type="button" variant="outline" size="sm" className={outline} asChild>
        <Link
          to="/service-users/initial-assessment"
          search={{ serviceUserId, tab: 'review' }}
          data-testid="ia-list-review"
        >
          Review
          {arrow}
        </Link>
      </Button>
    )
  }
  return (
    <Button type="button" variant="outline" size="sm" className={outline} asChild>
      <Link to="/service-users/initial-assessment" search={{ serviceUserId }} data-testid="ia-list-open">
        {row.bucket === 'in_progress' ? 'Continue' : 'Open'}
        {arrow}
      </Link>
    </Button>
  )
}

/** Organisation-wide list of service users and their latest Initial Assessment. */
export default function InitialAssessmentListPage() {
  const { locationId } = useGlobalLocationScope()
  const [view, setView] = React.useState<InitialAssessmentListView>('all')
  const [sort, setSort] = React.useState<InitialAssessmentListSort>('updated')
  const [searchInput, setSearchInput] = React.useState('')
  const [startedByRole, setStartedByRole] = React.useState('')
  const [page, setPage] = React.useState(1)
  const search = useDebounced(searchInput.trim(), 300)

  React.useEffect(() => {
    setPage(1)
  }, [view, sort, search, startedByRole, locationId])

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: initialAssessmentKeys.list({
      view,
      sort,
      search,
      locationId: locationId ?? '',
      startedByRole,
      page,
    }),
    queryFn: () =>
      fetchInitialAssessmentList({
        view,
        sort,
        search,
        locationId: locationId ?? undefined,
        startedByRole: startedByRole || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const rows = data?.rows ?? []
  const meta = data?.meta

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6" data-testid="ia-list-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ClipboardList className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Initial assessments</h1>
            <p className="text-sm text-muted-foreground">
              Every service user in your branches and their latest initial assessment
              {locationId ? ' · filtered to the selected header location' : null}
            </p>
          </div>
        </div>
        <Button type="button" size="lg" asChild>
          <Link to="/service-users/initial-assessment" data-testid="ia-list-start-any">
            <Plus className="mr-1.5 h-5 w-5" aria-hidden />
            Start assessment
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {CARDS.map((card) => {
          const active = view === card.key
          const value = data?.counts[card.key]
          const Icon = card.icon
          return (
            <button
              key={card.key}
              type="button"
              data-testid={`ia-list-card-${card.key}`}
              aria-pressed={active}
              onClick={() => setView(active ? 'all' : card.key)}
              className={cn(
                'flex items-center gap-4 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-foreground/30',
                active ? TONE[card.tone].active : 'border-border',
              )}
            >
              <span
                className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg', TONE[card.tone].icon)}
              >
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-3xl font-semibold leading-none">{value ?? '–'}</span>
                <span className="mt-1.5 block text-sm text-muted-foreground">{card.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name or service user number"
            className="h-10 rounded-lg pl-9"
            aria-label="Search service users"
            data-testid="ia-list-search"
          />
        </div>
        <SelectField
          className="min-w-[13rem]"
          value={view === 'archived' || view === 'cancelled' ? view : 'all'}
          onChange={(e) => setView(e.target.value as InitialAssessmentListView)}
          aria-label="Filter by status"
          data-testid="ia-list-status"
        >
          {VIEW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          className="min-w-[12rem]"
          value={startedByRole}
          onChange={(e) => setStartedByRole(e.target.value)}
          aria-label="Filter by the role of who started the assessment"
          data-testid="ia-list-started-by"
        >
          <option value="">Started by: Any role</option>
          {(data?.startedByRoles ?? []).map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </SelectField>
        {isFetching && !isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        <div className="ml-auto flex items-center gap-2">
          <ArrowDownWideNarrow className="h-4 w-4 text-muted-foreground" aria-hidden />
          <SelectField
            className="min-w-[13rem]"
            value={sort}
            onChange={(e) => setSort(e.target.value as InitialAssessmentListSort)}
            aria-label="Sort"
            data-testid="ia-list-sort"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive" role="alert">
            {error instanceof Error ? error.message : 'Could not load initial assessments.'}
          </p>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No service users match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="ia-list-table">
              <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Service user</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="whitespace-nowrap px-4 py-3">Last updated</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const name = serviceUserName(row)
                  return (
                    <tr
                      key={row.serviceUser.id}
                      className="border-t border-border/70 first:border-t-0 hover:bg-muted/30"
                      data-testid="ia-list-row"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={`${row.serviceUser.firstName} ${row.serviceUser.lastName}`} size="sm" />
                          <div className="min-w-0">
                            <Link
                              to="/service-users/$serviceUserId/view"
                              params={{ serviceUserId: row.serviceUser.id }}
                              className="font-semibold hover:underline"
                            >
                              {name}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {row.serviceUser.serviceUserNumber ?? null}
                              {!row.serviceUser.isActive ? ' · Inactive' : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.branch?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <StatusPill bucket={row.bucket} />
                          {row.overdueActionCount > 0 ? (
                            <div className="text-xs font-medium text-destructive">
                              {row.overdueActionCount} overdue action{row.overdueActionCount === 1 ? '' : 's'}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {row.assessment ? (
                          <>
                            <div className="text-foreground/90">{formatInitialAssessmentDate(row.assessment.startedAt)}</div>
                            {row.assessment.startedBy ? (
                              <div className="text-xs">by {row.assessment.startedBy.name}</div>
                            ) : null}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {row.assessment?.submittedAt ? formatInitialAssessmentDate(row.assessment.submittedAt) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {row.assessment ? formatInitialAssessmentDate(row.assessment.updatedAt) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RowAction row={row} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.total > 0 ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>
              Showing {rows.length === meta.total ? meta.total : `${(meta.page - 1) * meta.limit + 1}–${(meta.page - 1) * meta.limit + rows.length} of ${meta.total}`}{' '}
              service user{meta.total === 1 ? '' : 's'}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span
                className="flex h-8 min-w-8 items-center justify-center rounded-md bg-primary px-2 text-sm font-semibold text-primary-foreground"
                aria-current="page"
              >
                {meta.page}
              </span>
              {meta.totalPages > 1 ? <span className="px-1 text-xs">of {meta.totalPages}</span> : null}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Next page"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
