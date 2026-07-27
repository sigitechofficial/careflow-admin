import * as React from 'react'
import { Download, Info, Loader2, Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useExportLearningCompliance,
  useLearningComplianceMatrix,
} from '@/features/learning/hooks/useLearning'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { useAuthStore } from '@/features/auth/store'
import { ApiError } from '@/shared/api/api-client'

function ColumnInfo({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`About ${label}`}
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-left text-xs leading-snug">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </span>
  )
}

export function ComplianceMatrixPanel() {
  const canExport = useAuthStore(s => s.can('learning.compliance.export'))
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const exportMut = useExportLearningCompliance()

  const query = useLearningComplianceMatrix({
    page,
    limit: 20,
    search: search || undefined,
  })
  const rows = query.data?.rows ?? []
  const meta = query.data?.meta

  const onExport = async () => {
    try {
      const result = await exportMut.mutateAsync({
        search: search || undefined,
      })
      const blob = new Blob([result.csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename ?? 'learning-compliance.csv'
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess('Compliance export downloaded')
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Export failed'))
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4" data-testid="learning-compliance-matrix-panel">
        <ContentSectionHeader
          title="Compliance matrix"
          description="Employee × course compliance snapshots with status badges."
          action={
            canExport ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void onExport()}
                disabled={exportMut.isPending}
              >
                <Download className="mr-1 h-4 w-4" /> Export CSV
              </Button>
            ) : undefined
          }
        />

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search employee or course…"
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        {query.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No compliance records found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">
                    <ColumnInfo
                      label="Status"
                      tooltip="Current compliance state for this employee and course — for example Assigned, In progress, Overdue, Compliant, Expiring soon, or Expired."
                    />
                  </th>
                  <th className="px-3 py-2">
                    <ColumnInfo
                      label="Due"
                      tooltip="Deadline to complete the assigned training. If this date passes before the course is finished, the status becomes Overdue."
                    />
                  </th>
                  <th className="px-3 py-2">
                    <ColumnInfo
                      label="Expires"
                      tooltip="When completed training or its certificate stops being valid. After this date the status becomes Expired; near this date it may show Expiring soon."
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{row.employeeName || '—'}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{row.courseTitle || '—'}</div>
                      {row.courseCode ? (
                        <div className="text-[11px] text-muted-foreground">{row.courseCode}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <LearningStatusBadge status={row.complianceStatus} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.dueAt ? new Date(row.dueAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!meta.hasNextPage}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  )
}
