import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useVacancies } from '@/features/hr/recruitment/hooks/useRecruitment'
import { VacancyStatusBadge } from '@/features/hr/recruitment/components/RecruitmentStatusBadges'
import { employmentTypeLabel } from '@/features/hr/recruitment/utils/recruitment-display.util'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import type { VacancyStatus } from '@/features/hr/recruitment/api/recruitment.api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

export function VacancyListTable({
  onCreateClick,
}: {
  onCreateClick?: () => void
}) {
  const [search, setSearch] = React.useState('')
  const [status, setStatus] = React.useState<VacancyStatus | 'ALL'>('ALL')
  const [page, setPage] = React.useState(1)
  const query = useVacancies({
    page,
    limit: 20,
    search: search.trim() || undefined,
    status: status === 'ALL' ? undefined : status,
  })
  const rows = query.data?.data ?? []
  const meta = query.data?.meta

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search vacancies"
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={v => {
              setStatus(v as VacancyStatus | 'ALL')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {meta ? (
            <p className="text-sm text-muted-foreground">
              {meta.total} vacancy{meta.total === 1 ? '' : 'ies'}
            </p>
          ) : null}
          {onCreateClick ? (
            <Button size="sm" onClick={onCreateClick}>New vacancy</Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Hiring manager</th>
              <th className="px-4 py-3 font-medium">Candidates</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Loading vacancies…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No vacancies found.
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{row.vacancyReference}</td>
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3">{row.location ?? '—'}</td>
                  <td className="px-4 py-3">{employmentTypeLabel(row.employmentType)}</td>
                  <td className="px-4 py-3">{row.hiringManagerName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Link
                      to="/hr/candidates"
                      search={{ vacancyId: row.id }}
                      className="text-primary hover:underline"
                    >
                      {row.candidateCount}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <VacancyStatusBadge status={row.status} />
                  </td>
                </tr>
              ))
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
