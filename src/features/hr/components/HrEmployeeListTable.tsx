import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useHrEmployees } from '@/features/hr/hooks/useHr'
import { HrDeploymentBadge, HrLifecycleBadge } from '@/features/hr/components/HrStatusBadges'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

export function HrEmployeeListTable() {
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const query = useHrEmployees({ page, limit: 20, search: search.trim() || undefined })
  const rows = query.data?.data ?? []
  const meta = query.data?.meta

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search by name, employee number, or job title"
            className="pl-9"
          />
        </div>
        {meta ? (
          <p className="text-sm text-muted-foreground">
            {meta.total} employee{meta.total === 1 ? '' : 's'}
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Employee ID</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Job Title</th>
              <th className="px-4 py-3 font-medium">Employment Type</th>
              <th className="px-4 py-3 font-medium">Lifecycle Status</th>
              <th className="px-4 py-3 font-medium">Deployment Status</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading employees…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No employees found.
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.employeeId} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.employeeNumber ?? row.employeeId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to="/hr/employees/$employeeId"
                      params={{ employeeId: row.employeeId }}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.jobTitle ?? '—'}</td>
                  <td className="px-4 py-3">{row.employmentType ?? '—'}</td>
                  <td className="px-4 py-3">
                    <HrLifecycleBadge status={row.employeeLifecycleStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <HrDeploymentBadge status={row.deploymentStatus} />
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
            disabled={page >= meta.totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      {query.error ? (
        <p className={cn('text-sm text-destructive')}>Could not load HR employee list.</p>
      ) : null}
    </div>
  )
}
