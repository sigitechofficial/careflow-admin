import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Briefcase,
  CalendarClock,
  Check,
  ChevronRight,
  ExternalLink,
  Link2,
  MapPin,
  Pencil,
  Plus,
  Search,
  SearchX,
  Users,
} from 'lucide-react'
import { toastError, toastSuccess } from '@/shared/lib/toast'
import { useVacancies } from '@/features/hr/recruitment/hooks/useRecruitment'
import { VacancyStatusBadge } from '@/features/hr/recruitment/components/RecruitmentStatusBadges'
import {
  daysUntilClosing,
  employmentTypeLabel,
  formatClosingDate,
  formatPay,
} from '@/features/hr/recruitment/utils/recruitment-display.util'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { UserAvatar } from '@/shared/ui/avatar'
import type { VacancyRow, VacancyStatus } from '@/features/hr/recruitment/api/recruitment.api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'

/** Public application page for a vacancy (careers page, no login). */
export function vacancyApplyUrl(vacancyId: string): string {
  return `${window.location.origin}/careers/${vacancyId}`
}

/** Copy / open the public apply link. Only an open vacancy takes applications. */
function ApplyLinkActions({ vacancyId, open }: { vacancyId: string; open: boolean }) {
  const [copied, setCopied] = React.useState(false)
  if (!open) return <span className="text-xs text-muted-foreground">Not taking applications</span>

  async function copy() {
    try {
      await navigator.clipboard.writeText(vacancyApplyUrl(vacancyId))
      setCopied(true)
      toastSuccess('Apply link copied', 'Paste it into WhatsApp, email, social media or a job site.')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toastError('Could not copy the link', vacancyApplyUrl(vacancyId))
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => void copy()}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy link'}
      </Button>
      <a
        href={vacancyApplyUrl(vacancyId)}
        target="_blank"
        rel="noreferrer"
        aria-label="Open the public job page"
        title="Open the public job page"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>
    </div>
  )
}

/** "Closes 30 Nov 2026", "Closes in 3 days" (amber), or "Closed 1 Nov 2026" (red). */
function ClosingDate({ ymd }: { ymd: string }) {
  const days = daysUntilClosing(ymd)
  const text =
    days < 0
      ? `Closed ${formatClosingDate(ymd)}`
      : days === 0
        ? 'Closes today'
        : days <= 7
          ? `Closes in ${days} day${days === 1 ? '' : 's'}`
          : `Closes ${formatClosingDate(ymd)}`
  return (
    <p
      className={cn(
        'mt-1 flex items-center gap-1 text-xs',
        days < 0
          ? 'text-red-700 dark:text-red-300'
          : days <= 7
            ? 'font-medium text-amber-700 dark:text-amber-300'
            : 'text-muted-foreground',
      )}
    >
      <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {text}
    </p>
  )
}

const TH = 'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'

export function VacancyListTable({
  onCreateClick,
  onEdit,
  status: controlledStatus,
  onStatusChange,
}: {
  /** Shown in the empty state when there are no vacancies at all. */
  onCreateClick?: () => void
  /** Shown as a pencil on each row when the user may edit vacancies. */
  onEdit?: (vacancy: VacancyRow) => void
  /** Optional: let the page control the status filter (e.g. from its count cards). */
  status?: VacancyStatus | 'ALL'
  onStatusChange?: (status: VacancyStatus | 'ALL') => void
}) {
  const [search, setSearch] = React.useState('')
  const [ownStatus, setOwnStatus] = React.useState<VacancyStatus | 'ALL'>('ALL')
  const status = controlledStatus ?? ownStatus
  const [page, setPage] = React.useState(1)
  React.useEffect(() => setPage(1), [status])

  function changeStatus(next: VacancyStatus | 'ALL') {
    setOwnStatus(next)
    onStatusChange?.(next)
  }

  const query = useVacancies({
    page,
    limit: 20,
    search: search.trim() || undefined,
    status: status === 'ALL' ? undefined : status,
  })
  const rows = query.data?.data ?? []
  const meta = query.data?.meta
  const filtered = !!search.trim() || status !== 'ALL'
  const columns = onEdit ? 7 : 6

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search title or location"
            aria-label="Search vacancies"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={v => changeStatus(v as VacancyStatus | 'ALL')}>
          <SelectTrigger className="sm:w-[170px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        {meta ? (
          <p className="text-sm text-muted-foreground sm:ml-auto">
            <span className="font-semibold tabular-nums text-foreground">{meta.total}</span> vacanc
            {meta.total === 1 ? 'y' : 'ies'}
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              <th className={TH}>Vacancy</th>
              <th className={TH}>Location &amp; type</th>
              <th className={TH}>Hiring manager</th>
              <th className={TH}>Candidates</th>
              <th className={TH}>Status</th>
              <th className={TH}>Apply link</th>
              {onEdit ? <th className="w-12 px-2 py-2.5" aria-label="Edit" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {query.isLoading ? (
              [0, 1, 2].map(i => (
                <tr key={i}>
                  <td colSpan={columns} className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted" />
                      <span className="flex-1 space-y-2">
                        <span className="block h-3 w-1/3 animate-pulse rounded bg-muted" />
                        <span className="block h-3 w-1/5 animate-pulse rounded bg-muted" />
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      {filtered ? <SearchX className="h-5 w-5" aria-hidden /> : <Briefcase className="h-5 w-5" aria-hidden />}
                    </span>
                    <p className="text-sm font-medium">{filtered ? 'No vacancies match' : 'No vacancies yet'}</p>
                    <p className="max-w-sm text-xs text-muted-foreground">
                      {filtered
                        ? 'Try a different search or status.'
                        : 'Create a vacancy, then share its link so people can apply online.'}
                    </p>
                    {!filtered && onCreateClick ? (
                      <Button type="button" size="sm" className="mt-1" onClick={onCreateClick}>
                        <Plus className="h-4 w-4" /> New vacancy
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map(row => {
                const pay = formatPay(row.salaryRange, row.salaryPeriod)
                const takingApplications =
                  row.status === 'OPEN' && !(row.closingDate && daysUntilClosing(row.closingDate) < 0)
                return (
                  <tr key={row.id} className="align-top transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
                          <Briefcase className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          {onEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              className="text-left font-semibold leading-tight hover:text-primary hover:underline"
                              title="Edit vacancy"
                            >
                              {row.title}
                            </button>
                          ) : (
                            <p className="font-semibold leading-tight">{row.title}</p>
                          )}
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            <span className="font-mono">{row.vacancyReference}</span>
                            {pay ? <> · <span className="font-medium text-foreground/80">{pay}</span></> : null}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="flex items-center gap-1.5 whitespace-nowrap">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        {row.location ?? '—'}
                      </p>
                      <p className="mt-0.5 pl-5 text-xs text-muted-foreground">{employmentTypeLabel(row.employmentType)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {row.hiringManagerName ? (
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <UserAvatar name={row.hiringManagerName} size="xs" />
                          {row.hiringManagerName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {row.candidateCount > 0 ? (
                        <Link
                          to="/hr/candidates"
                          search={{ vacancyId: row.id }}
                          title="See who applied for this vacancy"
                          className={cn(
                            'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-primary/30 bg-primary/5 px-2.5 text-xs font-medium text-primary transition-colors',
                            'hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          )}
                        >
                          <Users className="h-3.5 w-3.5" aria-hidden />
                          View {row.candidateCount} candidate{row.candidateCount === 1 ? '' : 's'}
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      ) : (
                        <span className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" aria-hidden /> No candidates yet
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <VacancyStatusBadge status={row.status} />
                      {row.closingDate ? <ClosingDate ymd={row.closingDate} /> : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <ApplyLinkActions vacancyId={row.id} open={takingApplications} />
                    </td>
                    {onEdit ? (
                      <td className="px-2 py-3.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          aria-label={`Edit ${row.vacancyReference}`}
                          title="Edit vacancy"
                          onClick={() => onEdit(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!meta.hasNextPage}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  )
}
